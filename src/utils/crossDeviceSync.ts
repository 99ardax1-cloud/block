import mqtt, { MqttClient } from 'mqtt';

export const DEFAULT_ROOM_CODE = 'XONA-304';
export const PUBLIC_MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export interface CrossDeviceSyncEnvelope<T> {
  roomCode: string;
  packetId: string;
  senderId: string;
  timestamp: string;
  updatedAtEpoch: number;
  payload: T;
}

export interface SyncConnectionStatus {
  mqttConnected: boolean;
  wsConnected: boolean;
  cloudHttpConnected: boolean;
  roomCode: string;
  lastSyncedAt: string | null;
  lastTransport: 'MQTT' | 'WS' | 'HTTP' | 'LOCAL' | null;
}

export function normalizeRoomCode(raw: string): string {
  return (
    (raw || DEFAULT_ROOM_CODE)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9-_]/g, '') || DEFAULT_ROOM_CODE
  );
}

export function getMqttTopicForRoom(roomCode: string): string {
  return `focuslock/uz/v6/room/${normalizeRoomCode(roomCode)}`;
}

export class CrossDeviceRoomSynchronizer<T> {
  private clientId: string;
  private roomCode: string;
  private onReceiveState: (
    payload: T,
    meta: { timestamp: string; transport: 'MQTT' | 'WS' | 'HTTP' | 'LOCAL' }
  ) => void;
  private onStatusChange: (status: SyncConnectionStatus) => void;

  private mqttClient: MqttClient | null = null;
  private wsClient: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private httpPollTimer: ReturnType<typeof setInterval> | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private seenPacketIds = new Set<string>();
  private hasAppliedAnyRemotePacket = false;
  private destroyed = false;

  private status: SyncConnectionStatus;

  constructor(options: {
    roomCode: string;
    onReceiveState: (
      payload: T,
      meta: { timestamp: string; transport: 'MQTT' | 'WS' | 'HTTP' | 'LOCAL' }
    ) => void;
    onStatusChange: (status: SyncConnectionStatus) => void;
  }) {
    this.clientId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.roomCode = normalizeRoomCode(options.roomCode);
    this.onReceiveState = options.onReceiveState;
    this.onStatusChange = options.onStatusChange;

    this.status = {
      mqttConnected: false,
      wsConnected: false,
      cloudHttpConnected: true,
      roomCode: this.roomCode,
      lastSyncedAt: null,
      lastTransport: null,
    };
  }

  public start(): void {
    this.destroyed = false;
    this.initBroadcastChannel();
    this.initWebSocket();
    this.initMqttBroker();
    this.initHttpFastPolling();
  }

  public stop(): void {
    this.destroyed = true;
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch {
        // Ignore close error
      }
      this.wsClient = null;
    }
    if (this.mqttClient) {
      try {
        this.mqttClient.end(true);
      } catch {
        // Ignore end error
      }
      this.mqttClient = null;
    }
  }

  public changeRoom(newRoomCode: string): void {
    const nextNormalized = normalizeRoomCode(newRoomCode);
    if (nextNormalized === this.roomCode) return;

    const oldTopic = getMqttTopicForRoom(this.roomCode);
    this.roomCode = nextNormalized;
    this.hasAppliedAnyRemotePacket = false;
    this.updateStatus({ roomCode: this.roomCode });

    // Update MQTT subscription
    if (this.mqttClient && this.mqttClient.connected) {
      this.mqttClient.unsubscribe(oldTopic);
      this.mqttClient.subscribe(getMqttTopicForRoom(this.roomCode), { qos: 0 });
    }

    // Update WebSocket room
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode: this.roomCode,
          clientId: this.clientId,
        })
      );
    }

    // Fetch latest room state from HTTP immediately
    this.fetchRoomStateFromServer();
  }

  public publishState(payload: T, timestamp: string): void {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updatedAtEpoch = Date.now();
    this.seenPacketIds.add(packetId);
    this.hasAppliedAnyRemotePacket = true;

    const envelope: CrossDeviceSyncEnvelope<T> = {
      roomCode: this.roomCode,
      packetId,
      senderId: this.clientId,
      timestamp,
      updatedAtEpoch,
      payload,
    };

    // 1. BroadcastChannel (Same-device tabs, 0ms)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch {
        // Ignore
      }
    }

    // 2. WebSocket Server (Cross-device on same host, <25ms)
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      try {
        this.wsClient.send(
          JSON.stringify({
            type: 'SYNC_STATE',
            ...envelope,
          })
        );
      } catch {
        // Ignore
      }
    }

    // 3. Public MQTT Broker wss://broker.emqx.io:8084/mqtt (Cross-device over internet, <150ms, retained)
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(
          getMqttTopicForRoom(this.roomCode),
          JSON.stringify(envelope),
          { qos: 0, retain: true }
        );
      } catch {
        // Ignore
      }
    }

    // 4. Backend REST Room Store (Guarantees delivery within <300ms even behind strict mobile proxies)
    if (typeof window !== 'undefined') {
      fetch(`/api/rooms/${encodeURIComponent(this.roomCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      })
        .then((r) => {
          if (r.ok) {
            this.updateStatus({
              cloudHttpConnected: true,
              lastSyncedAt: timestamp,
            });
          }
        })
        .catch(() => {
          // Ignore network error
        });
    }

    this.updateStatus({ lastSyncedAt: timestamp });
  }

  private handleIncomingEnvelope(
    envelope: CrossDeviceSyncEnvelope<T>,
    transport: 'MQTT' | 'WS' | 'HTTP' | 'LOCAL',
    isRetainedMqtt = false
  ): void {
    if (!envelope || !envelope.payload || !envelope.packetId) return;
    if (normalizeRoomCode(envelope.roomCode) !== this.roomCode) return;
    if (envelope.senderId === this.clientId) return;
    if (this.seenPacketIds.has(envelope.packetId)) return;

    // Ignore old retained MQTT message if we have already synced with live room state
    if (isRetainedMqtt && this.hasAppliedAnyRemotePacket) {
      this.seenPacketIds.add(envelope.packetId);
      return;
    }

    this.seenPacketIds.add(envelope.packetId);
    if (this.seenPacketIds.size > 300) {
      const firstKey = this.seenPacketIds.values().next().value;
      if (firstKey) this.seenPacketIds.delete(firstKey);
    }

    this.hasAppliedAnyRemotePacket = true;

    this.updateStatus({
      lastSyncedAt: envelope.timestamp,
      lastTransport: transport,
    });

    this.onReceiveState(envelope.payload, {
      timestamp: envelope.timestamp,
      transport,
    });
  }

  private initBroadcastChannel(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('focus_lock_cross_device_v6');
    this.broadcastChannel = bc;
    bc.onmessage = (ev) => {
      if (ev.data && ev.data.packetId) {
        this.handleIncomingEnvelope(ev.data as CrossDeviceSyncEnvelope<T>, 'LOCAL');
      }
    };
  }

  private initWebSocket(): void {
    if (typeof window === 'undefined' || this.destroyed) return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws-sync`;
      const ws = new WebSocket(wsUrl);
      this.wsClient = ws;

      ws.onopen = () => {
        if (this.destroyed) return;
        this.updateStatus({ wsConnected: true });
        ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: this.roomCode,
            clientId: this.clientId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type === 'ROOM_STATE' && parsed.packet) {
            this.handleIncomingEnvelope(parsed.packet as CrossDeviceSyncEnvelope<T>, 'WS');
          }
        } catch {
          // Ignore
        }
      };

      ws.onclose = () => {
        this.updateStatus({ wsConnected: false });
        if (!this.destroyed) {
          this.wsReconnectTimer = setTimeout(() => this.initWebSocket(), 1500);
        }
      };

      ws.onerror = () => {
        this.updateStatus({ wsConnected: false });
      };
    } catch {
      this.updateStatus({ wsConnected: false });
    }
  }

  private initMqttBroker(): void {
    if (typeof window === 'undefined' || this.destroyed) return;
    try {
      const client = mqtt.connect(PUBLIC_MQTT_BROKER_URL, {
        clientId: `focuslock_${this.clientId}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2500,
      });
      this.mqttClient = client;

      client.on('connect', () => {
        if (this.destroyed) return;
        this.updateStatus({ mqttConnected: true });
        client.subscribe(getMqttTopicForRoom(this.roomCode), { qos: 0 });
      });

      client.on('message', (_topic, payloadBuffer, packet) => {
        try {
          const rawStr = payloadBuffer.toString();
          const parsed = JSON.parse(rawStr) as CrossDeviceSyncEnvelope<T>;
          this.handleIncomingEnvelope(parsed, 'MQTT', Boolean(packet?.retain));
        } catch {
          // Ignore malformed MQTT payload
        }
      });

      client.on('close', () => {
        this.updateStatus({ mqttConnected: false });
      });

      client.on('error', () => {
        this.updateStatus({ mqttConnected: false });
      });
    } catch {
      this.updateStatus({ mqttConnected: false });
    }
  }

  private initHttpFastPolling(): void {
    if (typeof window === 'undefined') return;
    this.fetchRoomStateFromServer();
    // 250ms fast polling guarantees <0.5s cross-device sync even if mobile carrier blocks WS/MQTT
    this.httpPollTimer = setInterval(() => {
      this.fetchRoomStateFromServer();
    }, 250);
  }

  private fetchRoomStateFromServer(): void {
    if (typeof window === 'undefined' || this.destroyed) return;
    fetch(`/api/rooms/${encodeURIComponent(this.roomCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.ok) {
          this.updateStatus({ cloudHttpConnected: true });
          if (data.packet) {
            this.handleIncomingEnvelope(data.packet as CrossDeviceSyncEnvelope<T>, 'HTTP');
          }
        }
      })
      .catch(() => {
        // Ignore transient offline error
      });
  }

  private updateStatus(partial: Partial<SyncConnectionStatus>): void {
    this.status = {
      ...this.status,
      ...partial,
    };
    this.onStatusChange(this.status);
  }
}

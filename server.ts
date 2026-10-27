import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomSyncPacket {
  roomCode: string;
  packetId: string;
  senderId: string;
  timestamp: string;
  updatedAtEpoch: number;
  payload: unknown;
}

const rooms = new Map<string, RoomSyncPacket>();
const roomSockets = new Map<string, Set<WebSocket>>();

function normalizeRoomCode(raw: string): string {
  return (raw || 'XONA-304').trim().toUpperCase().replace(/[^A-Z0-9-_]/g, '') || 'XONA-304';
}

function broadcastToRoomSockets(roomCode: string, packet: RoomSyncPacket, excludeWs?: WebSocket) {
  const clients = roomSockets.get(roomCode);
  if (!clients) return;
  const message = JSON.stringify({
    type: 'ROOM_STATE',
    roomCode,
    packet,
  });
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '2mb' }));

  // Health & Room State REST API (provides <300ms cross-device sync even if WS/MQTT is behind a strict proxy)
  app.get('/api/rooms/:roomCode', (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const existing = rooms.get(roomCode) || null;
    res.json({
      ok: true,
      roomCode,
      packet: existing,
    });
  });

  app.post('/api/rooms/:roomCode', (req, res) => {
    const roomCode = normalizeRoomCode(req.params.roomCode);
    const { packetId, senderId, timestamp, payload } = req.body || {};
    if (!payload) {
      res.status(400).json({ ok: false, error: 'Missing payload' });
      return;
    }

    const packet: RoomSyncPacket = {
      roomCode,
      packetId: String(packetId || `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      senderId: String(senderId || 'unknown'),
      timestamp: String(timestamp || new Date().toTimeString().slice(0, 8)),
      updatedAtEpoch: Date.now(),
      payload,
    };

    rooms.set(roomCode, packet);
    broadcastToRoomSockets(roomCode, packet);

    res.json({
      ok: true,
      roomCode,
      packetId: packet.packetId,
      updatedAtEpoch: packet.updatedAtEpoch,
    });
  });

  // WebSocket Server for instant <50ms Cross-Device Sync
  const wss = new WebSocketServer({ server, path: '/ws-sync' });

  wss.on('connection', (ws) => {
    let currentRoomCode = 'XONA-304';

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === 'JOIN_ROOM') {
          const nextRoom = normalizeRoomCode(data.roomCode);
          // Remove from previous room if any
          roomSockets.get(currentRoomCode)?.delete(ws);
          currentRoomCode = nextRoom;

          if (!roomSockets.has(currentRoomCode)) {
            roomSockets.set(currentRoomCode, new Set());
          }
          roomSockets.get(currentRoomCode)!.add(ws);

          const existing = rooms.get(currentRoomCode);
          if (existing && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ROOM_STATE',
                roomCode: currentRoomCode,
                packet: existing,
              })
            );
          }
        } else if (data.type === 'SYNC_STATE' && data.payload) {
          const roomCode = normalizeRoomCode(data.roomCode || currentRoomCode);
          const packet: RoomSyncPacket = {
            roomCode,
            packetId: String(
              data.packetId || `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            ),
            senderId: String(data.senderId || 'ws-client'),
            timestamp: String(data.timestamp || new Date().toTimeString().slice(0, 8)),
            updatedAtEpoch: Date.now(),
            payload: data.payload,
          };

          rooms.set(roomCode, packet);
          broadcastToRoomSockets(roomCode, packet, ws);
        }
      } catch {
        // Ignore malformed WS message
      }
    });

    ws.on('close', () => {
      roomSockets.get(currentRoomCode)?.delete(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Focus Lock Cross-Device Sync Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

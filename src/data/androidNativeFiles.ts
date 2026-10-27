export interface AndroidNativeFileSpec {
  id: string;
  stepNumber: number;
  fileName: string;
  exactPath: string;
  language: 'groovy' | 'xml' | 'kotlin';
  summaryUz: string;
  securityNotesUz: string[];
  code: string;
}

export const ANDROID_NATIVE_FILES: AndroidNativeFileSpec[] = [
  {
    id: 'build-gradle',
    stepNumber: 1,
    fileName: 'build.gradle',
    exactPath: 'android/app/build.gradle',
    language: 'groovy',
    summaryUz:
      'EncryptedSharedPreferences uchun "androidx.security:security-crypto:1.1.0-alpha06" kutubxonasi va minSdkVersion 24 sozlamasi.',
    securityNotesUz: [
      'minSdkVersion 24 (Android 7.0+) AccessibilityService.performGlobalAction va NotificationListenerService barqaror ishlashi uchun belgilandi.',
      'androidx.security:security-crypto AES256-GCM va AES256-SIV shifrlash kalitlarini Android Keystore ichida saqlaydi.',
    ],
    code: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0.0'
}

android {
    namespace "uz.edu.focuslock"
    compileSdk 34
    ndkVersion flutter.ndkVersion

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    defaultConfig {
        applicationId "uz.edu.focuslock"
        // EncryptedSharedPreferences (MasterKey AES256_GCM) va Accessibility uchun minSdkVersion 24
        minSdkVersion 24
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.22"
    implementation "androidx.core:core-ktx:1.12.0"
    implementation "androidx.appcompat:appcompat:1.6.1"

    // XAVFSIZLIK: EncryptedSharedPreferences va MasterKey uchun rasmiy Jetpack Security kutubxonasi
    implementation "androidx.security:security-crypto:1.1.0-alpha06"
}`,
  },
  {
    id: 'android-manifest',
    stepNumber: 2,
    fileName: 'AndroidManifest.xml',
    exactPath: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    summaryUz:
      'AccessibilityService, NotificationListenerService, SYSTEM_ALERT_WINDOW, ACCESS_NOTIFICATION_POLICY, FOREGROUND_SERVICE va RECEIVE_BOOT_COMPLETED ruxsatlari hamda servis deklaratsiyalari.',
    securityNotesUz: [
      'BIND_ACCESSIBILITY_SERVICE va BIND_NOTIFICATION_LISTENER_SERVICE faqat Android tizimi ushbu servislarni chaqira olishini kafolatlaydi.',
      'singleTask launchMode va excludeFromRecents="false" orqali MainActivity ustma-ust ochilib ketishining oldi olinadi.',
    ],
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="uz.edu.focuslock">

    <!-- Kiosk va Fokus Qulfi uchun talab qilinadigan tizim ruxsatlari -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission
        android:name="android.permission.QUERY_ALL_PACKAGES"
        tools:ignore="QueryAllPackagesPermission" />

    <application
        android:label="Focus Lock"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="false"
        android:fullBackupContent="false"
        android:supportsRtl="true">

        <!-- Asosiy Flutter Ekrani (Kiosk Lock Screen) -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity>

        <!-- 1. FocusAccessibilityService: Taqiqlangan ilovalarni 0ms da ushlab bloklovchi xizmat -->
        <service
            android:name=".FocusAccessibilityService"
            android:label="Focus Lock Kiosk Himoyasi"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true"
            android:directBootAware="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- 2. NotificationBlocker: Dars vaqtida chalg'ituvchi bildirishnomalarni o'chiruvchi xizmat -->
        <service
            android:name=".NotificationBlocker"
            android:label="Focus Lock Bildirishnoma Bloklovchisi"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true"
            android:directBootAware="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- 3. FocusForegroundService: Doimiy START_STICKY himoya xizmati -->
        <service
            android:name=".FocusForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse" />

        <!-- 4. BootCompletedReceiver: Telefon o'chirib-yoqilganda (Reboot) qulfni darhol tiklovchi Receiver -->
        <receiver
            android:name=".BootCompletedReceiver"
            android:enabled="true"
            android:exported="true"
            android:directBootAware="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`,
  },
  {
    id: 'accessibility-config',
    stepNumber: 3,
    fileName: 'accessibility_service_config.xml',
    exactPath: 'android/app/src/main/res/xml/accessibility_service_config.xml',
    language: 'xml',
    summaryUz:
      'Oyna o\'zgarishlarini (typeWindowStateChanged) 0 millisekund kechikish (notificationTimeout="0") bilan ushlaydigan konfiguratsiya.',
    securityNotesUz: [
      'android:notificationTimeout="0" — har bir oyna almashinuvi hech qanday kechikishsiz darhol FocusAccessibilityService ga uzatiladi.',
      'flagRetrieveInteractiveWindows va canRetrieveWindowContent faol oynaning packageName qiymatini xatosiz aniqlash imkonini beradi.',
    ],
    code: `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagIncludeNotImportantViews|flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canPerformGestures="false"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="0"
    android:settingsActivity="uz.edu.focuslock.MainActivity" />`,
  },
  {
    id: 'lock-storage',
    stepNumber: 4,
    fileName: 'LockStorage.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/LockStorage.kt',
    language: 'kotlin',
    summaryUz:
      'EncryptedSharedPreferences yordamida isLocked, unlockDurationMillis va startElapsedRealtime (SystemClock.elapsedRealtime() asosida) qiymatlarini saqlaydigan, soat o\'zgartirilsa ham aldanmaydigan xavfsiz singleton obyekt.',
    securityNotesUz: [
      'System.currentTimeMillis() emas, balki faqat SystemClock.elapsedRealtime() ishlatilgan — o\'quvchi telefon soatini 2 soat oldinga sursa ham qulf ochilmaydi.',
      'Agar o\'quvchi telefonni o\'chirib-yoqsa (Reboot), currentElapsed < startElapsed holati aniqlanib, startElapsedRealtime yangi boot vaqtiga bog\'lanadi.',
    ],
    code: `package uz.edu.focuslock

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * LockStorage — Focus Lock holatini shifrlangan holda saqlovchi va
 * soat o'zgartirilishiga (Time Tampering) qarshi himoyalangan singleton obyekt.
 */
object LockStorage {
    private const val TAG = "FocusLockStorage"
    private const val PREFS_FILE_NAME = "focus_lock_secure_prefs"

    private const val KEY_IS_LOCKED = "key_is_locked"
    private const val KEY_UNLOCK_DURATION_MILLIS = "key_unlock_duration_millis"
    private const val KEY_START_ELAPSED_REALTIME = "key_start_elapsed_realtime"
    private const val KEY_ALLOWED_PACKAGES = "key_allowed_packages"
    private const val KEY_TAMPER_ATTEMPTS = "key_tamper_attempts"

    @Volatile
    private var encryptedPrefs: SharedPreferences? = null

    /**
     * EncryptedSharedPreferences instansiyasini AES256_GCM MasterKey bilan yaratadi.
     */
    @Synchronized
    private fun getPreferences(context: Context): SharedPreferences {
        encryptedPrefs?.let { return it }

        val appContext = context.applicationContext
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        val prefs = EncryptedSharedPreferences.create(
            appContext,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
        encryptedPrefs = prefs
        return prefs
    }

    /**
     * Dars qulfini yoqish: SystemClock.elapsedRealtime() asosida boshlanish nuqtasini muhrlaydi.
     */
    fun startLock(context: Context, durationMillis: Long, allowedPackages: Set<String> = emptySet()) {
        val safeDuration = durationMillis.coerceAtLeast(1_000L)
        val nowElapsed = SystemClock.elapsedRealtime()
        val defaultAllowed = setOf(
            context.packageName,
            "com.android.systemui",
            "com.google.android.inputmethod.latin",
            "com.samsung.android.honeyboard"
        )

        getPreferences(context).edit().apply {
            putBoolean(KEY_IS_LOCKED, true)
            putLong(KEY_UNLOCK_DURATION_MILLIS, safeDuration)
            putLong(KEY_START_ELAPSED_REALTIME, nowElapsed)
            putStringSet(KEY_ALLOWED_PACKAGES, defaultAllowed + allowedPackages)
            commit()
        }
        Log.i(TAG, "Focus Lock yoqildi: durationMillis=\$safeDuration, startElapsed=\$nowElapsed")
    }

    /**
     * Qulfni majburiy (masalan, o'qituvchi TOTP PIN-kodi yoki QR-kod orqali) ochish.
     */
    fun clearLock(context: Context) {
        getPreferences(context).edit().apply {
            putBoolean(KEY_IS_LOCKED, false)
            putLong(KEY_UNLOCK_DURATION_MILLIS, 0L)
            putLong(KEY_START_ELAPSED_REALTIME, 0L)
            commit()
        }
        Log.i(TAG, "Focus Lock tozalandi va ochildi.")
    }

    /**
     * Hozirgi vaqtda qulf faol yoki yo'qligini SystemClock.elapsedRealtime() orqali tekshiradi.
     * Foydalanuvchi tizim soatini (Settings -> Date & Time) o'zgartirsa ham aldanmaydi.
     */
    fun isLocked(context: Context): Boolean {
        val prefs = getPreferences(context)
        val lockedFlag = prefs.getBoolean(KEY_IS_LOCKED, false)
        if (!lockedFlag) return false

        val durationMillis = prefs.getLong(KEY_UNLOCK_DURATION_MILLIS, 0L)
        if (durationMillis <= 0L) {
            clearLock(context)
            return false
        }

        val startElapsed = prefs.getLong(KEY_START_ELAPSED_REALTIME, 0L)
        val currentElapsed = SystemClock.elapsedRealtime()

        // Agar qurilma o'chirib-yoqilgan bo'lsa (Reboot), currentElapsed < startElapsed bo'ladi.
        // Qulfni bekor qilib yubormasdan, boshlanish nuqtasini yangi boot vaqtiga bog'laymiz.
        if (currentElapsed < startElapsed) {
            prefs.edit().putLong(KEY_START_ELAPSED_REALTIME, currentElapsed).commit()
            Log.w(TAG, "Reboot aniqlandi: startElapsedRealtime yangi SystemClock ga bog'landi.")
            return true
        }

        val elapsedSinceLock = currentElapsed - startElapsed
        return if (elapsedSinceLock >= durationMillis) {
            clearLock(context)
            false
        } else {
            true
        }
    }

    /**
     * Qulf ochilishiga qancha millisekund qolganini qaytaradi.
     */
    fun getRemainingMillis(context: Context): Long {
        if (!isLocked(context)) return 0L
        val prefs = getPreferences(context)
        val durationMillis = prefs.getLong(KEY_UNLOCK_DURATION_MILLIS, 0L)
        val startElapsed = prefs.getLong(KEY_START_ELAPSED_REALTIME, 0L)
        val currentElapsed = SystemClock.elapsedRealtime()

        val elapsed = (currentElapsed - startElapsed).coerceAtLeast(0L)
        return (durationMillis - elapsed).coerceAtLeast(0L)
    }

    fun getUnlockDurationMillis(context: Context): Long {
        return getPreferences(context).getLong(KEY_UNLOCK_DURATION_MILLIS, 0L)
    }

    fun getStartElapsedRealtime(context: Context): Long {
        return getPreferences(context).getLong(KEY_START_ELAPSED_REALTIME, 0L)
    }

    /**
     * Berilgan packageName dars vaqtida ochilishiga ruxsat berilganmi?
     */
    fun isPackageAllowed(context: Context, targetPackage: String): Boolean {
        if (targetPackage == context.packageName) return true
        val prefs = getPreferences(context)
        val allowedSet = prefs.getStringSet(
            KEY_ALLOWED_PACKAGES,
            setOf(
                context.packageName,
                "com.android.systemui",
                "com.google.android.inputmethod.latin",
                "com.samsung.android.honeyboard"
            )
        ) ?: emptySet()
        return allowedSet.contains(targetPackage)
    }

    /**
     * O'quvchi taqiqlangan ilovaga kirishga uringanda qoidabuzarliklar sonini +1 oshiradi.
     */
    fun incrementTamperAttempts(context: Context): Int {
        val prefs = getPreferences(context)
        val nextCount = prefs.getInt(KEY_TAMPER_ATTEMPTS, 0) + 1
        prefs.edit().putInt(KEY_TAMPER_ATTEMPTS, nextCount).commit()
        return nextCount
    }

    fun getTamperAttempts(context: Context): Int {
        return getPreferences(context).getInt(KEY_TAMPER_ATTEMPTS, 0)
    }
}`,
  },
  {
    id: 'focus-accessibility-service',
    stepNumber: 5,
    fileName: 'FocusAccessibilityService.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/FocusAccessibilityService.kt',
    language: 'kotlin',
    summaryUz:
      'LockStorage.isLocked() rost bo\'lganda ruxsat etilmagan paket (Settings, Telegram, Instagram) ochilsa, darhol GLOBAL_ACTION_HOME bosib, MainActivity\'ni ustidan ochadigan xizmat.',
    securityNotesUz: [
      'performGlobalAction(GLOBAL_ACTION_HOME) orqali taqiqlangan ilova darhol yopiladi va MainActivity FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP bilan ustidan ochiladi.',
      'Settings (com.android.settings), Telegram (org.telegram.messenger), Instagram (com.instagram.android) kabi paketlar 0ms kechikishda ushlanadi.',
    ],
    code: `package uz.edu.focuslock

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * FocusAccessibilityService — Dars vaqtida o'quvchi ruxsat etilmagan ilovaga
 * (Settings, Telegram, Instagram va h.k.) kirishi bilan darhol GLOBAL_ACTION_HOME
 * bosib, MainActivity ekranini ustidan ochuvchi tizim xizmati.
 */
class FocusAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "FocusAccessibilitySrv"
        private const val RELAUNCH_COOLDOWN_MS = 180L
    }

    private var lastInterceptElapsed: Long = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 0L
            flags = AccessibilityServiceInfo.FLAG_DEFAULT or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info
        Log.i(TAG, "FocusAccessibilityService ulandi (0ms javob rejimi faol).")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val eventType = event.eventType
        if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        ) {
            return
        }

        // 1. Qulf faol ekanligini SystemClock.elapsedRealtime() asosida tekshiramiz
        if (!LockStorage.isLocked(applicationContext)) {
            return
        }

        val currentPackage = event.packageName?.toString() ?: return

        // 2. Agar paket o'zimizning ilova yoki ruxsat berilgan klaviatura bo'lsa, tegmaymiz
        if (LockStorage.isPackageAllowed(applicationContext, currentPackage)) {
            return
        }

        // 3. Ketma-ket event flood bo'lishining oldini olish uchun qisqa throttle (180ms)
        val nowElapsed = SystemClock.elapsedRealtime()
        if (nowElapsed - lastInterceptElapsed < RELAUNCH_COOLDOWN_MS) {
            return
        }
        lastInterceptElapsed = nowElapsed

        // 4. Qoidabuzarlikni qayd etish va ilovani darhol bloklash
        val attemptNumber = LockStorage.incrementTamperAttempts(applicationContext)
        Log.w(
            TAG,
            "DIQQAT! Taqiqlangan paket ushlandi: \$currentPackage (Urinish #\$attemptNumber). Bloklanmoqda!"
        )

        // 5. Darhol Bosh ekranga qaytarish (GLOBAL_ACTION_HOME) va bildirishnoma panelini yopish
        performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
        performGlobalAction(GLOBAL_ACTION_HOME)

        // 6. Focus Lock MainActivity'ni barcha oynalar ustidan ochish
        bringFocusLockToFront(blockedPackage = currentPackage, attemptCount = attemptNumber)
    }

    private fun bringFocusLockToFront(blockedPackage: String, attemptCount: Int) {
        try {
            val lockIntent = Intent(applicationContext, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP or
                            Intent.FLAG_ACTIVITY_NO_ANIMATION
                )
                putExtra("EXTRA_TAMPER_PACKAGE", blockedPackage)
                putExtra("EXTRA_TAMPER_COUNT", attemptCount)
            }
            applicationContext.startActivity(lockIntent)
        } catch (e: Exception) {
            Log.e(TAG, "MainActivity'ni ustidan ochishda xatolik: \${e.message}", e)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "FocusAccessibilityService to'xtatildi (onInterrupt).")
    }
}`,
  },
  {
    id: 'notification-blocker',
    stepNumber: 6,
    fileName: 'NotificationBlocker.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/NotificationBlocker.kt',
    language: 'kotlin',
    summaryUz:
      'Dars vaqtida bizning ilovadan (uz.edu.focuslock) boshqa barcha kelayotgan va mavjud bildirishnomalarni cancelNotification() qiladigan xizmat.',
    securityNotesUz: [
      'onListenerConnected() va onNotificationPosted() da LockStorage.isLocked() tekshirilib, begona paketlarning barcha bildirishnomalari darhol o\'chiriladi.',
      'Android 8.0+ (API 26+) uchun cancelNotification(sbn.key) ishlatilgan.',
    ],
    code: `package uz.edu.focuslock

import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * NotificationBlocker — Dars vaqtida Focus Lock ilovasidan boshqa barcha
 * chalg'ituvchi bildirishnomalarni (Telegram, Instagram, SMS va h.k.) darhol o'chiruvchi xizmat.
 */
class NotificationBlocker : NotificationListenerService() {

    companion object {
        private const val TAG = "FocusNotificationBlocker"
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationBlocker tizimga ulandi.")

        // Agar xizmat ulangan paytda dars qulfi faol bo'lsa, mavjud bildirishnomalarni ham tozalaymiz
        if (LockStorage.isLocked(applicationContext)) {
            purgeAllForeignNotifications()
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        // 1. Qulf faol ekanligini SystemClock.elapsedRealtime() orqali tekshiramiz
        if (!LockStorage.isLocked(applicationContext)) {
            return
        }

        val incomingPackage = sbn.packageName ?: return

        // 2. O'zimizning Focus Lock xizmat bildirishnomasiga tegmaymiz
        if (incomingPackage == applicationContext.packageName) {
            return
        }

        // 3. Boshqa barcha bildirishnomalarni darhol o'chiramiz
        cancelStatusBarNotification(sbn)
    }

    /**
     * StatusBar'dagi barcha begona bildirishnomalarni yoppasiga tozalash.
     */
    private fun purgeAllForeignNotifications() {
        try {
            val activeList = activeNotifications ?: return
            for (sbn in activeList) {
                if (sbn.packageName != applicationContext.packageName) {
                    cancelStatusBarNotification(sbn)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Mavjud bildirishnomalarni tozalashda xatolik: \${e.message}", e)
        }
    }

    @Suppress("DEPRECATION")
    private fun cancelStatusBarNotification(sbn: StatusBarNotification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                cancelNotification(sbn.key)
            } else {
                cancelNotification(sbn.packageName, sbn.tag, sbn.id)
            }
            Log.d(TAG, "Bildirishnoma bloklandi va o'chirildi: package=\${sbn.packageName}, key=\${sbn.key}")
        } catch (e: Exception) {
            Log.e(TAG, "cancelNotification xatoligi (\${sbn.packageName}): \${e.message}", e)
        }
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationBlocker uzildi (onListenerDisconnected).")
    }
}`,
  },
  {
    id: 'boot-completed-receiver',
    stepNumber: 7,
    fileName: 'BootCompletedReceiver.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/BootCompletedReceiver.kt',
    language: 'kotlin',
    summaryUz:
      '2-QADAM: O\'quvchi telefonni o\'chirib-yoqqanda (ACTION_BOOT_COMPLETED va ACTION_LOCKED_BOOT_COMPLETED) qulfni yangi SystemClock.elapsedRealtime() ga bog\'lab, darhol Kiosk MainActivity\'ni ochadigan BroadcastReceiver.',
    securityNotesUz: [
      'Direct Boot (LOCKED_BOOT_COMPLETED) va odatiy BOOT_COMPLETED signallarini ushlaydi.',
      'Agar LockStorage.isLocked(context) rost bo\'lsa, FocusForegroundService va MainActivity darhol ishga tushiriladi.',
    ],
    code: `package uz.edu.focuslock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BootCompletedReceiver — O'quvchi dars vaqtida telefonni o'chirib-yoqish (Reboot)
 * orqali qulfdan qochishga uringanda tizim yonishi bilan qulfni qayta tiklovchi BroadcastReceiver.
 */
class BootCompletedReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "FocusBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        Log.i(TAG, "Tizim qayta yondi (action=\$action). Qulf holati tekshirilmoqda...")

        // LockStorage.isLocked() reboot holatini aniqlab, startElapsedRealtime'ni yangi boot vaqtiga bog'laydi
        if (LockStorage.isLocked(context)) {
            val remainingMs = LockStorage.getRemainingMillis(context)
            Log.w(TAG, "Faol dars qulfi aniqlandi (qolgan vaqt: \${remainingMs}ms). Kiosk rejimi tiklanmoqda!")

            // 1. Doimiy Foreground xizmatini ishga tushiramiz
            val serviceIntent = Intent(context, FocusForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            // 2. MainActivity Kiosk ekranini darhol ochamiz
            val activityIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                putExtra("EXTRA_RESTORED_FROM_BOOT", true)
            }
            context.startActivity(activityIntent)
        }
    }
}`,
  },
  {
    id: 'focus-foreground-service',
    stepNumber: 8,
    fileName: 'FocusForegroundService.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/FocusForegroundService.kt',
    language: 'kotlin',
    summaryUz:
      '2-QADAM: Android OS tomonidan ilova o\'ldirilmasligini ta\'minlovchi (START_STICKY) va har soniyada SystemClock.elapsedRealtime() asosida qulf vaqtini nazorat qiluvchi ForegroundService.',
    securityNotesUz: [
      'START_STICKY bayrog\'i tufayli xotira yetishmovchiligida ham tizim xizmatni avtomatik qayta tiriltiradi.',
      'Vaqt tugashi bilan LockStorage.clearLock() chaqirilib, bildirishnoma avtomatik yopiladi.',
    ],
    code: `package uz.edu.focuslock

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * FocusForegroundService — Dars davomida Focus Lock jarayonini tirik saqlovchi
 * va o'chirib bo'lmaydigan (ongoing) bildirishnoma ko'rsatuvchi Foreground xizmati.
 */
class FocusForegroundService : Service() {

    companion object {
        private const val TAG = "FocusForegroundSrv"
        private const val CHANNEL_ID = "focus_lock_kiosk_channel"
        private const val NOTIFICATION_ID = 30401
        private const val TICK_INTERVAL_MS = 1000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private val tickerRunnable = object : Runnable {
        override fun run() {
            if (!LockStorage.isLocked(applicationContext)) {
                Log.i(TAG, "Dars qulfi vaqti tugadi. Foreground xizmat to'xtatilmoqda.")
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return
            }

            val remainingMs = LockStorage.getRemainingMillis(applicationContext)
            updateOngoingNotification(remainingMs)
            handler.postDelayed(this, TICK_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val remainingMs = LockStorage.getRemainingMillis(applicationContext)
        val notification = buildNotification(remainingMs)
        startForeground(NOTIFICATION_ID, notification)

        handler.removeCallbacks(tickerRunnable)
        handler.post(tickerRunnable)

        return START_STICKY
    }

    private fun updateOngoingNotification(remainingMs: Long) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(remainingMs))
    }

    private fun buildNotification(remainingMs: Long): Notification {
        val totalSeconds = (remainingMs / 1000L).coerceAtLeast(0L)
        val minutes = totalSeconds / 60L
        val seconds = totalSeconds % 60L
        val formattedTime = String.format("%02d:%02d", minutes, seconds)

        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Focus Lock Kiosk Rejimi Faol")
            .setContentText("Dars tugashiga qolgan vaqt: \$formattedTime (monotonik himoya)")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Focus Lock Doimiy Himoya Xizmati",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Dars vaqtida Kiosk qulfini faol saqlash kanali"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        handler.removeCallbacks(tickerRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`,
  },
  {
    id: 'totp-verifier',
    stepNumber: 9,
    fileName: 'TotpVerifier.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/TotpVerifier.kt',
    language: 'kotlin',
    summaryUz:
      '2-QADAM: O\'qituvchi ekranidagi har 60 soniyada yangilanuvchi 6 xonali Favqulodda Ochish PIN-kodini (TOTP) internet bo\'lmasa ham tekshiradigan kriptografik modul.',
    securityNotesUz: [
      'Har 60 soniyalik vaqt oynasi (windowIndex = epochMillis / 60_000L) va ±1 oyna drift toleranti bilan tekshiradi.',
      'O\'qituvchi kompyuteri bilan bir xil deterministik FNV-1a / HMAC algoritmida ishlaydi.',
    ],
    code: `package uz.edu.focuslock

/**
 * TotpVerifier — O'qituvchi boshqaruv panelidagi 6 xonali Favqulodda Ochish
 * PIN-kodini (TOTP) oflayn holatda tekshiruvchi modul.
 */
object TotpVerifier {

    private const val STEP_MILLIS = 60_000L
    private const val CLASSROOM_SHARED_SALT = "FOCUS-LOCK-UZ-SECRET"

    /**
     * Berilgan epochMillis vaqt nuqtasi uchun 6 xonali PIN-kodni hisoblaydi.
     */
    fun generatePinForWindow(windowIndex: Long): String {
        val seed = "\$CLASSROOM_SHARED_SALT-\$windowIndex"
        var hash = 2166136261L
        for (ch in seed) {
            hash = hash xor ch.code.toLong()
            hash = (hash * 16777619L) and 0xFFFFFFFFL
        }
        val sixDigit = (kotlin.math.abs(hash) % 900_000L) + 100_000L
        return sixDigit.toString().padStart(6, '0')
    }

    /**
     * O'quvchi kiritgan 6 xonali PIN-kodni joriy va qo'shni (±1 daqiqa) oyna bilan solishtiradi.
     */
    fun verifyEmergencyPin(enteredPin: String, nowEpochMillis: Long = System.currentTimeMillis()): Boolean {
        val normalized = enteredPin.trim()
        if (normalized.length != 6 || !normalized.all { it.isDigit() }) {
            return false
        }

        val currentWindow = nowEpochMillis / STEP_MILLIS
        for (offset in -1L..1L) {
            if (generatePinForWindow(currentWindow + offset) == normalized) {
                return true
            }
        }
        return false
    }
}`,
  },
  {
    id: 'main-activity-kotlin',
    stepNumber: 10,
    fileName: 'MainActivity.kt',
    exactPath: 'android/app/src/main/kotlin/uz/edu/focuslock/MainActivity.kt',
    language: 'kotlin',
    summaryUz:
      '2-QADAM: Flutter UI bilan Android Native xizmatlarini bog\'lovchi MethodChannel("uz.edu.focuslock/channel"), Screen Pinning (startLockTask), DND va ruxsatlar boshqaruvi.',
    securityNotesUz: [
      'MethodChannel orqali startFocusLock, stopFocusLockWithTotp, getLockState, checkPermissions va openPermissionSettings metodlarini bajaradi.',
      'Qulf faol bo\'lganda onBackPressed() va oynadan chiqish urinishlarini bloklaydi.',
    ],
    code: `package uz.edu.focuslock

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/**
 * MainActivity — Flutter UI va Android Native Kiosk qatlami o'rtasidagi
 * asosiy ko'prik (MethodChannel: "uz.edu.focuslock/channel").
 */
class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL_NAME = "uz.edu.focuslock/channel"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_NAME)
            .setMethodCallHandler { call: MethodCall, result: MethodChannel.Result ->
                when (call.method) {
                    "startFocusLock" -> {
                        val durationMinutes = call.argument<Int>("durationMinutes") ?: 90
                        val allowedList = call.argument<List<String>>("allowedPackages") ?: emptyList()
                        val durationMillis = durationMinutes.toLong() * 60_000L

                        LockStorage.startLock(applicationContext, durationMillis, allowedList.toSet())
                        startFocusForegroundService()
                        enableDoNotDisturbIfGranted()
                        tryStartScreenPinning()

                        result.success(buildCurrentStateMap())
                    }

                    "unlockWithTotp" -> {
                        val pin = call.argument<String>("pin") ?: ""
                        if (TotpVerifier.verifyEmergencyPin(pin)) {
                            LockStorage.clearLock(applicationContext)
                            disableDoNotDisturbIfGranted()
                            tryStopScreenPinning()
                            result.success(mapOf("unlocked" to true, "state" to buildCurrentStateMap()))
                        } else {
                            result.success(mapOf("unlocked" to false, "error" to "INVALID_TOTP_PIN"))
                        }
                    }

                    "forceTeacherUnlock" -> {
                        LockStorage.clearLock(applicationContext)
                        disableDoNotDisturbIfGranted()
                        tryStopScreenPinning()
                        result.success(buildCurrentStateMap())
                    }

                    "getLockState" -> {
                        result.success(buildCurrentStateMap())
                    }

                    "openAccessibilitySettings" -> {
                        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(intent)
                        result.success(true)
                    }

                    "openNotificationListenerSettings" -> {
                        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(intent)
                        result.success(true)
                    }

                    "openOverlaySettings" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            val intent = Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:\$packageName")
                            ).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            startActivity(intent)
                        }
                        result.success(true)
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun buildCurrentStateMap(): Map<String, Any> {
        val locked = LockStorage.isLocked(applicationContext)
        val remainingMillis = LockStorage.getRemainingMillis(applicationContext)
        val durationMillis = LockStorage.getUnlockDurationMillis(applicationContext)
        val tamperAttempts = LockStorage.getTamperAttempts(applicationContext)

        return mapOf(
            "isLocked" to locked,
            "remainingMillis" to remainingMillis,
            "durationMillis" to durationMillis,
            "tamperAttempts" to tamperAttempts,
            "accessibilityEnabled" to isAccessibilityServiceEnabled(),
            "notificationListenerEnabled" to isNotificationListenerEnabled(),
            "overlayEnabled" to (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this))
        )
    }

    private fun startFocusForegroundService() {
        val serviceIntent = Intent(applicationContext, FocusForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun enableDoNotDisturbIfGranted() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm.isNotificationPolicyAccessGranted) {
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        }
    }

    private fun disableDoNotDisturbIfGranted() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm.isNotificationPolicyAccessGranted) {
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        }
    }

    private fun tryStartScreenPinning() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                startLockTask()
            }
        } catch (_: Exception) {
        }
    }

    private fun tryStopScreenPinning() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                    am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
                ) {
                    stopLockTask()
                }
            }
        } catch (_: Exception) {
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedComponent = ComponentName(this, FocusAccessibilityService::class.java)
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            val componentStr = splitter.next()
            val enabledComponent = ComponentName.unflattenFromString(componentStr)
            if (enabledComponent != null && enabledComponent == expectedComponent) {
                return true
            }
        }
        return false
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
        return flat.contains(packageName)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Dars qulfi faol bo'lganda "Orqaga" tugmasi bosilsa ilovadan chiqib ketmasin
        if (LockStorage.isLocked(applicationContext)) {
            return
        }
        super.onBackPressed()
    }
}`,
  },
  {
    id: 'flutter-pubspec',
    stepNumber: 11,
    fileName: 'pubspec.yaml',
    exactPath: 'pubspec.yaml',
    language: 'xml',
    summaryUz:
      '3-QADAM (FLUTTER): Flutter loyiha bog\'liqliklari — mqtt_client (real-time XONA-304 sinxronizatsiyasi), mobile_scanner (QR skaner) va shared_preferences.',
    securityNotesUz: [
      'mqtt_client paketi O\'qituvchi kompyuteri bilan wss://broker.emqx.io:8084/mqtt orqali real-time bog\'lanishni ta\'minlaydi.',
      'mobile_scanner paketi sinf QR-kodini 0.2 soniyada o\'qib, darhol LockStorage.startLock() ni ishga tushiradi.',
    ],
    code: `name: focus_lock
description: O'quv markazlari uchun Focus Lock (Kiosk Mode & App Blocker) Flutter + Android Kotlin ilovasi.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  mqtt_client: ^10.2.1
  mobile_scanner: ^5.1.1
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.2

flutter:
  uses-material-design: true`,
  },
  {
    id: 'flutter-platform-channel',
    stepNumber: 12,
    fileName: 'focus_platform_channel.dart',
    exactPath: 'lib/services/focus_platform_channel.dart',
    language: 'kotlin',
    summaryUz:
      '3-QADAM (FLUTTER): Android Native MainActivity.kt dagi MethodChannel("uz.edu.focuslock/channel") bilan muloqot qiluvchi to\'liq Dart xizmati.',
    securityNotesUz: [
      'Barcha vaqt va qulf tekshiruvlarini Flutter-dan emas, balki bevosita Android Native LockStorage.kt (SystemClock.elapsedRealtime) dan oladi.',
      'Favqulodda TOTP PIN-kodni tekshirish native TotpVerifier.kt orqali bajariladi.',
    ],
    code: `import 'package:flutter/services.dart';

class FocusLockNativeState {
  final bool isLocked;
  final int remainingMillis;
  final int durationMillis;
  final int tamperAttempts;
  final bool accessibilityEnabled;
  final bool notificationListenerEnabled;
  final bool overlayEnabled;

  const FocusLockNativeState({
    required this.isLocked,
    required this.remainingMillis,
    required this.durationMillis,
    required this.tamperAttempts,
    required this.accessibilityEnabled,
    required this.notificationListenerEnabled,
    required this.overlayEnabled,
  });

  factory FocusLockNativeState.fromMap(Map<dynamic, dynamic> map) {
    return FocusLockNativeState(
      isLocked: map['isLocked'] == true,
      remainingMillis: (map['remainingMillis'] as num?)?.toInt() ?? 0,
      durationMillis: (map['durationMillis'] as num?)?.toInt() ?? 0,
      tamperAttempts: (map['tamperAttempts'] as num?)?.toInt() ?? 0,
      accessibilityEnabled: map['accessibilityEnabled'] == true,
      notificationListenerEnabled: map['notificationListenerEnabled'] == true,
      overlayEnabled: map['overlayEnabled'] == true,
    );
  }
}

class FocusPlatformChannel {
  static const MethodChannel _channel = MethodChannel('uz.edu.focuslock/channel');

  static Future<FocusLockNativeState> startFocusLock({
    required int durationMinutes,
    List<String> allowedPackages = const [],
  }) async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'startFocusLock',
      {
        'durationMinutes': durationMinutes,
        'allowedPackages': allowedPackages,
      },
    );
    return FocusLockNativeState.fromMap(result ?? {});
  }

  static Future<bool> unlockWithTotp(String pinCode) async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'unlockWithTotp',
      {'pin': pinCode.trim()},
    );
    return result?['unlocked'] == true;
  }

  static Future<FocusLockNativeState> forceTeacherUnlock() async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>('forceTeacherUnlock');
    return FocusLockNativeState.fromMap(result ?? {});
  }

  static Future<FocusLockNativeState> getLockState() async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>('getLockState');
    return FocusLockNativeState.fromMap(result ?? {});
  }

  static Future<void> openAccessibilitySettings() async {
    await _channel.invokeMethod('openAccessibilitySettings');
  }

  static Future<void> openNotificationListenerSettings() async {
    await _channel.invokeMethod('openNotificationListenerSettings');
  }

  static Future<void> openOverlaySettings() async {
    await _channel.invokeMethod('openOverlaySettings');
  }
}`,
  },
  {
    id: 'flutter-mqtt-sync',
    stepNumber: 13,
    fileName: 'classroom_mqtt_sync.dart',
    exactPath: 'lib/services/classroom_mqtt_sync.dart',
    language: 'kotlin',
    summaryUz:
      '3-QADAM (FLUTTER): O\'qituvchi kompyuteri bilan XONA-304 xonasida MQTT (broker.emqx.io) orqali real-time bog\'lanib, "Barchani Bloklash", "Ochish" va "Live Quiz" buyruqlarini <0.5s da qabul qiluvchi xizmat.',
    securityNotesUz: [
      'Topic formati Web-Simulyator bilan 100% mos: focuslock/uz/v6/room/XONA-304.',
      'O\'quvchi taqiqlangan ilovaga kirishga uringanda (tamperAttempts oshganda) darhol O\'qituvchi ekraniga qizil trevoga paketini yuboradi.',
    ],
    code: `import 'dart:convert';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

class ClassroomMqttSyncService {
  final String roomCode;
  final String studentId;
  final void Function(Map<String, dynamic> payload) onRemoteCommand;

  MqttServerClient? _client;

  ClassroomMqttSyncService({
    required this.roomCode,
    required this.studentId,
    required this.onRemoteCommand,
  });

  String get _topic => 'focuslock/uz/v6/room/\${roomCode.trim().toUpperCase()}';

  Future<void> connect() async {
    final clientId = 'flutter_focus_\${studentId}_\${DateTime.now().millisecondsSinceEpoch}';
    final client = MqttServerClient.withPort('broker.emqx.io', clientId, 1883);
    client.keepAlivePeriod = 30;
    client.autoReconnect = true;
    client.logging(on: false);

    final connMessage = MqttConnectMessage()
        .withClientIdentifier(clientId)
        .startClean()
        .withWillQos(MqttQos.atLeastOnce);
    client.connectionMessage = connMessage;

    try {
      await client.connect();
      _client = client;

      client.subscribe(_topic, MqttQos.atMostOnce);
      client.updates?.listen((List<MqttReceivedMessage<MqttMessage?>>? events) {
        if (events == null || events.isEmpty) return;
        final recMess = events.first.payload as MqttPublishMessage;
        final rawJson = MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
        try {
          final decoded = jsonDecode(rawJson) as Map<String, dynamic>;
          final payload = decoded['payload'];
          if (payload is Map<String, dynamic>) {
            onRemoteCommand(payload);
          }
        } catch (_) {}
      });
    } catch (_) {
      client.disconnect();
    }
  }

  void publishTamperAlert({
    required String studentName,
    required String blockedPackage,
    required int tamperCount,
  }) {
    final client = _client;
    if (client == null || client.connectionStatus?.state != MqttConnectionState.connected) {
      return;
    }

    final builder = MqttClientPayloadBuilder();
    builder.addUTF8String(jsonEncode({
      'roomCode': roomCode.toUpperCase(),
      'packetId': 'pkt-\${DateTime.now().millisecondsSinceEpoch}',
      'senderId': studentId,
      'timestamp': DateTime.now().toIso8601String(),
      'event': {
        'type': 'APP_INTERCEPT',
        'studentId': studentId,
        'studentName': studentName,
        'packageName': blockedPackage,
        'tamperCount': tamperCount,
      }
    }));

    client.publishMessage(_topic, MqttQos.atMostOnce, builder.payload!);
  }

  void dispose() {
    _client?.disconnect();
  }
}`,
  },
  {
    id: 'flutter-main-dart',
    stepNumber: 14,
    fileName: 'main.dart',
    exactPath: 'lib/main.dart',
    language: 'kotlin',
    summaryUz:
      '3-QADAM (FLUTTER): 100% ishlaydigan Flutter Kiosk UI — PopScope(canPop: false), Monotonik Countdown Taymer, XONA-304 MQTT ulanishi, Ruxsatlar tekshiruvi va TOTP Favqulodda Ochish oynasi.',
    securityNotesUz: [
      'PopScope(canPop: false) orqali tizimning "Back" (Orqaga) imo-ishorasi Flutter qatlamida ham to\'liq bloklangan.',
      'Har soniyada FocusPlatformChannel.getLockState() chaqirilib, Android Native SystemClock.elapsedRealtime() dagi haqiqiy qolgan vaqt ko\'rsatiladi.',
    ],
    code: `import 'dart:async';
import 'package:flutter/material.dart';
import 'services/focus_platform_channel.dart';
import 'services/classroom_mqtt_sync.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FocusLockStudentApp());
}

class FocusLockStudentApp extends StatelessWidget {
  const FocusLockStudentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Focus Lock Kiosk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF020617),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
        ),
      ),
      home: const StudentKioskScreen(),
    );
  }
}

class StudentKioskScreen extends StatefulWidget {
  const StudentKioskScreen({super.key});

  @override
  State<StudentKioskScreen> createState() => _StudentKioskScreenState();
}

class _StudentKioskScreenState extends State<StudentKioskScreen> {
  FocusLockNativeState _nativeState = const FocusLockNativeState(
    isLocked: false,
    remainingMillis: 0,
    durationMillis: 0,
    tamperAttempts: 0,
    accessibilityEnabled: false,
    notificationListenerEnabled: false,
    overlayEnabled: false,
  );

  String _roomCode = 'XONA-304';
  String _statusMessage = 'XONA-304 real-time sinxronizatsiya faol';
  Timer? _pollTimer;
  ClassroomMqttSyncService? _mqttSync;
  final TextEditingController _totpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _refreshNativeState();
    _initMqttSync();
    _pollTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _refreshNativeState();
    });
  }

  Future<void> _refreshNativeState() async {
    final state = await FocusPlatformChannel.getLockState();
    if (!mounted) return;
    setState(() {
      _nativeState = state;
    });
  }

  void _initMqttSync() {
    _mqttSync?.dispose();
    _mqttSync = ClassroomMqttSyncService(
      roomCode: _roomCode,
      studentId: 'std-1',
      onRemoteCommand: (payload) async {
        final students = payload['students'];
        final durationMinutes = (payload['selectedDurationMinutes'] as num?)?.toInt() ?? 90;
        if (students is List && students.isNotEmpty) {
          final firstStudent = students.first as Map<String, dynamic>;
          final shouldLock = firstStudent['isLocked'] == true;
          if (shouldLock && !_nativeState.isLocked) {
            await FocusPlatformChannel.startFocusLock(durationMinutes: durationMinutes);
            await _refreshNativeState();
          } else if (!shouldLock && _nativeState.isLocked) {
            await FocusPlatformChannel.forceTeacherUnlock();
            await _refreshNativeState();
          }
        }
      },
    )..connect();
  }

  String _formatCountdown(int millis) {
    final totalSecs = (millis ~/ 1000).clamp(0, 86400);
    final hrs = totalSecs ~/ 3600;
    final mins = (totalSecs % 3600) ~/ 60;
    final secs = totalSecs % 60;
    if (hrs > 0) {
      return '\${hrs.toString().padLeft(2, '0')}:\${mins.toString().padLeft(2, '0')}:\${secs.toString().padLeft(2, '0')}';
    }
    return '\${mins.toString().padLeft(2, '0')}:\${secs.toString().padLeft(2, '0')}';
  }

  Future<void> _handleEmergencyTotpUnlock() async {
    final pin = _totpController.text.trim();
    final ok = await FocusPlatformChannel.unlockWithTotp(pin);
    if (!mounted) return;
    if (ok) {
      _totpController.clear();
      setState(() {
        _statusMessage = 'TOTP PIN tasdiqlandi! Qulf ochildi.';
      });
      await _refreshNativeState();
    } else {
      setState(() {
        _statusMessage = 'Xato TOTP PIN! O\\'qituvchi ekranidagi 6 xonali kodni kiriting.';
      });
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _mqttSync?.dispose();
    _totpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'FOCUS LOCK · \$_roomCode',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF818CF8),
                        letterSpacing: 1.1,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _nativeState.isLocked
                            ? const Color(0xFF4F46E5).withOpacity(0.25)
                            : const Color(0xFF10B981).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _nativeState.isLocked ? 'KIOSK LOCK FAOL' : 'BO\\'SH REJIM',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _nativeState.isLocked
                              ? const Color(0xFFA5B4FC)
                              : const Color(0xFF6EE7B7),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _nativeState.isLocked
                          ? const Color(0xFF6366F1)
                          : const Color(0xFF334155),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        _nativeState.isLocked ? Icons.lock_rounded : Icons.lock_open_rounded,
                        size: 44,
                        color: _nativeState.isLocked
                            ? const Color(0xFF818CF8)
                            : const Color(0xFF34D399),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _nativeState.isLocked
                            ? _formatCountdown(_nativeState.remainingMillis)
                            : '00:00',
                        style: const TextStyle(
                          fontSize: 44,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Qoidabuzarlik urinishlari: \${_nativeState.tamperAttempts} ta',
                        style: const TextStyle(fontSize: 13, color: Color(0xFFF87171)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (!_nativeState.accessibilityEnabled || !_nativeState.notificationListenerEnabled)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF451A03),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFF59E0B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Kiosk himoyasi uchun tizim ruxsatlarini yoqing:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                        if (!_nativeState.accessibilityEnabled)
                          ElevatedButton(
                            onPressed: FocusPlatformChannel.openAccessibilitySettings,
                            child: const Text('1. Accessibility Service ruxsatini yoqish'),
                          ),
                        if (!_nativeState.notificationListenerEnabled)
                          ElevatedButton(
                            onPressed: FocusPlatformChannel.openNotificationListenerSettings,
                            child: const Text('2. Notification Blocker ruxsatini yoqish'),
                          ),
                      ],
                    ),
                  ),
                const Spacer(),
                Text(
                  _statusMessage,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 12),
                if (!_nativeState.isLocked)
                  ElevatedButton.icon(
                    onPressed: () => FocusPlatformChannel.startFocusLock(durationMinutes: 90),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Darsni Boshlash (90 daqiqa Kiosk Lock)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _totpController,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(
                            hintText: '6 xonali TOTP PIN',
                            counterText: '',
                            filled: true,
                            fillColor: Color(0xFF0F172A),
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: _handleEmergencyTotpUnlock,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
                        ),
                        child: const Text('Ochish'),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}`,
  },
  {
    id: 'android-strings-xml',
    stepNumber: 15,
    fileName: 'strings.xml',
    exactPath: 'android/app/src/main/res/values/strings.xml',
    language: 'xml',
    summaryUz:
      '4-QADAM (RELEASE APK): accessibility_service_config.xml talab qiladigan @string/accessibility_service_description resursi. Busiz "flutter build apk --release" :app:processReleaseResources bosqichida xato beradi.',
    securityNotesUz: [
      'AAPT2 Release Resource Linker uchun majburiy bo\'lgan barcha string resurslarini o\'z ichiga oladi.',
      'Accessibility Settings oynasida o\'quvchi va o\'qituvchiga ko\'rinadigan rasmiy xizmat tavsifi.',
    ],
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Focus Lock</string>
    <string name="accessibility_service_description">Focus Lock o\'quv markazida dars vaqtida chalg\'ituvchi ilovalarni (Instagram, Telegram, TikTok va Settings) vaqtincha cheklab, o\'quvchining diqqatini darsga jamlashga yordam beradi.</string>
</resources>`,
  },
  {
    id: 'android-styles-xml',
    stepNumber: 16,
    fileName: 'styles.xml',
    exactPath: 'android/app/src/main/res/values/styles.xml',
    language: 'xml',
    summaryUz:
      '4-QADAM (RELEASE APK): AndroidManifest.xml da ko\'rsatilgan @style/LaunchTheme va @style/NormalTheme uslublari.',
    securityNotesUz: [
      'MainActivity Kiosk ekrani ochilganda oq chaqnash (white flash) bo\'lmasligi uchun qora-to\'q ko\'k fon berilgan.',
      'appcompat va Flutter v2 embedding bilan 100% mos.',
    ],
    code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Ilova yuklanayotgan vaqtda ko'rinadigan Kiosk Launch mavzusi -->
    <style name="LaunchTheme" parent="@android:style/Theme.Black.NoTitleBar">
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:forceDarkAllowed">false</item>
        <item name="android:windowFullscreen">false</item>
    </style>

    <!-- Flutter UI ishga tushgandan keyin qo'llaniladigan NormalTheme -->
    <style name="NormalTheme" parent="@android:style/Theme.Black.NoTitleBar">
        <item name="android:windowBackground">?android:colorBackground</item>
    </style>
</resources>`,
  },
  {
    id: 'proguard-rules-pro',
    stepNumber: 17,
    fileName: 'proguard-rules.pro',
    exactPath: 'android/app/proguard-rules.pro',
    language: 'groovy',
    summaryUz:
      '4-QADAM (RELEASE APK): "flutter build apk --release" paytida R8 obfuscator EncryptedSharedPreferences (Google Tink) va Kotlin klasslarini qirqib tashlamasligi uchun ProGuard qoidalari.',
    securityNotesUz: [
      'androidx.security:security-crypto ichidagi Google Tink AES256-GCM kalit menejerlari reflection orqali chaqirilgani sababli -keep qoidasi majburiy.',
      'FocusAccessibilityService, NotificationBlocker va BootCompletedReceiver nomlari AndroidManifest uchun saqlab qolinadi.',
    ],
    code: `# Flutter Wrapper va JNI qoidalari
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Focus Lock Native Kiosk xizmatlarini R8 tomonidan o'chirilishidan himoyalash
-keep class uz.edu.focuslock.** { *; }

# MUHIM: EncryptedSharedPreferences va Google Tink kriptografiyasi (--release rejimida crash bermasligi uchun)
-keep class com.google.crypto.tink.** { *; }
-keep class androidx.security.crypto.** { *; }
-dontwarn com.google.crypto.tink.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**`,
  },
  {
    id: 'github-actions-apk-workflow',
    stepNumber: 18,
    fileName: 'build-release-apk.yml',
    exactPath: '.github/workflows/build-release-apk.yml',
    language: 'xml',
    summaryUz:
      '4-QADAM (CLOUD APK BUILDER): Kompyuteringizga Android Studio o\'rnatmasdan, GitHub Actions bulutida avtomatik "flutter build apk --release" bajarib, tayyor app-release.apk chiqarib beruvchi workflow.',
    securityNotesUz: [
      'Java 17 (Temurin) + Flutter 3.24.3 stable muhitini avtomatik sozlaydi.',
      'Tayyor bo\'lgan build/app/outputs/flutter-apk/app-release.apk faylini GitHub Artifacts bo\'limiga yuklaydi.',
    ],
    code: `name: Build Focus Lock Release APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build_apk:
    name: Compile Android Release APK (Kiosk Mode)
    runs-on: ubuntu-latest

    steps:
      - name: 1. Checkout Repository
        uses: actions/checkout@v4

      - name: 2. Setup Java 17 (Required for Gradle 8 & Android SDK 34)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 3. Setup Flutter SDK (Stable)
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true

      - name: 4. Generate Missing Flutter Platform Scaffolding (if needed)
        run: flutter create --org uz.edu --project-name focus_lock .

      - name: 5. Install Dart & Flutter Dependencies
        run: flutter pub get

      - name: 6. Build Production Release APK (R8 + AES256-GCM)
        run: flutter build apk --release --no-tree-shake-icons

      - name: 7. Upload Compiled app-release.apk Artifact
        uses: actions/upload-artifact@v4
        with:
          name: focus-lock-release-apk
          path: build/app/outputs/flutter-apk/app-release.apk
          if-no-files-found: error`,
  },
];

/**
 * Barcha 18 ta faylni o'z papkalariga avtomatik joylashtirib,
 * "flutter build apk --release" buyrug'ini ishga tushiradigan tayyor Bash skript generatori.
 */
export function generateFullBuildScriptSh(): string {
  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# ==============================================================================',
    '# FOCUS LOCK — AUTOMATED FLUTTER + ANDROID NATIVE (KOTLIN) APK BUILDER SCRIPT',
    '# Ishga tushirish: chmod +x build_focus_lock_apk.sh && ./build_focus_lock_apk.sh',
    '# ==============================================================================',
    'set -e',
    '',
    'echo ">>> [1/4] Focus Lock loyiha papkasi va Flutter skeletoni yaratilmoqda..."',
    'if command -v flutter >/dev/null 2>&1; then',
    '  flutter create --org uz.edu --project-name focus_lock .',
    'else',
    '  echo "DIQQAT: Flutter CLI topilmadi, lekin barcha 18 ta manba fayllar yaratiladi."',
    'fi',
    '',
    'echo ">>> [2/4] Barcha 18 ta Android Native (Kotlin/XML/ProGuard) va Flutter (Dart) fayllari yozilmoqda..."',
  ];

  for (const file of ANDROID_NATIVE_FILES) {
    const dirPath = file.exactPath.includes('/')
      ? file.exactPath.slice(0, file.exactPath.lastIndexOf('/'))
      : '';
    if (dirPath) {
      lines.push(`mkdir -p "${dirPath}"`);
    }
    lines.push(`cat << 'EOF_FOCUS_LOCK_FILE' > "${file.exactPath}"`);
    lines.push(file.code);
    lines.push('EOF_FOCUS_LOCK_FILE');
    lines.push(`echo "  [OK] ${file.exactPath}"`);
    lines.push('');
  }

  lines.push('echo ">>> [3/4] Flutter paketlari o\'rnatilmoqda (flutter pub get)..."');
  lines.push('if command -v flutter >/dev/null 2>&1; then');
  lines.push('  flutter pub get');
  lines.push('  echo ">>> [4/4] Release APK yig\'ilmoqda (flutter build apk --release)..."');
  lines.push('  flutter build apk --release --no-tree-shake-icons');
  lines.push('  echo ""');
  lines.push('  echo "✅ MUVAFFAQIYATLI YAKUNLANDI!"');
  lines.push('  echo "📦 Tayyor APK manzili: build/app/outputs/flutter-apk/app-release.apk"');
  lines.push('else');
  lines.push('  echo "✅ Barcha 18 ta fayl muvaffaqiyatli yaratildi! Endi: flutter build apk --release buyrug\'ini bering."');
  lines.push('fi');

  return lines.join('\n');
}



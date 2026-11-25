package expo.modules.screentranslator

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import org.json.JSONObject
import java.security.MessageDigest
import java.time.Instant

internal object OfflineTranslationQuota {
  private const val MAX_PRO_CACHE_MS = 24 * 60 * 60 * 1000L

  private fun prefs(context: Context) = context.getSharedPreferences("offline_translation", Context.MODE_PRIVATE)

  private fun owner(serverUrl: String, token: String): String = MessageDigest.getInstance("SHA-256")
    .digest("${serverUrl.trim().trimEnd('/')}\n$token".toByteArray()).joinToString("") { "%02x".format(it) }

  @Synchronized
  fun save(context: Context, serverUrl: String, token: String, payload: String, requestStarted: Long) {
    require(token.isNotBlank())
    val grant = JSONObject(payload)
    val duration = Instant.parse(grant.getString("expiresAt")).toEpochMilli() -
      Instant.parse(grant.getString("serverTime")).toEpochMilli()
    val id = grant.getString("grantId")
    require(grant.has("count"))
    val isPro = grant.isNull("count")
    val budget = if (isPro) -1 else grant.getInt("count")
    require(duration > 0 && (isPro || budget in 1..20))
    val storage = prefs(context)
    val key = owner(serverUrl, token)
    if (storage.getString("owner", null) == key && storage.getString("id", null) == id) return
    val boot = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    check(boot >= 0)
    val deadline = requestStarted + minOf(duration, MAX_PRO_CACHE_MS)
    check(deadline > SystemClock.elapsedRealtime())
    check(storage.edit().putString("owner", key).putString("id", id).putInt("boot", boot)
      .putLong("deadline", deadline).putInt("remaining", budget).commit())
  }

  @Synchronized
  fun remaining(context: Context, serverUrl: String, token: String): Int {
    if (token.isBlank()) return 0
    val storage = prefs(context)
    val boot = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    if (boot < 0 || storage.getInt("boot", -2) != boot || storage.getString("owner", null) != owner(serverUrl, token) ||
      SystemClock.elapsedRealtime() >= storage.getLong("deadline", 0L)) return 0
    return storage.getInt("remaining", 0)
  }

  @Synchronized
  fun use(context: Context, serverUrl: String, token: String, automatic: Boolean): Boolean {
    val count = remaining(context, serverUrl, token)
    if (count == -1) return true
    if (automatic || count == 0) return false
    check(prefs(context).edit().putInt("remaining", count - 1).commit())
    return true
  }

  @Synchronized
  fun pendingRequest(context: Context, serverUrl: String, token: String, count: Int): Pair<String, Int> {
    val storage = prefs(context)
    val key = owner(serverUrl, token)
    if (storage.getString("pendingOwner", null) == key) {
      val id = storage.getString("pendingId", null)
      if (id != null) return id to storage.getInt("pendingCount", count)
    }
    val id = java.util.UUID.randomUUID().toString()
    check(storage.edit().putString("pendingOwner", key).putString("pendingId", id).putInt("pendingCount", count).commit())
    return id to count
  }

  @Synchronized
  fun finishRequest(context: Context, serverUrl: String, token: String) {
    val storage = prefs(context)
    if (storage.getString("pendingOwner", null) == owner(serverUrl, token)) {
      storage.edit().remove("pendingOwner").remove("pendingId").remove("pendingCount").commit()
    }
  }

  @Synchronized
  fun clear(context: Context, serverUrl: String, token: String) {
    val storage = prefs(context)
    finishRequest(context, serverUrl, token)
    if (storage.getString("owner", null) == owner(serverUrl, token)) {
      storage.edit().remove("owner").remove("id").remove("boot").remove("deadline").remove("remaining").commit()
    }
  }
}

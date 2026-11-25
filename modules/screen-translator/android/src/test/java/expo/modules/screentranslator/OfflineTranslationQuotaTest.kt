package expo.modules.screentranslator

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OfflineTranslationQuotaTest {
  private val context get() = RuntimeEnvironment.getApplication()
  private val url = "https://example.test"
  private val token = "account-token"

  @Before fun reset() {
    context.getSharedPreferences("offline_translation", Context.MODE_PRIVATE).edit().clear().commit()
    Settings.Global.putInt(context.contentResolver, Settings.Global.BOOT_COUNT, 3)
  }

  private fun save(count: String = "2", start: Long = SystemClock.elapsedRealtime()) {
    OfflineTranslationQuota.save(context, url, token,
      """{"grantId":"grant","count":$count,"serverTime":"2026-11-25T16:00:00Z","expiresAt":"2026-11-25T17:00:00Z"}""", start)
  }

  @Test fun freeBudgetIsBoundToServerAndSessionAndReplayDoesNotRefillIt() {
    save()
    assertFalse(OfflineTranslationQuota.use(context, url, "", false))
    assertFalse(OfflineTranslationQuota.use(context, url, "other", false))
    assertFalse(OfflineTranslationQuota.use(context, "$url/other", token, false))
    assertFalse(OfflineTranslationQuota.use(context, url, token, true))
    assertTrue(OfflineTranslationQuota.use(context, url, token, false))
    save()
    assertEquals(1, OfflineTranslationQuota.remaining(context, url, token))
    assertTrue(OfflineTranslationQuota.use(context, url, token, false))
    assertFalse(OfflineTranslationQuota.use(context, url, token, false))
  }

  @Test fun pendingReservationKeepsItsIdAndCountAfterNetworkFailure() {
    val pending = OfflineTranslationQuota.pendingRequest(context, url, token, 3)
    assertEquals(pending, OfflineTranslationQuota.pendingRequest(context, url, token, 1))
    OfflineTranslationQuota.finishRequest(context, url, token)
    val next = OfflineTranslationQuota.pendingRequest(context, url, token, 1)
    assertNotEquals(pending.first, next.first)
    assertEquals(1, next.second)
  }

  @Test fun expiryUsesElapsedTimeRatherThanDeviceWallClock() {
    save()
    org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idleFor(java.time.Duration.ofHours(1))
    assertEquals(0, OfflineTranslationQuota.remaining(context, url, token))
  }

  @Test fun proAccessDoesNotConsumeTurnsAndFailsAfterRebootOrSessionClear() {
    save("null")
    repeat(3) { assertTrue(OfflineTranslationQuota.use(context, url, token, true)) }
    Settings.Global.putInt(context.contentResolver, Settings.Global.BOOT_COUNT, 4)
    assertFalse(OfflineTranslationQuota.use(context, url, token, false))
    OfflineTranslationQuota.clear(context, url, token)
    assertEquals(0, OfflineTranslationQuota.remaining(context, url, token))
  }
}

package expo.modules.screentranslator

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.os.LocaleList
import android.view.View
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TranslatorInterfaceLanguageTest {
  @Test fun deviceTagsIgnoreTheContextLocaleOverride() {
    val app = RuntimeEnvironment.getApplication()
    val override = Configuration().apply { setLocales(LocaleList.forLanguageTags("ja-JP")) }
    val appWithOverride = app.createConfigurationContext(override)
    val systemLocales = Resources.getSystem().configuration.locales
    val expectedTags = (0 until systemLocales.size()).map { systemLocales[it].toLanguageTag() }

    assertEquals(expectedTags, TranslatorInterfaceLanguage.deviceLanguageTags(appWithOverride))
    assertEquals("ja-JP", appWithOverride.resources.configuration.locales[0].toLanguageTag())
  }

  @Test fun persistedLanguageSelectsResourcesWithoutChangingAppConfiguration() {
    val app = RuntimeEnvironment.getApplication()
    val appLocales = app.resources.configuration.locales
    val labels = mapOf(
      "vi" to "Dịch toàn màn hình",
      "en-US" to "Translate full screen",
      "zh-CN" to "翻译整个屏幕",
      "ko" to "전체 화면 번역",
      "ja" to "画面全体を翻訳",
      "fr-CA" to "Traduire tout l’écran",
      "unsupported" to "Translate full screen"
    )

    for ((language, label) in labels) {
      TranslatorInterfaceLanguage.set(app, language)
      val localized = TranslatorInterfaceLanguage.localizedContext(app)
      assertEquals(language, label, localized.getString(R.string.screen_translator_full_screen))
      assertEquals(appLocales, app.resources.configuration.locales)
    }
  }

  @Test fun configurationChangeRefreshesRunningWidgetAndNotificationInSystemMode() {
    RuntimeEnvironment.setQualifiers("en-rUS")
    val app = RuntimeEnvironment.getApplication()
    TranslatorInterfaceLanguage.set(app, "system")
    val serviceController = Robolectric.buildService(TranslatorService::class.java).create()
    val service = serviceController.get()
    val serviceClass = TranslatorService::class.java
    val notifications = service.getSystemService(NotificationManager::class.java)
    try {
      // Start the foreground UI without requesting screen-capture permission.
      serviceClass.getDeclaredField("instance").apply { isAccessible = true }.set(null, service)
      serviceClass.getDeclaredField("windowManager").apply { isAccessible = true }
        .set(service, service.getSystemService(Context.WINDOW_SERVICE))
      serviceClass.getDeclaredMethod("startForegroundWithNotification").apply { isAccessible = true }.invoke(service)
      serviceClass.getDeclaredMethod("showWidget").apply { isAccessible = true }.invoke(service)
      TranslatorService.isRunning = true
      val mainButton = serviceClass.getDeclaredField("mainButton").apply { isAccessible = true }.get(service) as View
      assertEquals("Lumo Lens translate button", mainButton.contentDescription)
      assertEquals("Lumo Lens is running", notifications.activeNotifications.single().notification.extras.getString(Notification.EXTRA_TITLE))

      RuntimeEnvironment.setQualifiers("vi-rVN")
      service.onConfigurationChanged(Configuration(Resources.getSystem().configuration))

      assertEquals("Nút dịch Lumo Lens", mainButton.contentDescription)
      assertEquals("Lumo Lens đang chạy", notifications.activeNotifications.single().notification.extras.getString(Notification.EXTRA_TITLE))
    } finally {
      serviceController.destroy()
    }
  }

  @Test fun refreshUpdatesExistingWidgetWithoutResettingTranslationConfig() {
    val serviceController = Robolectric.buildService(TranslatorService::class.java).create()
    val service = serviceController.get()
    val serviceClass = TranslatorService::class.java
    try {
      TranslatorInterfaceLanguage.set(service, "vi")
      serviceClass.getDeclaredField("windowManager").apply { isAccessible = true }
        .set(service, service.getSystemService(Context.WINDOW_SERVICE))
      serviceClass.getDeclaredMethod("showWidget").apply { isAccessible = true }.invoke(service)
      service.updateConfig("manga", "ja", "en", "test")
      val mainButton = serviceClass.getDeclaredField("mainButton").apply { isAccessible = true }.get(service) as View
      assertEquals("Nút dịch Lumo Lens", mainButton.contentDescription)

      TranslatorInterfaceLanguage.set(service, "en")
      service.refreshInterfaceLanguage()

      assertEquals("Lumo Lens translate button", mainButton.contentDescription)
      val build = serviceClass.getDeclaredMethod("buildTranslationRequest", List::class.java).apply { isAccessible = true }
      val request = build.invoke(service, listOf("こんにちは")) as org.json.JSONObject
      assertEquals("ja", request.getString("sourceLang"))
      assertEquals("en", request.getString("targetLang"))
      assertEquals("こんにちは", request.getJSONArray("texts").getString(0))
    } finally {
      serviceController.destroy()
    }
  }
}

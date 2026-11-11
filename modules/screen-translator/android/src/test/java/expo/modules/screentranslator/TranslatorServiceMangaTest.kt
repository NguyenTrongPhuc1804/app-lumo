package expo.modules.screentranslator

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TranslatorServiceMangaTest {
  private fun field(service: TranslatorService, name: String): java.lang.reflect.Field =
    TranslatorService::class.java.getDeclaredField(name).apply { isAccessible = true }

  @Test fun configurationChangeClearsHistoryAndInvalidatesWorkButIdenticalConfigDoesNot() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    val update = TranslatorService::class.java.getDeclaredMethod("updateConfig", String::class.java, String::class.java, String::class.java, String::class.java)
    update.invoke(service, "manga", "en", "vi", "test")
    val context = field(service, "mangaContext").get(service) as MangaContext
    context.append(listOf("Brother"), listOf("Anh"))
    val id = field(service, "workId").getLong(service)
    update.invoke(service, "manga", "en", "vi", "test")
    assertEquals(id, field(service, "workId").getLong(service))
    assertEquals(1, context.snapshot().size)
    update.invoke(service, "game", "en", "vi", "test")
    assertTrue(context.snapshot().isEmpty())
    assertTrue(field(service, "workId").getLong(service) > id)
    service.onDestroy()
  }

  @Test fun changingSourceReleasesIdleRecognizerAndDefersBusyRecognizerClose() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    var closed = 0
    val reader = java.lang.reflect.Proxy.newProxyInstance(javaClass.classLoader, arrayOf(com.google.mlkit.vision.text.TextRecognizer::class.java)) { _, method, _ ->
      when (method.name) { "close" -> { closed++; null }; "hashCode" -> 123; "equals" -> false; else -> null }
    } as com.google.mlkit.vision.text.TextRecognizer
    field(service, "recognizer").set(service, reader)
    service.updateConfig("manga", "ja", "vi", "test")
    assertNull(field(service, "recognizer").get(service))
    assertEquals(1, closed)
    service.onDestroy()
  }

  @Test fun storyConfirmationKeepsOrClearsHistoryWithoutDisablingAuto() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    field(service, "mode").set(service, "manga")
    TranslatorService::class.java.getDeclaredMethod("showWidget").apply { isAccessible = true }.invoke(service)
    val context = field(service, "mangaContext").get(service) as MangaContext
    (field(service, "autoState").get(service) as AutoTranslationState).start()
    context.append(listOf("Hi"), listOf("Chao"))
    val show = TranslatorService::class.java.getDeclaredMethod("showStoryConfirmation", String::class.java).apply { isAccessible = true }
    show.invoke(service, "new title")
    val keep = field(service, "keepStoryButton").get(service) as android.view.View
    keep.performClick()
    assertEquals(1, context.snapshot().size)
    show.invoke(service, "another title")
    val clear = field(service, "resetStoryButton").get(service) as android.view.View
    clear.performClick()
    assertTrue(context.snapshot().isEmpty())
    service.onDestroy()
  }

  @Test fun mangaClearButtonIsHiddenInGameAndVisibleInManga() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    TranslatorService::class.java.getDeclaredMethod("showWidget").apply { isAccessible = true }.invoke(service)
    val button = field(service, "clearContextButton").get(service) as android.view.View
    assertEquals(android.view.View.GONE, button.visibility)
    service.updateConfig("manga", "en", "vi", "test")
    assertEquals(android.view.View.VISIBLE, button.visibility)
    service.onDestroy()
  }

  @Test fun requestUsesSnapshotOnlyInMangaMode() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    field(service, "mode").set(service, "manga")
    val context = field(service, "mangaContext").get(service) as MangaContext
    context.append(listOf("Brother"), listOf("Anh"))
    val build = TranslatorService::class.java.getDeclaredMethod("buildTranslationRequest", List::class.java).apply { isAccessible = true }
    val manga = build.invoke(service, listOf("You")) as org.json.JSONObject
    assertEquals("Brother", manga.getJSONArray("context").getJSONArray(0).getJSONObject(0).getString("source"))
    field(service, "mode").set(service, "game")
    val game = build.invoke(service, listOf("You")) as org.json.JSONObject
    assertFalse(game.has("context"))
    service.onDestroy()
  }

  @Test fun clearKeepsAutoEnabledButInvalidatesOldGenerationAndHistory() {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    field(service, "windowManager").set(service, service.getSystemService("window"))
    field(service, "mode").set(service, "manga")
    val state = field(service, "autoState").get(service) as AutoTranslationState
    state.start()
    val generation = state.generation
    val context = field(service, "mangaContext").get(service) as MangaContext
    context.append(listOf("Hi"), listOf("Chao"))
    TranslatorService::class.java.getDeclaredMethod("clearMangaContext").apply { isAccessible = true }.invoke(service)
    assertTrue(state.enabled)
    assertFalse(state.isCurrent(generation))
    assertTrue(context.snapshot().isEmpty())
    service.onDestroy()
  }
}

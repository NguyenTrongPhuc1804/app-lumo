package expo.modules.screentranslator

import android.app.LocaleManager
import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import android.os.LocaleList
import java.util.Locale

internal object TranslatorInterfaceLanguage {
  private const val PREFS_NAME = "screen_translator_interface"
  private const val LANGUAGE_KEY = "language"
  private const val SYSTEM = "system"
  private const val FALLBACK = "en"
  private val supported = setOf("vi", "en", "zh", "ko", "ja", "fr")

  fun deviceLanguageTags(context: Context): List<String> {
    val systemLocales = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.getSystemService(LocaleManager::class.java)?.systemLocales
    } else {
      null
    } ?: Resources.getSystem().configuration.locales
    return (0 until systemLocales.size()).map { systemLocales[it].toLanguageTag() }
  }

  fun set(context: Context, language: String) {
    val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val choice = if (language == SYSTEM) SYSTEM else supportedLanguage(language) ?: FALLBACK
    if (preferences.getString(LANGUAGE_KEY, null) != choice) {
      preferences.edit().putString(LANGUAGE_KEY, choice).apply()
    }
  }

  fun localizedContext(context: Context): Context {
    val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val choice = preferences.getString(LANGUAGE_KEY, SYSTEM) ?: SYSTEM
    val language = if (choice == SYSTEM) {
      deviceLanguageTags(context).firstNotNullOfOrNull { supportedLanguage(it) } ?: FALLBACK
    } else {
      choice
    }
    val locale = Locale.forLanguageTag(if (language == "zh") "zh-Hans" else language)
    // Override only this module's resource lookup, not the app's locale list.
    val configuration = Configuration().apply { setLocales(LocaleList(locale)) }
    return context.createConfigurationContext(configuration)
  }

  private fun supportedLanguage(tag: String): String? =
    Locale.forLanguageTag(tag.trim().replace('_', '-')).language.takeIf { it in supported }
}

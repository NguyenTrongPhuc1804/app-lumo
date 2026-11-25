package expo.modules.screentranslator

import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions

internal object OnDeviceTranslation {
  private val models get() = RemoteModelManager.getInstance()

  private fun model(language: String): TranslateRemoteModel =
    TranslateRemoteModel.Builder(requireNotNull(TranslateLanguage.fromLanguageTag(language))).build()

  fun downloaded() = models.getDownloadedModels(TranslateRemoteModel::class.java)

  fun download(language: String) = models.download(model(language), DownloadConditions.Builder().build())

  fun delete(language: String) = models.deleteDownloadedModel(model(language))

  fun translate(texts: List<String>, source: String, target: String): List<String> {
    val options = TranslatorOptions.Builder()
      .setSourceLanguage(model(source).language)
      .setTargetLanguage(model(target).language)
      .build()
    return Translation.getClient(options).use { translator ->
      // Never trigger a download from the overlay. Only the pack manager does that.
      texts.map { text -> Tasks.await(translator.translate(text)) }
    }
  }
}

package expo.modules.screentranslator

import java.util.Locale

internal class StoryChangeDetector {
  private var current: String? = null
  private var candidate: String? = null
  private var observations = 0
  private val dismissed = mutableSetOf<String>()
  private val titlePattern = Regex("^(?:Tên truyện|Title|Series|作品名|书名|書名)\\s*[:：]\\s*(.{1,200})$", RegexOption.IGNORE_CASE)

  fun observe(texts: List<String>): String? {
    val title = texts.asSequence().flatMap { it.lineSequence() }
      .mapNotNull { titlePattern.matchEntire(it.trim())?.groupValues?.get(1) }
      .map { normalize(it) }.firstOrNull()
    if (title == null) {
      candidate = null
      observations = 0
      return null
    }
    if (title == candidate) observations++ else {
      candidate = title
      observations = 1
    }
    if (observations < 2) return null
    if (current == null) current = title
    return title.takeIf { it != current && it !in dismissed }
  }

  fun accept(title: String) {
    current = normalize(title)
    candidate = null
    observations = 0
  }

  fun dismiss(title: String) {
    dismissed.add(normalize(title))
  }

  fun clear() {
    current = null
    candidate = null
    observations = 0
    dismissed.clear()
  }

  private fun normalize(title: String): String = title.trim().replace(Regex("\\s+"), " ").lowercase(Locale.ROOT)
}

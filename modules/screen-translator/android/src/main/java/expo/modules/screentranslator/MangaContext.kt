package expo.modules.screentranslator

internal data class ContextPair(val source: String, val translation: String)

// Owned by the service main thread. Network workers receive a snapshot only.
internal class MangaContext {
  private val turns = mutableListOf<List<ContextPair>>()

  fun snapshot(): List<List<ContextPair>> = turns.map { it.toList() }

  fun append(texts: List<String>, translations: List<String>) {
    require(texts.size == translations.size)
    val existing = turns.flatten().toSet()
    val pairs = texts.indices.map { ContextPair(texts[it], translations[it]) }
      .distinct().filter { it !in existing }
    val retained = mutableListOf<ContextPair>()
    var characters = 0
    for (pair in pairs.asReversed()) {
      val length = pair.source.length + pair.translation.length
      if (length > 6000) continue
      if (characters + length > 6000) break
      retained.add(0, pair)
      characters += length
    }
    if (retained.isEmpty()) return
    turns.add(retained)
    while (turns.size > 3 || turns.sumOf { turn -> turn.sumOf { it.source.length + it.translation.length } } > 6000) {
      turns.removeAt(0)
    }
  }

  fun clear() {
    turns.clear()
  }
}

package expo.modules.screentranslator

import org.junit.Assert.*
import org.junit.Test

class MangaContextTest {
  @Test fun keepsOnlyThreeLatestTurns() {
    val context = MangaContext()
    for (i in 1..4) context.append(listOf("source$i"), listOf("translated$i"))
    assertEquals(listOf("source2", "source3", "source4"), context.snapshot().map { it.single().source })
  }

  @Test fun evictsOldestTurnWhenCharacterBudgetIsExceeded() {
    val context = MangaContext()
    context.append(listOf("a".repeat(2000)), listOf("b".repeat(2000)))
    context.append(listOf("c".repeat(1000)), listOf("d".repeat(1000)))
    assertEquals(2, context.snapshot().size)
    context.append(listOf("e"), listOf("f"))
    assertEquals(listOf("c".repeat(1000), "e"), context.snapshot().map { it.single().source })
  }

  @Test fun duplicatesDoNotAddTurnsAndSnapshotSurvivesClear() {
    val context = MangaContext()
    context.append(listOf("Hello"), listOf("Chao"))
    val before = context.snapshot()
    context.append(listOf("Hello"), listOf("Chao"))
    assertEquals(1, context.snapshot().size)
    context.clear()
    assertTrue(context.snapshot().isEmpty())
    assertEquals("Hello", before.single().single().source)
  }

  @Test fun oversizedTurnKeepsWholePairsFromEndWithoutSplittingEmoji() {
    val context = MangaContext()
    context.append(listOf("x".repeat(6001), "old", "😀"), listOf("large", "cu", "vui"))
    assertEquals(listOf("old", "😀"), context.snapshot().single().map { it.source })
  }

  @Test fun emptyTranslationsAreNotStoredAndRepeatedSourceDoesNotInflateHistory() {
    val context = MangaContext()
    context.append(listOf("Hello", "mark"), listOf("Chao", ""))
    context.append(listOf("Hello"), listOf("Xin chao"))
    assertEquals(1, context.snapshot().size)
    assertEquals(listOf(ContextPair("Hello", "Chao")), context.snapshot().single())
  }

  @Test fun rejectsMismatchedTranslationCounts() {
    val context = MangaContext()
    assertThrows(IllegalArgumentException::class.java) { context.append(listOf("a"), emptyList()) }
    assertTrue(context.snapshot().isEmpty())
  }
}

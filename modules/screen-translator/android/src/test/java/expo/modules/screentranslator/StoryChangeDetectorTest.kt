package expo.modules.screentranslator

import org.junit.Assert.*
import org.junit.Test

class StoryChangeDetectorTest {
  @Test fun newExplicitTitleNeedsTwoConsecutiveObservations() {
    val detector = StoryChangeDetector()
    assertNull(detector.observe(listOf("Title: First")))
    assertNull(detector.observe(listOf("Title: First")))
    assertNull(detector.observe(listOf("Title: Second")))
    assertEquals("second", detector.observe(listOf("Title: Second")))
  }

  @Test fun chapterAndOrdinaryTextDoNotSuggestChange() {
    val detector = StoryChangeDetector()
    detector.observe(listOf("Title: First"))
    detector.observe(listOf("Title: First"))
    repeat(3) { assertNull(detector.observe(listOf("Chapter 2", "Another character"))) }
    assertNull(detector.observe(listOf("Title: Second")))
    assertNull(detector.observe(listOf("Dialogue")))
    assertNull(detector.observe(listOf("Title: Second")))
  }

  @Test fun dismissSuppressesSameTitleAndClearStartsNewSession() {
    val detector = StoryChangeDetector()
    detector.accept("first")
    detector.observe(listOf("Tên truyện: Second"))
    assertEquals("second", detector.observe(listOf("Tên truyện: Second")))
    detector.dismiss("second")
    repeat(3) { assertNull(detector.observe(listOf("Title: SECOND"))) }
    detector.clear()
    assertNull(detector.observe(listOf("Title: Second")))
    assertNull(detector.observe(listOf("Title: Second")))
  }
}

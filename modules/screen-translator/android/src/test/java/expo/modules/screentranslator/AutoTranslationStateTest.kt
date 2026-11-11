package expo.modules.screentranslator

import org.junit.Assert.*
import org.junit.Test

class AutoTranslationStateTest {
  @Test fun interactionInvalidatesOldWorkAndCoalescesPendingRequest() {
    val state = AutoTranslationState()
    state.start()
    val old = state.generation
    assertTrue(state.takePending())
    state.interact()
    state.interact()
    assertFalse(state.isCurrent(old))
    assertTrue(state.takePending())
    assertFalse(state.takePending())
  }

  @Test fun stoppedAndRestartedSessionRejectsOldCallbacks() {
    val state = AutoTranslationState()
    state.start()
    val old = state.generation
    state.stop()
    assertFalse(state.takePending())
    assertFalse(state.isCurrent(old))
    state.start()
    assertFalse(state.isCurrent(old))
  }

  @Test fun onlySuccessfulCurrentResultCommitsContentKey() {
    val state = AutoTranslationState()
    state.start()
    val old = state.generation
    assertTrue(state.shouldTranslate("hello"))
    state.interact()
    state.commit(old, "hello")
    assertTrue(state.shouldTranslate("hello"))
    state.commit(state.generation, "hello")
    assertFalse(state.shouldTranslate("hello"))
    state.stop()
    state.start()
    assertTrue(state.shouldTranslate("hello"))
  }

  @Test fun cachedContentCanBeDrawnAgainAfterTouchWithoutAnotherRequest() {
    val state = AutoTranslationState()
    state.start()
    state.commit(state.generation, "hello@0,0")
    state.interact()
    assertFalse(state.shouldTranslate("hello@0,0"))
    assertTrue(state.shouldTranslate("hello@0,100"))
  }
}

# SDD ledger — plan: docs/superpowers/plans/2026-11-11-auto-translation-gaminik.md

Baseline: npm test 14/14 passed; mobile repository main was clean; user chose current-directory feature branch feat/auto-translation-interaction.
Ruling: Use current checkout feature branch rather than linked worktree — explicit user choice — unrelated future edits share this directory.
Ruling: Plan/spec authority is the user-approved conversation; saved condensed implementation plan — original was not saved in Ask mode — omitted details must resolve against conversation.
Pre-flight: Tasks 1-4 share generation ownership, pending interaction and finish semantics; service owns busy lifetime and state owns auto/content decisions.
Task 1: complete — missing state RED; state tests GREEN (4 tests).
Tasks 2-3: complete — service flags/state/destroy tests RED (3 failures), then native suite GREEN.
Task 4: partial — native tests 17/17 GREEN; native module assembleRelease passed; npm test 14/14; no IDE lints. Full APK/device scenarios not run. Expo prebuild reported EBUSY; existing Gradle project remained usable.
Task 5: fresh-context review 091c5bdc-72c1-46ba-95ec-95007fb85aaf found opacity and rotation defects. Both reproduced as failing tests; fixed; suite 17/17 GREEN and release AAR build passed.
Final: Ruling: retain widget during auto capture to keep stop/outside-touch available — watcher cannot work while invisible — small widget may appear in captured image.
Final: Ruling: stable sampling is bounded to 10 retries and then waits for another interaction — avoid unbounded background work — continuous motion can leave no translation until next touch.
Final: Ruling: no automatic git commit or full APK/device launch in this pass — leave changes inspectable and avoid interrupting user's running Android workflow — device acceptance remains outstanding.
Final: minor (deferred): cropped widget region is not masked from OCR; can add spurious short text.
Final: minor (deferred): existing deprecated Android API/compiler warnings remain.
Final verification: gradlew :screen-translator:testDebugUnitTest :screen-translator:assembleRelease BUILD SUCCESSFUL; 17 tests zero failures/errors. No full HTTP/ML Kit instrumented scenario exercised.
Ruling: Reuse widget window for WATCH_OUTSIDE_TOUCH rather than invisible watcher — avoids invisible touch-consuming surface — outside reporting and Android 15 pass-through still require device testing.
Ruling: Add bounded stable-frame comparison after interaction, not claim ACTION_UP detection — outside touch has no release signal — long gestures exceeding the sampling window can require another touch.
Ruling: ML Kit dependency upgrades are excluded without evidence of a compatible version; lazy initialization and safe cleanup are included — avoid speculative version change — upstream ML Kit initialization failure may still be reported instead of fixed.

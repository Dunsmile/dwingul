# V17 typing statistics review

## Findings

### [P1] Server replay permits arbitrarily inflated CPM through zero-time draft oscillation

`rpg-store.js:96-102` accepts as many as 50,000 `draft` actions, permits equal timestamps, and applies only a lower-bound human-input check based on completed/correct combat characters. Each accepted draft is replayed through `captureDraft` (`rpg-store.js:99`), which adds newly introduced stroke tokens (`typing-rpg.js:273-277`, `typing-stats.js:48-54`). Consequently, a client can alternate a 100-character draft and an empty draft thousands of times at timestamp 0, then submit an otherwise valid run. The authoritative response reports the fabricated stroke count and CPM because the replay has no upper event/stroke rate or monotonic edit revision constraint.

Local reproduction pattern:

```js
const model = createTypingRpgModel({phrases:['한글']});
for (let i=0; i<1000; i++) {
  model.captureDraft('가'.repeat(100));
  model.captureDraft('');
}
model.tick(190000);
// typingStats.strokes === 300000, despite every draft sharing elapsed time 0.
```

The 2 MB request limit reduces the maximum action count but does not restore measurement integrity. Validate a conservative maximum equivalent-stroke rate between action timestamps during server replay, including the initial timestamp, or record trusted timing/revisions in a way that rejects impossible zero-time alternation. Keep the limit broad enough for IME replacement bursts and paste/accessibility input.

### [P2] A real repeated wrong attempt can be mistaken for held Enter after an intervening edit

`typing-stats.js:46,57-63` deduplicates only the pair `[promptNumber, submittedText]`. Draft edits do not invalidate `lastSubmission`. If the player submits `바다` for target `바람`, edits it to `바림`, edits back to `바다`, and presses Enter again, the second confirmed attempt is omitted even though the input changed between submissions. This conflicts with the requested rule that confirmed wrong attempts reduce accuracy; only unchanged held-Enter repeats should be ignored.

Reproduced locally through the public input boundary:

```js
input.edit('바다'); input.submit();
input.edit('바림'); input.edit('바다'); input.submit();
// actions contain two `confirm` entries, but typingStats.submissions remains 1.
```

Track a draft/input revision and deduplicate only when both submission key and revision are unchanged. Composition-end duplicates that produce no edit should retain the same revision, preserving the held-Enter/duplicate-IME guard.

## Reviewed behavior that held

- NFC/NFD and compatibility/modern jamo probes match the requested examples: `한=3`, `닭=4`, `꽃=4`, with shifted double initials/vowels and compound finals counted as equivalent two-beolsik strokes.
- Draft corrections affect stroke count but do not enter the accuracy denominator until confirmation.
- `confirmInput` records and judges the whole text before combat processing, so a lethal wrong confirmation remains present in replay and accuracy.
- Browser `confirm` actions replay atomically on the server without duplicating their internal `commitInput`/`submit` operations.
- Empty input, healing commands, composition-confirm Enter, and immediate unchanged Enter repeats do not add accuracy submissions.
- Active time comes from the model tick, so outer pause handling does not add time; model time also stops at death.
- Edit-distance work is bounded by the 100-character input limit and short/long phrase sizes; no material per-submission performance issue was found.
- Result HTML derives from bounded numeric server-replayed fields. No direct HTML injection path was found in the statistics renderer.

Review was read-only apart from this report. Local model probes only; no server, persistent database, production endpoint, or port 4173 was used.

## Resolution verification

### P2 resolved

Verified in `typing-stats.js:48-57`: a token-changing edit clears the last-submission marker, while an identical edit leaves it intact; resetting the draft also clears it. The focused regression submits `바다`, edits through `바림` back to `바다`, and now records two submissions/two errors, while immediate unchanged Enter repeats remain deduplicated. The focused V17/IME/API compatibility set passed 18/18.

### P1 partially resolved; legacy action bypass remains

The new token bucket in `rpg-store.js:99-109` correctly limits logs containing `draft` or `confirm`, and the added zero-time modern-log rejection test passes. However, `measuredInput` is chosen solely by whether either of those action names appears. A caller can submit only legacy `input`/`clear` actions for a newly created run. Those actions still call `commitInput`/`clearInput`, increase V17 strokes, and receive no token-bucket check. The existing lower-bound check does not prevent inflation because the caller can provide sufficient trailing elapsed time.

Confirmed through a memory-only API probe on a new run: 10,000 zero-time repetitions of a correct first character followed by `clear` produced 20,000 actions, 20,000 equivalent strokes, and 6,000 CPM at 200 seconds. `/api/rpg/progress` returned status 200. This is the same measurement-integrity issue through the legacy compatibility route.

The guard needs to distinguish runs created before measured logs existed, rather than trusting action vocabulary supplied by the client. If persisted run metadata cannot identify legacy clients, apply a broad rate bound to stroke changes from `input` actions too; the 512 initial capacity and 80 strokes/second refill already leave ample compatibility room for ordinary legacy play.

### Final verification: P1 resolved

The `measuredInput` branch was removed. `rpg-store.js:101-108` now applies the same 512-stroke initial/capped budget and 80-strokes/second refill to every replayed action stream, including legacy `input`/`clear` logs. The API regression covers both modern `draft`/`confirm` oscillation and legacy `input`/`clear` oscillation; both now return 400 with the fast-input error.

Focused verification passed 25/25 across V17 statistics/API, Korean IME and HP behavior, legacy V5 RPG replay, and short/long mode API flows. Combined with the earlier P2 verification, both review findings are closed. No further issue was found within the requested fix scope.

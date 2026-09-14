# V11 RPG handoff

## Implemented behavior

- Added a fixed 16-character woodland collection in `public/js/rpg-characters.js`. Indexes `0..15` match the existing 4×4 `woodland-pets` sheet and the final illustrated files at `/assets/pixel/illustrated/personas/{index}.png`.
- The first character, `leaf-cloak-traveler`, is implicitly owned by every profile and costs no gold. The remaining price tiers are 150, 300, 600, and 1,000 gold. Character records contain only identity, display name, collection tier, price, and artwork index; they have no combat fields.
- Added 25 fixed monster names matching the final asset index semantics. Every stage uses `((stage - 1) % 25) + 1` for `/assets/pixel/illustrated/monsters/{01..25}.png`. Bosses keep the same deterministic stage and rules, with a visible crown and boss label.
- Added a fourth `캐릭터` tab to the typing hub. It displays owned state, collection tier, cost, affordability, and current selection. The play tab identifies the selected character.
- Inventory and codex cards request `/assets/pixel/illustrated/items/{itemId}.png` and retain the current SVG as a local fallback.
- Combat renders the selected character portrait. The visible HUD now contains HP, MP, stage, gold, enemy HP/countdown, target, input, and attack. Combo, speed, accuracy, kill count, completed phrases, and equipment totals are inside a closed `전투 상세 보기` disclosure.
- Model, scoring, gold earning, gear effects, replay data, and `typing-rpg-v5` version are unchanged.

## Storage and API

`rpg_profiles` gains:

```sql
selected_character TEXT NOT NULL DEFAULT 'leaf-cloak-traveler'
```

The new ownership table is:

```sql
CREATE TABLE rpg_characters(
  user_id TEXT REFERENCES users(id),
  character_id TEXT NOT NULL,
  purchased_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, character_id)
);
```

The default character is implicit and does not require a row. Legacy profiles therefore migrate without a purchase insert or gold change. `profile()` adds `selectedCharacter` and ordered `ownedCharacters`. An invalid or no-longer-owned saved selection resolves to the default in API and run settings.

`purchaseCharacter(user, {characterId})` uses the shared `atomic()` helper. It checks ownership before the debit, inserts the unique ownership row, and deducts the fixed catalogue price in the same transaction. A retry returns `purchase: {characterId, charged: 0, alreadyOwned: true}` without another charge. `equipCharacter` is also atomic and accepts only the default or a stored ownership row.

The shared routes integrated by the root agent are:

```js
POST /api/rpg/character/purchase {characterId}
POST /api/rpg/character/equip {characterId}
```

Both return the full RPG profile. `settings()` includes cosmetic `characterId`; challenge settings still zero all gear and therefore preserve fairness.

Snapshot export/import must keep `rpg_characters` after `rpg_profiles`. Recovery and launch transfer rotate credentials while retaining the original `users.id`, so character ownership needs no user-ID remap. The isolated API test covers PIN recovery and a server restart with the selected character, ownership, gold, and gear intact.

## Shared integration already reviewed

- `server/api.js` routes call `purchaseCharacter` and `equipCharacter` with the request body.
- `public/js/app.js` reads `data-character`, replaces `rpgState` with the returned profile, and uses `purchase.charged` for the success message.
- The run context preserves `run.gameSettings.characterId` so the selected portrait reaches `createTypingRpg`.
- `workers/import-snapshot.js` includes `rpg_characters` after profiles.

The draw reveal still reads `item.image`, which points to the legacy SVG catalogue. If illustrated equipment must appear in the reveal dialog as well, `rpg-draw-dialog.js` should request `/assets/pixel/illustrated/items/${item.id}.png` and swap to `item.image` on an error.

## Verification

- `node --test tests/rpg-v11-api.test.mjs tests/rpg-v11-characters.test.mjs tests/rpg-v11-ui.test.mjs` — 9 passed.
- Existing RPG and replay regressions: `rpg-v9-items`, `rpg-v9-store`, `rpg-v9-ui`, `game-v5`, and `game-v6` — 22 passed.
- `node tests/rpg-v11-browser.mjs` against isolated port 4174 — passed at 390×844 and 320×700. It verifies 16 collection cards, purchase/equip app events, no horizontal overflow, selected hero path, species 25 path, closed extra stats, compact essential HUD, and a real typed attack.
- Official `web_game_playwright_client.js` started a stage-one run, sent Enter, captured a valid `render_game_to_text` state, and produced `/tmp/v11-rpg-official-20260914/shot-0.png`.
- Review screenshots: `/tmp/v11-rpg-characters-390.png`, `/tmp/v11-rpg-characters-320.png`, and `/tmp/v11-rpg-battle-390.png`.

At the time of this module check, the final illustrated persona, monster, and item PNG directories had not yet been written. Runtime fallbacks rendered successfully; the official client recorded the expected 404s for the two pending illustrated battle assets. Repeat the browser/client run after the root asset generator writes those files, and update the old v10 browser assertion that expects a boss SVG source to accept the illustrated monster PNG.

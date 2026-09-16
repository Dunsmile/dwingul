# Profile login and ranking administrator implementation plan

> Execution: existing user approval covers implementation and deployment. Main agent implements; a bounded independent reviewer checks authentication and permissions before release.

**Goal:** Stable nickname/password login across browsers, safe legacy upgrade, and a separately provisioned administrator who can remove ranking records.

**Architecture:** Add an isolated server authentication module using the existing salted password hashes, a unique normalized login-name table, expiring multi-browser sessions, persistent throttling, and server-only administrator bootstrap. Preserve legacy browser ownership and recovery; legacy PINs never become remotely guessable nickname logins. Public profile creation cannot assign roles. Moderator routes return public ranking fields only, require administrator identity and password confirmation for deletion, and log a minimal deletion audit. No automatic merging of ambiguous old identities.

**Stack:** Existing Node/Cloudflare Durable Object SQLite, vanilla JavaScript, Playwright Chromium/WebKit.

## 1. Server ownership and credential rules
- [ ] Add failing isolated API tests for nickname/password login, conflicts, legacy upgrade/recovery, role spoofing, wrong credentials and session isolation.
- [ ] Implement `server/auth.js`, integrate `server/api.js`, local server and Worker configuration. New credentials 15–64 characters; existing PINs retained only for legacy recovery/upgrade.
- [ ] Add owner-only password change, logout, recovery-code rotation. Preserve older browser sessions on normal login; revoke all on password/recovery changes.
- [ ] Persist login throttles and avoid storing raw passwords/tokens in audit or response data.

## 2. Administrator
- [ ] Add failing tests for unauthorized reads/deletes, administrator confirmation and record-only deletion with audit.
- [ ] Provision a reserved nickname with strong random temporary password via Cloudflare secret bootstrap; never put credentials in Git or delivered assets. Require password change before moderation.
- [ ] Add paginated nickname/game search, record preview, deletion reason and password confirmation, audit view. Deleting a record removes its world/local/friend links, not user inventory or profile.

## 3. User experience
- [ ] Split login/create/recovery paths; show old-browser credential upgrade without losing records.
- [ ] Display login status, logout/password settings, and administrator-only management navigation.
- [ ] Handle duplicate old names explicitly; claim a new unique login name after proving original profile ownership. Do not silently merge old records.
- [ ] Preserve guest gameplay; do not attach one browser's pending history to a different signed-in account.
- [ ] Update recovery/delete dialogs and policy text to match behavior.

## 4. Verification and release
- [ ] Meaningful API tests plus existing suite; browser registration/login across contexts, legacy upgrade, admin/non-admin pages, mobile layout and deletion confirmation.
- [ ] Independent security review, fix findings; build and inspect public bundle for credential leakage.
- [ ] Deploy with existing authorization; production read-only checks and administrator login/password setup without deleting real records.
- [ ] Record release and private credential delivery instructions.

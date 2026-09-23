# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"マヤ暦占い" (Maya Calendar Fortune-Telling) — a Nuxt 3 site that calculates a visitor's KIN from their birthdate and reveals an increasingly deep reading behind a paywall. Requirements are documented in Japanese at [docs/要件定義.md](docs/要件定義.md); `docs/参考画像.png` and [mockup/maya-mockup.html](mockup/maya-mockup.html) are visual references for the target design (a static HTML mockup covering the free/paid views and the admin console — not wired to the app, but the source of truth for styling intent).

**Current state: the KIN diagnosis, its CMS content, signup/login, member statuses, the purchase-plan page and the admin console are all real and Firestore-backed. Payment (Stripe) is the only thing still not implemented** — see "Payment roadmap (Phase 2)" at the end for the agreed design.

The paid area is unlocked by **being a signed-in member who has not been suspended**. Registering is enough; there is nothing to pay yet. See "Member status and the paid-area gate" below; the decision is centralised in [composables/useEntitlement.ts](composables/useEntitlement.ts) so that introducing payment later is a change there plus one in [firestore.rules](firestore.rules).

**Membership tiers are already modelled for payment** (2026-09-17): 無料会員 / チーム会員 / 有料会員 / 利用停止 (チーム会員 was called 有料会員(紹介) until 2026-09-17 — renamed because those members don't pay). A member who belongs to a team (joined with a referral code, or added by an admin) is **チーム会員** for as long as they stay in the team. Today that label changes nothing about access — every non-suspended member can already read the paid area — but it is what Phase 2 will gate on.

Real and Firestore-backed: the diagnosis, 相性診断 ([pages/compatibility.vue](pages/compatibility.vue)), the per-seal and per-KIN detail pages ([pages/kin/[sealIndex].vue](pages/kin/%5BsealIndex%5D.vue), [pages/kin/[kin]/detail.vue](pages/kin/%5Bkin%5D/detail.vue)), the CMS ([pages/admin/content/**](pages/admin/content)), 診断履歴 ([pages/admin/history/index.vue](pages/admin/history/index.vue)), チーム管理 ([pages/admin/teams/**](pages/admin/teams)), ユーザー管理 ([pages/admin/users.vue](pages/admin/users.vue)) and 紹介コード入力 ([pages/account.vue](pages/account.vue)).

Still a mock: [pages/admin/index.vue](pages/admin/index.vue) (dashboard stats, hardcoded `ref()` arrays). The old `/checkout` prototype and its `localStorage`-only `useMembership` flag were deleted on 2026-09-17; [pages/plans.vue](pages/plans.vue) replaced them.

デイサイン/トレセーナ/古代マヤ暦全書 are not displayed anywhere in the current UI. `/admin/**` requires a Firebase Auth session carrying an `admin: true` custom claim, enforced by both a client-side route guard and [firestore.rules](firestore.rules) itself — see "Admin authentication" below.

**The app is a fully static SPA (`ssr: false`) with no server at all** — deployed to Firebase Hosting's free "Spark" plan, not Cloud Functions (which require the paid "Blaze" plan). There is no `server/` directory; every read/write goes directly from the browser to Firestore/Firebase Auth, authorized by Firestore Security Rules and Firebase Auth custom claims rather than any backend code. See "Deployment" below.

## Commands

```bash
npm run dev                    # ONE command for local dev — see below, this does everything
npm run generate                # production build (fully static — outputs .output/public only, no server). This is the deploy build; `firebase deploy` after this.
npm run build                  # same Nitro build, non-static-optimized — mainly useful with `npm run preview` for a quick local smoke test
npm run preview                # preview a build

npm run dev:nuxt                # just the Nuxt dev server, no emulator orchestration (assumes Firestore emulator already reachable at 127.0.0.1:8080)
npm run emulators               # just the Firebase Local Emulator Suite (Firestore + Auth + Hosting), data persisted to .firebase-emulator-data/ across restarts
npm run seed:characters:emulator   # seed the diagnosisContent collection into the emulator (no credentials needed) — see seed:tones/seed:kins/seed:celebrities for the rest
npm run seed:characters            # seed the REAL Firestore project instead — requires FIREBASE_SERVICE_ACCOUNT_KEY in .env
npm run admin:create:emulator -- --email=you@example.com --password=xxxx   # create/promote an admin login in the emulator (no credentials needed) — see "Admin authentication"
npm run admin:create -- --email=you@example.com --password=xxxx            # same, against the REAL project — requires FIREBASE_SERVICE_ACCOUNT_KEY in .env

npm run verify:kin                 # dateToKin() が mayadan.jp と一致するかの検証。単体で動く(エミュレータ不要)
npm run verify:compatibility       # 相性診断の判定が mayadan.jp の相性診断と一致するかの検証(エミュレータ不要)
npm run verify:rules:emulator      # firestore.rules の検証(29項目)。エミュレータ起動中に実行する — 下記参照
npm run migrate:premium:emulator   # 有料項目を diagnosisContentPremium へ切り出す移行。--dry-run で件数だけ確認できる
npm run migrate:premium            # 同上、REAL project に対して。リリース時に一度だけ実行する(冪等)
npm run backfill:public-teams:emulator  # 既存チームぶんの publicTeams を作る(冪等、--dry-run 可)
npm run backfill:public-teams           # 同上、REAL project に対して。publicTeams 導入時に一度だけ
```

No linter or formatter is configured in this repo. There are two automated checks:

`npm run verify:kin` ([scripts/verifyMayaCalc.ts](scripts/verifyMayaCalc.ts)) asserts `dateToKin()` against values read
off mayadan.jp, and sweeps 1900–2050 for日ごとの進み方. It also checks that `relationSealIndices()` / `destinyKins()`
agree with `kinInfo()` for all 260 KINs. It needs nothing running.
**Run it after touching `utils/mayaCalc.ts`** — a wrong KIN is silently wrong, every reading on the
site derives from it, and this file has already shipped two different leap-year bugs.

`npm run verify:rules:emulator` ([scripts/verifyReferralRules.ts](scripts/verifyReferralRules.ts)) drives the raw
Firebase SDKs against the emulator and asserts what [firestore.rules](firestore.rules) does and doesn't allow.
**Run it after touching `firestore.rules`.** This app has no server, so those rules are the only
thing standing between a visitor and the paid content / other people's PII; a mistake there is
invisible in the UI. Start the emulators in another shell first (`npm run dev` or `npm run emulators`).

Two historical migration scripts, [scripts/migrateBulletFields.ts](scripts/migrateBulletFields.ts) and
[scripts/backfillCautionSplit.ts](scripts/backfillCautionSplit.ts), now **refuse to run**. They were written when the
premium fields still lived in `diagnosisContent`, and running them today would write those fields
back into the world-readable collection — silently re-publishing the paid content. They're kept
only as a record of what those migrations did.

### `npm run dev` is a one-command orchestrator, not just `nuxt dev`

It's [scripts/dev.mjs](scripts/dev.mjs), which: starts the Firebase emulators (Firestore/Auth/Hosting) unless one's already reachable at `127.0.0.1:8080` (in which case it reuses that one and won't touch its lifecycle) → waits for Firestore to respond → runs the four seed scripts in order — `seed:characters` / `seed:tones` / `seed:kins` / `seed:celebrities`, all idempotent and skipping docs that are already seeded, so this is safe on every start → starts `nuxt dev`. On Ctrl-C (SIGINT/SIGTERM) it stops whatever it itself started — including the Nuxt dev server, which is *always* its own to stop — and waits for the emulator's own `--export-on-exit` to actually finish (so `.firebase-emulator-data/` stays current) before exiting; a reused, externally-started emulator is left running. Each spawned child (`npm run emulators` / the `seed:*:emulator` scripts / `npm run dev:nuxt` — same scripts as above, not duplicated commands) runs `detached: true` in its own process group specifically so this shutdown can reliably signal every descendant (npm → firebase-tools → java, or npm → nuxt) with one `process.kill(-pid, 'SIGINT')`, regardless of how many wrapper layers are in between — plain `child.kill()` only reaches the immediate child, which isn't enough here.

Requires a JRE on PATH (the Firestore emulator is Java-based) — `brew install openjdk` if missing; it's keg-only, so either symlink it or export `PATH="/opt/homebrew/opt/openjdk/bin:$PATH"` before running `npm run dev`/`npm run emulators`. `scripts/dev.mjs` checks for this upfront (only when it's the one starting the emulator) and fails fast with that exact instruction if Java is missing, rather than surfacing firebase-tools' own less obvious error.

- [plugins/firebase.client.ts](plugins/firebase.client.ts) calls `connectFirestoreEmulator(firestore, '127.0.0.1', 8080)` and `connectAuthEmulator(auth, 'http://127.0.0.1:9099')` whenever `import.meta.dev` is true — the client SDK never talks to the real project during `npm run dev`. The seed scripts similarly default to their `:emulator` targets via the `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` env vars set in their respective `npm run *:emulator` script definitions — no real service account is needed locally; `FIREBASE_SERVICE_ACCOUNT_KEY` is only required for the non-`:emulator` variants (real project / production).
- Port 5000 (Hosting emulator default) collides with macOS AirPlay Receiver, hence `firebase.json`'s `emulators.hosting.port` is set to `5050` instead.
- **Only Firestore is persisted across restarts, not Auth.** `.firebase-emulator-data/` contains a
  `firestore_export` but no `auth_export`, so every emulator restart loses all local accounts —
  re-run `npm run admin:create:emulator` and re-register any test members. Firestore data (seeded
  content, teams, users docs) survives. Note this also means a `users/{uid}` document can outlive
  the Auth account it belonged to locally.
- `npm run dev` imports `.firebase-emulator-data/`, and the seed scripts **skip documents that
  already exist**. So if that snapshot predates the premium split, seeding will not fix it — run
  `npm run migrate:premium:emulator` once after starting, or the paid sections silently render
  empty (`premiumCharCount` missing ⇒ LockedVeil not shown at all).

## Architecture

### Diagnosis pipeline
`birthdate` → [utils/mayaCalc.ts](utils/mayaCalc.ts) → [utils/mayaData.ts](utils/mayaData.ts) → [composables/useDiagnosis.ts](composables/useDiagnosis.ts) (+ [composables/useDiagnosisContent.ts](composables/useDiagnosisContent.ts) for DB text) → [pages/result.vue](pages/result.vue).

- `mayaCalc.ts`'s `dateToKin()` replicates the "KIN早見表" (quick-reference table) method, **not** a
  Dreamspell/GMT astronomical correlation. **The reference implementation is https://mayadan.jp/** —
  the same site this project's KIN readings and relation formulas come from. It advances the KIN base
  by exactly 365 days per calendar year (never 366), adds a fixed per-month offset from a **non-leap**
  day table, and adds the day of month. **There is no leap-year correction and no special case for
  February 29** — both fall out of the table on their own (2/29 → 31+29 = 60, 3/1 → 59+1 = 60, so
  Feb 29 lands on the same KIN as March 1, which is what mayadan.jp returns). Every date after Feb 29
  in a leap year therefore sits one behind a true continuous day count; that is inherent to the
  早見表 method, not a bug. Run `npm run verify:kin` after touching the constants
  (`REFERENCE_YEAR`/`REFERENCE_JAN_VALUE`/`YEAR_STEP`/`CUMULATIVE_DAYS_BEFORE_MONTH`).
  **Do not add a leap correction back from another site's worked examples.** unkoi.com publishes a
  table that disagrees with mayadan.jp (e.g. 1964-03-05 → KIN77 there, KIN76 on mayadan.jp), and
  following it is exactly how this file carried a wrong +1 for leap-year March until 2026-09-09.
- `kinInfo()` derives `sealIndex` (0–19, one of 20 day-signs/紋章), `toneIndex` (0–12, one of 13 galactic tones/音), `wavespellSealIndex` (the seal opening the current 13-day wavespell), and `occultSealIndex` (`sealIndex + 10`, the "hidden power" counterpart seal) — these are universal mod-20/mod-13 relationships independent of the date→KIN correlation, so they didn't need to change when the correlation was fixed.
- `mayaData.ts` holds the static *structural* tables: `SEALS` (20 day-signs with name/english/keyword/essence) and `TONES` (13 tones), plus `sealColor()` mapping a seal index to its 4-color cycle (red/white/blue/yellow) used for glyph styling. `SEALS[i].essence`/`TONES[i].keyword` are also the seed source for Firestore content (see below) — treat them as the canonical names/keywords, but not as the editable body copy anymore.
- `useDiagnosis(input)` combines a birth KIN and today's KIN into the reading sections shown on the result page: `sun` (太陽の紋章, birth seal), `wavespell` (ウェイブスペル, potential), `tone` (銀河の音, birth tone), `daysign` (デイサイン, hidden pattern — `occultSealIndex`), and `tresena` (トレセーナ, current 13-day cycle based on *today's* date, not birthdate). Each of `sun`/`wavespell`/`tone` carries a hardcoded `.text` template string that now serves only as the **fallback** shown before/without Firestore content — see below.

### Other reading pages
- **相性診断** ([pages/compatibility.vue](pages/compatibility.vue), [composables/useCompatibility.ts](composables/useCompatibility.ts)) — free, no gate.
  Self plus up to `MAX_OTHER_PEOPLE` (6) others; six slots are rendered up front rather than behind an
  "add" button. Untouched slots are excluded by "name entered **or** birthdate moved off the default",
  because `BirthdateSelect` always fills a default and so can never be empty — the known cost is that
  an anonymous person born exactly on `DEFAULT_BIRTHDATE` must type at least one character.
  The form always starts empty — result.vue's CTA no longer passes name/birth/gender (removed 2026-09-17 on request).
  **Results cover every pair of participants** (自分×A, 自分×B, A×B …), and each pair shows both directions,
  because the relations are directional. **The relations replicate mayadan.jp's 相性診断**
  (https://mayadan.jp/congeniality/result), established by submitting real birthdates there — see
  [utils/compatibility.ts](utils/compatibility.ts) `kinRelationMatches()`:
  神秘/反対/類似KIN compare seals across all 4 sun/wavespell combinations; ガイドKIN compares X's guide seal
  **only against Y's sun seal**; 鏡の向こうの自分KIN/絶対反対KIN compare KIN numbers. Only matches are shown, each as a card with the two archetype icons and a relation chip (a direction with no match is omitted, the 運命数字 card only appears when it matches, and a pair with nothing at all shows a "no relation" note),
  a tone-1 KIN (sun seal = wavespell seal) produces the same relation twice exactly as mayadan does, and only
  絶対反対KIN rows are red. The separate 運命数字 card ([utils/destinyCompatibility.ts](utils/destinyCompatibility.ts):
  same/sequential/mirror/absoluteOpposite) is kept unchanged, so mirror/absolute-opposite appear in both places
  by design. Explanations are shown once per relation type at the bottom, reusing
  [utils/kinRelations.ts](utils/kinRelations.ts) and the 運命数字 texts.
  `npm run verify:compatibility` ([scripts/verifyCompatibility.ts](scripts/verifyCompatibility.ts)) checks the rules
  against result text captured from mayadan.jp — run it after touching `utils/compatibility.ts`.
- **`/kin/[sealIndex]`** — the "詳しく見る" target from result.vue's KINの関係性 cards. A relation is a
  *seal*, not a KIN number, so this reads the same `character-{sealIndex}` document as 太陽の紋章 does
  and reuses the same free/paid layout. `?label=` is only honoured when it matches a known relation name.
- **`/kin/[kin]/detail`** — the 運命数字 target. An arbitrary KIN 1–260, reading `kin-{n}` with the same
  125-character split as result.vue's own KIN letter.
Both carry `name`/`birth`/`gender` through in the query so 診断結果へ戻る lands on the same reading.

Both also receive **`?from=<the result page's KIN>`**. It is adopted (`sourceKin`) only if the page really is
one of that KIN's 4 relation seals (`relationSealIndices`) / 5 destiny KINs (`destinyKins`, which includes the
KIN itself) — both in [utils/mayaCalc.ts](utils/mayaCalc.ts). The check matters because a single-article purchase
of KIN N is meant to unlock these pages *when reached from KIN N* (Phase 2); without it, editing the URL would
turn one purchase into every seal and KIN. Today `sourceKin` only decides which KIN `/plans` offers as the
single article: the relation page offers `sourceKin` or nothing (a seal is not a purchasable unit), the detail
page offers `sourceKin ?? its own KIN`.

### Diagnosis content (Firestore)
Body text lives in **two** collections. `diagnosisContent` is world-readable; `diagnosisContentPremium`
is readable only by an entitled member or an admin. Both use the same deterministic doc IDs:

| ID | Source master | Free side (`diagnosisContent`) | Paid side (`diagnosisContentPremium`) |
|---|---|---|---|
| `character-{0..19}` | docs/診断結果マスタ.xlsx | archetype, catchphrase, traits, careerPath, likes, dislikes, communicationStrengths/Challenges, strengthsSummary/Detail, cautionSummary/Detail | cautionDetailPremium, practicalTips, bestEnvironment, bestRole, loveAndPartnership, careerSuccess, luckUpActions, luckDownHabits |
| `tone-{0..12}` | docs/銀河の音診断結果マスタ.xlsx | all fields (title, basicSpecs, strengths, cautions, celebrities) | — none, all free |
| `kin-{1..260}` | docs/KIN番号診断結果マスタ.xlsx + 芸能人マスタ.xlsx | freeText (first 125 chars), hasMore, premiumCharCount, kinCelebrities | restText (char 126 onward) |

Common fields on the free side: `type`, `index`, `name`, `freeText`, `status` (`'公開' | '下書き'`),
`updatedAt`. `premiumText` is a leftover from the original schema and is unused.

**Why two collections.** Firestore rules cannot filter fields — a rule either exposes a document or
it doesn't. While the paid fields sat in the same document as the free ones under `allow read: if true`,
**anyone could read the entire paid reading straight out of the SDK without logging in**, which is
what shipped until 2026-09-07. [components/LockedVeil.vue](components/LockedVeil.vue) never renders the real text into
the DOM, but that alone was only cosmetic. Splitting the collections is what actually protects it.
See [utils/premiumContent.ts](utils/premiumContent.ts) for the field list and the 125-character boundary — that file is
the single source of truth, shared by the pages, the admin form and the migration script, and it
deliberately has no `~/` imports so `scripts/` can import it under tsx.

- `kin-*` is one flowing paragraph rather than discrete fields, so it is split **physically** at 125
  characters ([utils/premiumContent.ts](utils/premiumContent.ts) `splitKinText`). The free side keeps `hasMore` and
  `premiumCharCount` because a visitor without access cannot see the paid document at all and so
  cannot work out whether there is more to read or how much (LockedVeil's 「残り○○文字」).
  `character-*` keeps `premiumCharCount` for the same reason.
- [composables/useDiagnosisContent.ts](composables/useDiagnosisContent.ts) fetches the free docs always and the premium ones
  **only when `useEntitlement().entitled` is true** — fetching them unconditionally would just
  produce guaranteed `permission-denied` failures. `fetchPremiumDoc()` still swallows that error
  defensively, since entitlement can change between the check and the read. A missing or
  `status !== '公開'` free doc resolves to `null` and callers fall back to `useDiagnosis`'s hardcoded
  `.text` so the page is never blank.
- Admin editing is [pages/admin/content/index.vue](pages/admin/content/index.vue) (list) and [pages/admin/content/[id].vue](pages/admin/content/%5Bid%5D.vue)
  (per-doc form). The form still shows free and paid fields together; on save it splits them and
  writes **both documents in one `writeBatch`**. For `kin-*` it recombines free+rest into one
  textarea on load and re-splits on save, so the split is invisible to the editor. There is no
  "create new content" concept — slots are fixed and enumerated from `SEALS`/`TONES`.
  [utils/diagnosisContentAdmin.ts](utils/diagnosisContentAdmin.ts) carries a dev-only check that its `tier` metadata agrees with
  `PREMIUM_CHARACTER_FIELDS`; if the two drift, a paid field silently gets saved into the public
  collection.
- Seeding: `seed:characters` / `seed:tones` / `seed:kins` / `seed:celebrities` write to the right
  collection already. `scripts/splitPremiumContent.ts` (`npm run migrate:premium`) is for data that
  predates the split; it is idempotent (skips IDs that already have a premium doc) and supports
  `--dry-run`.

### Member status and the paid-area gate
The paid sections of [pages/result.vue](pages/result.vue), [pages/kin/[sealIndex].vue](pages/kin/%5BsealIndex%5D.vue) and
[pages/kin/[kin]/detail.vue](pages/kin/%5Bkin%5D/detail.vue) are unlocked for any signed-in member who is not suspended.

**Status is derived, not stored** ([utils/userAdmin.ts](utils/userAdmin.ts)):

| Shown as | Condition | Paid area |
|---|---|---|
Checked in this order:

| Shown as | Condition | Paid area |
|---|---|---|
| 利用停止 | `suspended === true` | locked (free diagnosis still works) |
| 有料会員 | `plan === 'paid'` | unlocked — **nobody is in this state yet**; it exists for payment |
| チーム会員 | `teamId != null` | unlocked |
| 無料会員 | anything else | unlocked (until Phase 2) |

`/admin/users` offers 無料会員 / 利用停止 (`SELECTABLE_USER_STATUSES`); for a member in a team the modal shows
チーム会員 in place of 無料会員, because choosing 無料会員 would change nothing while the team is set.
有料会員 is withheld until payment ships — add `'paid'` to that array to release it. After a
change the row's status is re-derived with `userStatus()`, not copied from the radio. Both `plan` and
`suspended` are admin-only in [firestore.rules](firestore.rules); a member cannot promote or un-suspend themselves.

**Team membership is managed only in `/admin/teams`**, status (suspension) only in `/admin/users`.
Removing a member from their team is how an admin turns チーム会員 back into 無料会員; there is no
status button for it. Keeping one operation in one place is deliberate — putting both in both screens is
what makes it ambiguous which one is authoritative.

**Data model.** One team, one code.

```
referralTeams/{teamId}          admin only. { name, code, note, createdAt, updatedAt }
referralCodes/{code}            get: anyone, list: admin. { teamId, teamName, status }
publicTeams/{teamId}            read: anyone, write: admin. { name, active }   ← 登録ページのチーム選択用
users/{uid}                     plan, suspended        ← 現在の閲覧可否はこの2つで決まる
                                teamId, teamName, entitlementSource,
                                referralCodeId, referralRedeemedAt   ← 紹介経路。teamId があればチーム会員
```

**The code string is the document ID of `referralCodes`.** This is the whole design. Firestore rules
control `get` (fetch by ID) and `list` (query) separately, so opening `get` alone means someone who
already knows a code can validate it, while nobody can enumerate the collection. Storing the code as
a *field* and querying `where('code','==',x)` would require `list`, which would expose every code at
once. It also lets the rules re-check the code server-side via `get()` when a user writes their own
`users` document — the client-side check in [composables/useReferralCodeInput.ts](composables/useReferralCodeInput.ts) is only for the
error message.

Format is `{teamId 3 chars}{random 6}`, no hyphen, e.g. `K7M3QP9XR`, generated in
[utils/referralCode.ts](utils/referralCode.ts) from a 31-character alphabet with `O 0 I 1 L` removed. There is no server, so
**there is no rate limit on code guessing** — the random part is the only defence. Don't shorten it
and don't replace it with something memorable.

**What the rules enforce** (all covered by `npm run verify:rules:emulator`):
- `teamId` *and* `teamName` must match the code document, so a member holding one valid code can't
  claim membership of a different team.
- A member already in a team cannot redeem another code (no switching teams).
- A member **not** currently in a team can redeem — including one an admin removed. Removal is
  un-enrolment, not a ban: someone who knows the code can rejoin. (This was originally "once only,
  ever"; relaxed 2026-09-07 on request.) Rejoining makes them チーム会員 again.
- A **suspended** member cannot redeem at all. Without that, someone an admin suspended could enter
  a code and undo it themselves; only an admin can lift a suspension.
- `plan` and `suspended` are admin-only.
- Conditions read `resource.data.get('teamId', null)`, not `resource.data.teamId`. Members created
  before this feature have **no** permission fields at all, and a direct reference to a missing field
  is an evaluation error that fails the whole clause — which is exactly how every pre-existing
  production member was locked out on 2026-09-07. Keep using `get(key, default)` here.

**`publicTeams`** is the world-readable copy of each team's name and whether its code is active, for the
team dropdown on `/signup/referral` and `/account` (team names being public was explicitly accepted). It
never holds the code. [utils/referralTeamAdmin.ts](utils/referralTeamAdmin.ts) writes it in the same batch as
`createTeam`, `renameTeam` and `setCodeStatus` (the latter two use `set` with `merge`, so teams that predate the
collection get created on first edit); `scripts/backfillPublicTeams.ts` creates it for existing teams. The
dropdown's "selected team must match the code" check is client-side only — the rules already require
`teamId`/`teamName` to equal the code document's, so a mismatched team cannot be written anyway. Keep
`redemptionFields()` taking `teamName` from the code document, not from `publicTeams`.

**Who can see a code.** Only admins. `referralTeams` (which holds the admin note) is admin-only, and
`referralCodes` carries only what `/signup` needs to show. The one exception is
`users/{uid}.referralCodeId`, which the owner can read — but that is a code they typed themselves.
A member an admin added to a team never learns the code (`referralCodeId` stays `null`,
`entitlementSource` is `'admin'`).

**The gate itself** is [composables/useEntitlement.ts](composables/useEntitlement.ts). Pages don't compute it. It exposes
`entitled`, `settled` and `suspended`; `settled` covers the auth restore *and* the `users` document
fetch, and pages must wait for it before rendering **either** the unlocked content or LockedVeil, or
an entitled member sees the upsell flash by. Note the opposite rule for truncating body text: that
must default to "truncate" while undecided, otherwise the full text flashes.

**Introducing payment**: see "Payment roadmap (Phase 2)" at the end.

**Where members enter a code** (team + code, both required): [pages/signup/referral.vue](pages/signup/referral.vue)
(registration with a code) and [pages/account.vue](pages/account.vue) (afterwards, for an existing member not in a
team). [pages/signup/index.vue](pages/signup/index.vue) has **no** code field. The inputs are
[components/ReferralCodeFields.vue](components/ReferralCodeFields.vue) over
[composables/useReferralCodeInput.ts](composables/useReferralCodeInput.ts). Non-existent, disabled and
wrong-team codes all show the same message, so the check can't be used to probe which codes exist.
The blur/team-change check deliberately does **not** use `withLoading`: the overlay takes pointer events, so a
blur triggered by pressing the submit button would swallow that very click. Submits still wrap in `withLoading`.
After a successful redemption `/account` always navigates somewhere: the `redirect` it was given, or a
`/result` URL rebuilt from the member's own birthdate.

### Purchase plans and the paywall CTA
Every LockedVeil's 「続きを購入する」 goes to [pages/plans.vue](pages/plans.vue) regardless of sign-in state, via
[composables/usePlansLink.ts](composables/usePlansLink.ts): `/plans?kin=N&redirect=<current page>&name&birth&gender`.
`/plans` shows 有料会員 ￥5,500/月(税込), highlighted as おすすめ, and この記事のみ ￥550(税込) for `kin` (hidden
when there is no `kin`), plus a login link for signed-out visitors (no link to `/signup/referral` here or on `/signup` — that page is reached only by its URL, which is shared with referred members directly). **Until payment ships both buttons do the
same thing**: signed out → `/signup` (with `redirect` and the prefill query), signed in → `redirect`.
`planAction()` is the single place to switch to Stripe Checkout.

LockedVeil's 「有料エリア 合計○○文字」 is the **sum over every veil currently shown on the page**, and every
veil shows the same number. On `/result` that is `lockedTotalChars` (sun + wavespell when not unlocked — both
count even when they are the same seal — plus the KIN letter when locked), computed with the same conditions as
the veils' own `v-if`s. The kin pages have a single veil, so it is just that veil's count.

### Admin: teams
[pages/admin/teams/index.vue](pages/admin/teams/index.vue) creates teams (name only — `teamId` and code are generated) and
lists them with member counts; [pages/admin/teams/[teamId].vue](pages/admin/teams/%5BteamId%5D.vue) handles the code's
active/disabled state, the team name and note, and adding/removing members by email. Writes live in
[utils/referralTeamAdmin.ts](utils/referralTeamAdmin.ts).

- Creating a team writes `referralTeams` + `referralCodes` in one batch; half-created state would
  mean either an unusable code or a team nobody can join.
- Renaming updates the name in **three** places — the team, the code document and every member's
  `users.teamName`. `teamName` is denormalised onto members because `referralTeams` is admin-only and
  an admin-added member doesn't know the code either, so there is otherwise no path for them to see
  their own team's name on `/account`.
- Member queries are `where('teamId','==',x)` with **no `orderBy`**, sorted client-side, capped at
  `MEMBER_LIST_LIMIT` (500). Adding `orderBy` would require creating a composite index by hand
  before the feature works at all.
- Disabling a code stops new registrations only (and hides the team from the signup dropdown); existing members stay in the team.

### General-user authentication (signup/login)
General visitors can self-register via [pages/signup/index.vue](pages/signup/index.vue) (→ 無料会員) or [pages/signup/referral.vue](pages/signup/referral.vue) (same fields + team + referral code → チーム会員); both use [composables/useSignupForm.ts](composables/useSignupForm.ts) and [components/SignupProfileFields.vue](components/SignupProfileFields.vue) (name/phone/email/password/birthdate/gender → `createUserWithEmailAndPassword` + `updateProfile` for the display name + a `users/{uid}` Firestore doc). The page lives at `pages/signup/index.vue` rather than `pages/signup.vue` because the latter would become the parent route of `/signup/referral` and render instead of it. Members sign in via [pages/login.vue](pages/login.vue) (`signInWithEmailAndPassword`) — both client-side only, on the same shared `$auth` instance as admin login ([plugins/firebase.client.ts](plugins/firebase.client.ts)), and both self-service with **no custom claims involved**, so this can never grant `/admin/**` access. Birthdate/gender reuse the diagnosis form's own inputs (`components/BirthdateSelect.vue` `theme="paper"` / `components/GenderRadio.vue`) and, when arriving via `/plans`, pre-fill from the `name`/`birth`/`gender` query params ([utils/signupLink.ts](utils/signupLink.ts)) — otherwise they start blank/default.

- **State**: [composables/useAuth.ts](composables/useAuth.ts) is a module-level singleton `onAuthStateChanged` subscription (same pattern as [composables/useAdminAuth.ts](composables/useAdminAuth.ts)), exposing `user` and a `ready` flag that flips true once Firebase's initial async session restore has fired — [composables/useEntitlement.ts](composables/useEntitlement.ts) builds on it (its `settled` also waits for the `users` document) so pages never have to `await` [utils/authReady.ts](utils/authReady.ts) themselves.
- **Redirect-back**: the signup pages, `/login`, `/account` and `/plans` read/validate `route.query.redirect` the same way [pages/admin/login.vue](pages/admin/login.vue) does (must start with `/`, must not start with `//`; `safeRedirect()` in [utils/signupLink.ts](utils/signupLink.ts)), default to `/` if absent, and each links to the other while forwarding that same `redirect` query — this is how a visitor who came through `/plans` from `/result` or `/kin/{n}` gets returned to that exact page after signing up or logging in. Both pages also auto-`navigateTo(redirectTarget())` immediately if `useAuth()` already reports a signed-in user (e.g. a stale bookmark to `/signup` while already logged in).
- **Firestore**: a `users/{uid}` doc is created at signup with `name`, `phone`, `email`, `birthdate`,
  `gender`, `plan: 'free'`, `suspended: false`, `createdAt` plus the five referral fields (`teamId`,
  `teamName`, `entitlementSource`, `referralCodeId`, `referralRedeemedAt`). **Write the referral
  fields explicitly as `null` when unset** — see [composables/useReferralCodeInput.ts](composables/useReferralCodeInput.ts)'s
  `unaffiliatedFields()`. A missing field is an evaluation error in the rules, not a falsy value, so
  omitting them locks the member out of ever redeeming a code. `plan` is always `'free'` at signup —
  チーム会員 comes from `teamId`, not from `plan`. The owner can read and edit their own
  doc, `isAdmin()` can read any; the owner's `update` rule excludes `plan`/`suspended` and the
  referral fields except via the code-redemption branch.
  There is also a vestigial `entitlement` field on documents created before 2026-09-09. Nothing reads
  or writes it any more — status is derived from `plan`/`suspended`. Don't revive it.
- **What's still missing for real payment**: an automated way to set `plan: 'paid'`. Stripe Checkout
  needs somewhere to receive the webhook, and this app is a serverless SPA on the free Spark plan
  with no Cloud Functions (see "Deployment"), so that flow still needs designing. Everything on the
  reading side is ready — see "Introducing payment" above.
- **Display/logout**: [components/SiteHeader.vue](components/SiteHeader.vue) (rendered only on `/` and `/result`, see "Two visual worlds" below) shows the signed-in visitor's name (`user.displayName`, set at signup, falling back to `user.email`) + a `#i-user` icon and a ログアウト button once `useAuth()` reports `ready && user` — both in the desktop `.siteheader__nav` and the mobile `.sitemenu` drawer, since `.siteheader__nav` is CSS-hidden below 900px. Logging out just calls `signOut()`; unlike admin's logout (which redirects to `/admin/login`, since `/admin/**` requires a session) there's no dedicated logged-in-only general page to navigate away from — `useAuth()`'s reactive `user` feeds `useEntitlement()`, which re-locks `/result`/`/kin/{n}` on its own.

### Two visual worlds
The app deliberately uses two unrelated design systems, matching the mockup:
- **Public/user pages** (`/`, `/result`, `/plans`, `/account`, `/signup`, `/signup/referral`, `/login`, `/compatibility`, `/kin/[sealIndex]`, `/kin/[kin]/detail`; `layouts/default.vue`) share the "paper" (羊皮紙) theme — `paper-page`/`sheet`/`masthead`/`panel`/`formlabel`/`formfield`/`btn-gold`/`plancard` etc. in [assets/css/paper-theme.css](assets/css/paper-theme.css), serif `font-display`/`font-body` (Cormorant Garamond / Shippori Mincho B1). `/account` was migrated onto this shared theme from an earlier one-off slate/brass style (see the `2026-08-17` comment there); the raw `bg-ink-950`/`gold-*` Tailwind utilities in [tailwind.config.ts](tailwind.config.ts) predate that unification and aren't the current styling mechanism for these pages — check the mockup before assuming either naming scheme is still authoritative.
- **Admin pages** (`/admin/**`, `layouts/admin.vue`) use a neutral, theme-aware (light/dark via `media`) console style with `brass-700` accents, sans-serif body text, and a fixed sidebar. Admin pages set `definePageMeta({ layout: 'admin' })` individually.

Tailwind `darkMode` is `'media'` (follows OS preference), not a manual toggle.

**Admin on phones** (2026-09-23). [layouts/admin.vue](layouts/admin.vue) turns the sidebar into a left drawer below `md`
(768px) with a hamburger top bar, mirroring `SiteHeader.vue`'s drawer (scrim, html+body scroll lock, Esc/route-change
close). The same `<aside>` is the permanent sidebar from `md` up, so `inert` is applied only when "below md **and** closed"
(via `matchMedia`) — copying SiteHeader's unconditional `!open` would freeze the desktop sidebar. Every admin list table
is `hidden lg:block` with a `lg:hidden` card list beside it built from
[components/AdminRecordCard.vue](components/AdminRecordCard.vue) (horizontal-scrolling tables were rejected as unreadable
on phones); tablets 768–1023px get cards too because the sidebar leaves no room for 7 columns. Modals get
`max-h-[calc(100vh-2rem)] overflow-y-auto` so their footer buttons stay reachable. The mobile top bar and the
search bars on `/admin/users` and `/admin/content` ([components/AdminSearchBar.vue](components/AdminSearchBar.vue):
one keyword input plus a 詳細検索 icon that opens a modal holding the other conditions as
[components/AdminFilterChips.vue](components/AdminFilterChips.vue) — a row of several controls was too tall to pin on a
phone) are `position: sticky`; that only works because the layout
adds `html.admin-shell` via `useHead` and [assets/css/main.css](assets/css/main.css) switches `paper-theme.css`'s
`html, body { overflow-x: hidden }` (the public pages' iPhone bounce guard, which turns `body` into a scroll container
and silently disables sticky) to `overflow-x: clip` for admin only.
**Do not put Tailwind's `block` class on admin elements**: [assets/css/paper-theme.css](assets/css/paper-theme.css)
defines a public-page `.block { margin-top: 26px; max-width: 720px; margin: auto }` that wins over it (it's loaded after
Tailwind), which is how the hamburger bars first rendered at 0px tall. Existing `mb-1.5 block` labels in admin carry
that stray margin today; use `flex`/`w-full` instead of `block` for anything new.

`/plans`, `/signup`, `/signup/referral`, `/login` and `/account` render **no footer** (`FOOTERLESS_PATHS` in [layouts/default.vue](layouts/default.vue))
and use `.paper-page--focus`, which fills the viewport and centres the content vertically so they fit on one screen
without scrolling. The signup forms go two-column from 768px (`.signupform .formgrid`) for the same reason. On phones
the forms and the stacked plan cards are taller than the screen and still scroll; `justify-content: safe center`
keeps the top from being cut off in that case.

[components/LoadingOverlay.vue](components/LoadingOverlay.vue) spans both worlds and is mounted in all three layouts. It is
driven by [composables/useGlobalLoading.ts](composables/useGlobalLoading.ts), whose `withLoading()` wraps any Firebase call the
visitor is actively waiting on — signup, login, logout, code lookup and redemption, and every admin
write. Page-load reads are deliberately **not** wrapped: the free content renders first, so covering
the screen there would only make the site feel slower; those keep their inline 読み込み中… text.

Two things about that component are load-bearing:
- It is **always rendered** and toggled with a class, not `v-if` + `<Transition>`. With a transition,
  a fast round-trip made enter and leave race, leaving the element stuck at `leave-active` — invisible
  at `opacity: 0` but still `position: fixed; inset: 0`, swallowing every click on the page. When
  inactive it sets both `pointer-events: none` and `visibility: hidden` so a stuck state can't block
  input again.
- `withLoading` counts rather than toggling a boolean (so concurrent calls don't uncover each other)
  and force-clears after 20s. Firestore retries writes indefinitely while offline, so an `await` can
  simply never return; an uncoverable screen is worse than a lost spinner.

### Admin pages: only the dashboard is still a mockup
Real and Firestore-backed: [pages/admin/content/**](pages/admin/content) (see above),
[pages/admin/history/index.vue](pages/admin/history/index.vue) (`diagnosisHistory` — every diagnosis/compatibility submission,
logged fire-and-forget from the public site; cursor-paginated),
[pages/admin/teams/**](pages/admin/teams) (see "Admin: teams") and [pages/admin/users.vue](pages/admin/users.vue).

`/admin/users` lists real members with their status, team and how they joined, and its detail modal is
where a member is suspended or reinstated (see "Member status" above). It deliberately **dropped** two
columns the mockup had: 最終ログイン (Firebase Auth's `lastSignInTime` for another user is
Admin-SDK-only, unreachable from a serverless client) and 支払い方法 (no payment yet).

[pages/admin/index.vue](pages/admin/index.vue) (dashboard stats) is still hardcoded `ref()` arrays; edits are lost on
reload. All of `/admin/**` requires a real admin login — see "Admin authentication" below.

### Admin authentication
`/admin/**` requires a Firebase Auth session carrying the `admin: true` custom claim. There is no server anywhere in this app — everything happens client-side, following Firebase's own recommended pattern for custom-claims-based RBAC (Security Rules as the actual enforcement layer, not a hidden/CSS-only check):

- **Route protection**: [middleware/admin-auth.global.ts](middleware/admin-auth.global.ts), a global Nuxt route middleware. It early-returns for any non-`/admin/**` path and for `/admin/login` itself (checked via `to.path === '/admin' || to.path.startsWith('/admin/')`, deliberately not a bare `startsWith('/admin')`, which would also match an unrelated future route like `/admin-something`). For everything else it awaits [utils/authReady.ts](utils/authReady.ts)'s `authReady()` (Firebase Auth's one-time async initial-session restore — `auth.currentUser` is unreliably `null` until this resolves, even for an already-signed-in user), then reads `auth.currentUser` **live** (not a cached value) and checks the `admin` claim via `getIdTokenResult()`, redirecting to `/admin/login?redirect=<path>` if either check fails.
- **Login**: [pages/admin/login.vue](pages/admin/login.vue) (layout: `admin-plain`, no sidebar) calls `signInWithEmailAndPassword` directly against the client Firebase Auth SDK, then immediately checks the `admin` claim on the freshly-signed-in user and shows a specific "not an admin" message (rather than deferring that check to the middleware's next run, which could race a just-completed sign-in) before `navigateTo()`-ing to the original destination.
- **Display/logout**: [composables/useAdminAuth.ts](composables/useAdminAuth.ts) is a module-level singleton reactive `onAuthStateChanged` subscription, used only by [layouts/admin.vue](layouts/admin.vue) to show the signed-in email and drive the ログアウト button (`signOut()` + redirect to `/admin/login`) — **not** used by the route guard itself, to avoid the two listeners racing each other.
- **Authorization is enforced twice, independently**: the middleware above gates page rendering, but the real security boundary is [firestore.rules](firestore.rules)'s `isAdmin()` helper (`request.auth != null && request.auth.token.admin == true`), used on `diagnosisContent` writes and on `diagnosisHistory` reads (`diagnosisHistory` holds real visitor PII — name/birthdate/gender — so unlike `diagnosisContent`, which stays publicly readable since it's shown to anonymous site visitors, it's admin-only in both directions) — a client-side guard alone would just be UI polish, easily bypassed by calling the Firestore SDK directly from devtools; the rule is what actually rejects an unauthorized read/write. `diagnosisHistory` **creates** stay open to anyone, unauthenticated — those are submitted by ordinary site visitors via the diagnosis form, not admins.
- **Bootstrapping an admin account**: there's no signup UI (`/admin/**` is invite-only by design) — use `npm run admin:create[:emulator] -- --email=... --password=...` ([scripts/createAdminUser.ts](scripts/createAdminUser.ts), mirrors the seed scripts' emulator-vs-real-project branching). Idempotent: re-running just re-asserts the `admin:true` claim without touching the password unless `--reset-password` is also passed. Custom claims only take effect on the user's *next* ID-token refresh — sign out/in again after granting.
- **General end-user auth is a separate, independent system** from all of the above — see "General-user authentication" above. It shares the same Firebase `$auth` instance and the same [utils/authReady.ts](utils/authReady.ts)/singleton-subscription pattern, but has no custom claims and no admin middleware involvement (`middleware/admin-auth.global.ts` only ever looks at `/admin/**` paths). Because the app has a single shared Auth instance, a browser tab can only be signed in as one Firebase user at a time — general and admin sessions don't coexist, same as before this was added.

### Firebase config
Firebase web config is read from `NUXT_PUBLIC_FIREBASE_*` env vars in [nuxt.config.ts](nuxt.config.ts) `runtimeConfig.public.firebase`, with the actual project's values hardcoded as fallback defaults (not secret — this is the public web SDK config, safe to expose client-side, and since there's no server, it's baked into the client bundle at `npm run generate` time rather than read at request time). The Firebase project is `mayachannel-34fd5` (see [.firebaserc](.firebaserc)). `FIREBASE_SERVICE_ACCOUNT_KEY` (in the gitignored `.env`, generated manually from Firebase Console → Project Settings → Service Accounts) holds the Admin SDK credential used **only** by local, never-deployed scripts — the seed scripts and [scripts/createAdminUser.ts](scripts/createAdminUser.ts) — read directly via `tsx --env-file=.env`, not through Nuxt's `runtimeConfig`.

### Deployment
[nuxt.config.ts](nuxt.config.ts) sets `ssr: false` — a fully static SPA, no server, no Cloud Functions. `npm run generate` (which sets `NITRO_PRESET=static` — deliberately not baked into `nuxt.config.ts` itself, since that specific preset breaks `nuxt dev` with a `No entry found in rollupOptions.input` crash; see the comment in `nuxt.config.ts`) produces `.output/public` only (every route is the same empty shell; vue-router resolves paths entirely client-side after hydration) and makes the build fail loudly if a `server/api/**` route is ever reintroduced, rather than silently building something `nuxt dev` runs but the static output can't serve. [firebase.json](firebase.json)'s `hosting.rewrites` sends every path (`**`) to `/index.html` (a standard SPA catch-all, not a function target) and declares the `firestore` block; deploying needs `firebase deploy` (include `--only firestore:rules` after any `firestore.rules` change — it's not redeployed automatically just because the app is). This exists specifically to stay on Firebase Hosting's free "Spark" plan — Cloud Functions (the previous deployment target, via `nitro.preset: 'firebase'`) require the paid "Blaze" plan even to enable the necessary APIs, confirmed by an actual failed `firebase deploy` (`Error: ...must be on the Blaze (pay-as-you-go) plan`).

**Order matters when rules and data change together.** Deploy the rules *first*, then migrate, then
the app:

```bash
npx firebase deploy --only firestore:rules
npm run migrate:premium            # 移行が必要なときだけ。--dry-run で件数を先に確認できる
npm run backfill:public-teams      # publicTeams 導入時に一度だけ。--dry-run 可
npm run generate && npx firebase deploy --only hosting
```

Migrating first would move documents into a collection that has no rule yet, and the catch-all
`match /{document=**} { allow read, write: if false }` would make them unreadable to everyone —
admins included — until the rules land. Between the migration and the app deploy the live site
degrades gracefully (paid sections just don't render); it never leaks.

## Payment roadmap (Phase 2)
Agreed on 2026-09-17; Phase 1 (tiers, `/plans`, referral signup, `from`, page-wide char count) is implemented.
Prices are tax-included.

- **有料会員** ￥5,500/月: reads everything.
- **記事の単体購入** ￥550 (one-off), unit = one KIN. Buying KIN N unlocks: `/result` for KIN N in full
  (太陽の紋章 and ウェイブスペル premium items + the KIN letter), `/kin/N/detail`, and — only when opened with a
  valid `from=N` — the 4 relation pages and the 5 destiny-number pages linked from KIN N's result. Purchases
  require being signed in. Suspension overrides purchases.
- **チーム会員** stays as today: in a team ⇒ reads everything.
- **Infrastructure**: Stripe Checkout needs a webhook, which needs a server — the plan is Firebase Blaze +
  Cloud Functions (Checkout session creation, webhook, Customer Portal). Only the server writes
  `users/{uid}.plan = 'paid'` and purchase records `users/{uid}/purchases/kin-{N}`.
- **Rules**: a purchase record carries the content document IDs it unlocks (`kin-N`, the sun/wavespell and 4
  relation `character-*`, the 5 destiny `kin-*`), because rules cannot iterate purchases. `isEntitled()` becomes
  "not suspended && (plan == 'paid' || teamId != null || this doc ID is in a purchase)", mirrored in
  `useEntitlement` — which must then decide per page (by the page's KIN / validated `from`), not globally.
  Because `character-*` documents are shared by several KINs, Firestore read access will be somewhat wider than
  what the UI unlocks; that was accepted.
- **Also needed then**: add `'paid'` to `SELECTABLE_USER_STATUSES`, replace `planAction()` in `/plans`,
  change the free tier to "free area + purchased KINs" in copy.
- **Still undecided**: behaviour after cancelling (e.g. readable until period end), 特定商取引法に基づく表記, refund policy.

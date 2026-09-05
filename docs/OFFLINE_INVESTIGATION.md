# OFFLINE — WHAT ACTUALLY HAPPENS

Session O. Investigation only, no code changed.
Branch `docs/offline-investigation`, read against `origin/main` at `4d7c15b`.
Tracker item: **P1-22**.

**The question:** a technician is in a subfloor with no signal, 30 minutes into
the 9-section inspection form. What actually happens to their work?

**The short answer:** the work survives only while the form stays open in memory.
There is effectively **no on-device backup at all** during active offline work —
on any inspection, new or existing — and the app tells the technician twice, in
writing, that there is. Reload, close, or crash and the work is gone.

This was reproduced in a browser on 2026-09-05. See "The reproduction" below.
An earlier version of this report claimed an inspection that already had a
server id was protected. **That was wrong**, and the reproduction is what proved
it. The corrections are marked throughout.

The holes, in order of severity:

1. **The on-device backup almost never gets written.** The reassurance is on a
   clock anchored at page load; the write is on a clock that restarts on every
   keystroke. So the app says "your changes are on this device" long before
   anything is on the device — and a technician who keeps working never triggers
   the write at all. This affects **every** inspection, not just new ones.
2. **A brand-new inspection has no backup even in principle**, because the
   storage key needs a server-assigned id. And if the service-worker cache has
   gone cold, an offline reload returns a **blank** form — with a duplicate
   inspection row created if the technician types into it and signal returns.
   (In the reproduction the cache was warm, so the form came back showing the
   last saved values instead. Both outcomes lose the new work.)
3. **Two messages tell the technician their work is on the device when it is
   not** — the banner (`OfflineBanner.tsx:53`) and the save-failure toast
   (`TechnicianInspectionForm.tsx:4458`). Both were seen in the reproduction,
   and both were false at the moment they appeared.
4. **A partly-failed save still reports "Saved".** Area, moisture-reading and
   subfloor-update failures are swallowed; only the first write throws. Fully
   offline this is harmless, because the first write fails. On a flaky
   connection — bars, no packets, which is the subfloor case — it is not.
5. **Moisture readings and area add/remove never mark the form dirty at all**
   (eight handlers, `:3478`–`:3572`). They are invisible to the auto-save, the
   save-on-Next, the backup and the unsaved-changes warning. They reach the
   server only if the technician taps Save, or if some unrelated edit drags them
   along. **This one is not an offline bug — it loses data with full signal**,
   and it needs its own tracker item.
6. **UNPROVEN: the restore prompt may crash the app** if it ever renders. The
   reproduction never reached this path, because no backup existed to restore.
   Neither confirmed nor disproved — see the section marked UNPROVEN.

Everything else about offline in this app is either honest or harmless.

---

## The reproduction — 2026-09-05, Michael

Run against an **existing** inspection, `INS-2026-0002`, which already had a row
and an id on the server.

1. DevTools → Network → Offline
2. Typed ` offline` onto the end of **ATTENTION TO** (value became
   "atention to offline")
3. Orange banner appeared: *"You're offline — new changes stay on this device
   until you're back online."*
4. Toast appeared: *"Your changes are only on this device for now. Keep this
   form open — it will save to the server automatically once you're back online."*
5. Reloaded the page
6. Field read **"atention to"**. The typed word was gone.

No crash. No "Unsaved work found" prompt. No warning that anything had been lost.

**The app made the on-device claim twice and it was false both times.** This is
the ground truth this report is now written against; anything that contradicts
it is wrong.

### Why it happened

Two 30-second timers, anchored to different things.

**The auto-save** (`TechnicianInspectionForm.tsx:4484-4491`) — a `setInterval`
with an empty dependency array, so it is anchored at **page load** and fires at
t=30s, 60s, 90s… no matter what the technician does:

```js
useEffect(() => {
  const interval = setInterval(() => {
    if (hasUnsavedChangesRef.current && !isSavingRef.current) {
      handleSaveRef.current({ silent: true });
    }
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

Its failure path is what printed the reassuring toast at step 4.

**The backup** (`:4496-4510`) — a `setTimeout` whose dependency array contains
`formData`. Every keystroke produces a new `formData` object, so the cleanup
clears the pending timer and starts a fresh 30 seconds. It is anchored at the
**last keystroke**:

```js
useEffect(() => {
  if (!localStorageKey || !hasUnsavedChanges) return;
  const backupTimer = setTimeout(() => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({ formData, currentSection, savedAt: ... }));
    } catch { /* localStorage full or unavailable — ignore */ }
  }, 30000);
  return () => clearTimeout(backupTimer);
}, [formData, currentSection, localStorageKey, hasUnsavedChanges]);
```

So the sequence in the reproduction was:

| time | what happened |
|---|---|
| t=0 | page loaded, auto-save interval armed for t=30, 60, 90… |
| ~t=25s | typed " offline" → dirty flag set, backup timer armed for ~t=55s |
| t=30s | auto-save tick → save fails offline → **"your changes are only on this device"** |
| ~t=35s | reload — backup timer discarded, nothing ever written |

**The reassurance is on a fixed clock. The write is on a clock that keeps
resetting.** And the two are anchored to opposite ends of the same burst of
typing: the interval only tests `hasUnsavedChangesRef` (`:4486`), which flips
true on the **first** keystroke (`:3465`), while the backup timer restarts on the
**last** one. So for a burst of typing lasting `d` seconds, the gap between the
reassurance and the earliest possible write is between `d` and `d + 30` seconds —
and it grows the longer someone types. The toast can appear mid-word.

The reassurance therefore fires first essentially always, and a technician who
is continuously filling in a form never triggers a write at all. The backup only
lands if they stop touching the form for 30 uninterrupted seconds while offline.

That is the mechanism. It applies to every inspection, with or without a server
id. Section 3 area data is affected at least as badly, and moisture readings and
area add/remove are worse still for a separate reason — see "Scope of the loss".

---

## The headline correction

The premise this session started from was that offline is wired to nothing and
the UI lies about it. **Both halves turned out to be right**, though not in the
way expected.

The **Dexie offline queue is dead** — confirmed, and worse than assumed: it was
never wired, not unwired later. The inspection form does not use it. It has its
own, separate offline handling added seven months later, and on first reading
that handling looked real and mostly truthful.

**The browser test showed otherwise.** The retry-while-open half genuinely works.
The on-device half — the part both the banner and the toast promise, and the part
the technician-facing documentation tells the team to rely on — effectively does
not run during the work it exists to protect. The gap is not narrow.

> **Correction history.** The first version of this report (merge `0764c49`,
> 2026-09-05) claimed an inspection with a server id was protected by the
> localStorage backup and that only brand-new inspections were exposed. Michael's
> reproduction that evening disproved it. The cause was reading the backup's
> guard conditions without working out when its *timer* actually fires relative
> to the timer that produces the reassuring message. Corrections are marked
> inline throughout.

---

## a. WHAT HAPPENS TODAY

### The setup

The form is 9 sections (`TechnicianInspectionForm.tsx:132`, `TOTAL_SECTIONS = 9`):
Basic Information, Property Details, Area Inspection, Subfloor, Outdoor Info,
Waste Disposal, Work Procedure, Job Summary, Cost Estimate. Section 3 is where
room photos are taken. The scenario below uses the tech's own numbering.

All nine sections share **one** `formData` object held in the page component.
Moving between sections does not unmount it and does not throw anything away.

### Step 1 — tech fills Section 3, still has signal

Every keystroke sets a dirty flag (`:3465`, `:3475`):

```
setHasUnsavedChanges(true);
```

Two timers are running. The first is the server auto-save (`:4484-4491`):

```js
useEffect(() => {
  const interval = setInterval(() => {
    if (hasUnsavedChangesRef.current && !isSavingRef.current) {
      handleSaveRef.current({ silent: true });
    }
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

`handleSave` writes the **whole form**, not just the section on screen — the
"Section 5 saved" wording in the toast names where you are standing, not what
was written. On the first successful save it creates the inspection row and
remembers its id (`:4146-4155`):

```js
} else {
  // INSERT new inspection
  const { data: insertData, error: insertError } = await supabase
    .from('inspections')
    .insert(inspectionRow)
    .select('id, job_number')
    .single();
  if (insertError) throw insertError;
  inspectionId = insertData.id;
  setCurrentInspectionId(inspectionId);
```

**That id is the hinge the whole safety net hangs on.** Hold onto it.

The second timer is the on-device backup (`:4493-4510`):

```js
// localStorage backup — saves form state every 30s as crash recovery
const localStorageKey = currentInspectionId ? `mrc_inspection_backup_${currentInspectionId}` : null;

useEffect(() => {
  if (!localStorageKey || !hasUnsavedChanges) return;
  const backupTimer = setTimeout(() => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({
        formData,
        currentSection,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, 30000);
  return () => clearTimeout(backupTimer);
}, [formData, currentSection, localStorageKey, hasUnsavedChanges]);
```

Three things about this are not what the comment above it says.

- **`localStorageKey` is null until the server has accepted a save.** No id, no
  key, no backup. The effect returns on the first line.
- **It is a `setTimeout`, not an interval.** The cleanup clears it on every
  change, so it writes 30 seconds after the tech *stops* typing, not every 30
  seconds. **While someone is actively filling a section it does not fire at
  all**, and online it is usually pre-empted anyway — a successful save clears
  the dirty flag, which both cancels the pending timer and deletes whatever was
  already on disk. Navigating away or reloading within 30 seconds of the last
  keystroke runs the cleanup and discards the pending write. **This is the
  mechanism the 2026-09-05 reproduction hit.**
- **The backup is deleted the moment the form reopens.** Two effects fire in the
  same commit, in declaration order, on the render where `localStorageKey`
  becomes non-null (`:4513-4541` then `:4544-4548`):

  ```js
  // On mount: check for localStorage backup and offer restore
  useEffect(() => {
    if (!localStorageKey) return;
    ... toast({ title: 'Unsaved work found', duration: 10000,
                action: { label: 'Restore', onClick: () => setFormData(parsed.formData) } })
  }, [localStorageKey]);

  // Clear localStorage backup on successful save
  useEffect(() => {
    if (!hasUnsavedChanges && localStorageKey) {
      try { localStorage.removeItem(localStorageKey); } catch {}
    }
  }, [hasUnsavedChanges, localStorageKey]);
  ```

  `hasUnsavedChanges` is `false` when the form reopens, so the second effect
  deletes the backup immediately after the first has read it. The recovered data
  survives only inside the toast's closure. **So the "24-hour restore" is really
  a one-shot 10-second toast** — and see above for whether that toast even
  renders. Miss it, dismiss it, or reload once more, and the backup is gone; the
  24 hours only decides whether it is offered at all.

  The deletion is also broader than "once per reopen". The effect's deps are
  `[hasUnsavedChanges, localStorageKey]`, and `:4424` sets
  `setHasUnsavedChanges(false)` after **every** successful save, including every
  silent 30-second auto-save. **So a technician working normally online has no
  backup on disk at any moment** — it is written 30 seconds after they stop
  typing and deleted the next time a save succeeds. The backup only survives if
  they go offline, because that is the only time saves stop succeeding.
  `useJobCompletionForm.ts:387-425` has the identical pattern.

- **An offline reload has two very different outcomes, and the reproduction hit
  the benign one.** The key needs `currentInspectionId`, which on reopen comes
  from the mount fetch at `:3082-3092`.

  *If the service worker still has that GET cached* (NetworkFirst, one-hour
  expiry — `vite.config.ts:91`), the fetch resolves from cache, the id is set,
  the form renders the **last server-saved values**, and the restore effect at
  `:4513` runs and looks. **This is what happened in the reproduction** — the
  field showed `ins.attention_to` from `:3316`, which is the proof that the
  lookup ran and found localStorage empty. The technician sees their old data
  and no indication that anything newer ever existed.

  *If the cache is cold or older than an hour*, `:3065` throws, the catch at
  `:3418-3424` shows "Failed to load data", `localStorageKey` stays null, and
  the restore effect returns at `:4514` without looking. The technician gets an
  **empty 9-section form**. Worse: if they start typing into it and signal
  returns, `handleSave` sees `currentInspectionId === null` and takes the INSERT
  branch at `:4148` — creating a **second inspection row for the same lead**.
  This branch is INFERRED and has not been reproduced; it is on the runtime-test
  list in section (e).

### Step 2 — signal drops

Nothing happens immediately. Nothing is watching except the banner poller.
Within 3 seconds `OfflineBanner` notices (`OfflineBanner.tsx:9,36`) and shows the
amber bar. What it says is covered in section (b) — it is the one thing in this
app that is not true.

The service worker does not help and cannot. The app *shell* loads offline —
the build is precached and `navigateFallback: '/index.html'` serves every
navigation, so the form's route and its lazy chunk are available. But **every
`runtimeCaching` rule is registered GET-only**: `workbox-build` emits
`entry.method || 'GET'`, and the built `sw.js` passes `"GET"` as the third
argument to all nine `registerRoute` calls. A save is `.insert()` (POST) or
`.update()` (PATCH), so it never enters the service worker at all — it falls
through to the browser's fetch and rejects. There is also **no background sync**
anywhere: no `workbox-background-sync`, no `BackgroundSyncPlugin`, no `sync`
event listener. The service worker makes the app *openable* offline. It does
nothing whatsoever for writes.

### Step 3 — auto-save fires while offline

The save runs, the network call throws, and it is caught (`:4442-4470`):

```js
} catch (err: any) {
  captureBusinessError('Inspection form save failed', {
    leadId, inspectionId: currentInspectionId, section: currentSection,
    error: err?.message || String(err),
  });
  if (isNetworkLevelError(err)) {
    lastSaveFailedOfflineRef.current = true;
    toast({
      title: (... You're offline — not saved to the server),
      description:
        "Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online.",
      className: OFFLINE_TOAST_CLASS,
      duration: 8000,
    });
```

Three things worth stating plainly:

- **`setHasUnsavedChanges(false)` is at `:4424`, inside the success path.** A
  failed save does not clear the dirty flag. The next timer tick tries again.
  That is what makes "it will save automatically once you're back online" a true
  statement rather than a hopeful one.
- **The catch block does not check `options.silent`.** A silent background
  auto-save that fails still raises the amber toast. The technician is told every
  30 seconds, not once. Noisy, but honest.
- **This reaches Sentry.** `captureBusinessError` wraps the text in
  `new Error('Inspection form save failed')` (`src/lib/sentry.ts:113`), and the
  `ignoreErrors` list only filters `"Failed to fetch"`, `"NetworkError"`,
  `"Load failed"`, `"AuthRetryableFetchError"` (`:55-62`). The message does not
  match, so it is not swallowed. **`MRC-APP-18 — "Inspection form save failed",
  25 Aug` is already sitting in `docs/TODO.md`.** This is not theoretical. It has
  been happening in the field and we have the tickets.

**CORRECTED 2026-09-05.** An earlier version of this table said an inspection
with a server id was "recoverable within 24h". The reproduction disproved that.
What is actually true:

| | `currentInspectionId` | localStorage backup | If the app dies now |
|---|---|---|---|
| Existing inspection, technician still working | set | **only if they stop touching the form for 30 uninterrupted seconds** — otherwise never written | **gone**, and this is the case that was reproduced |
| Existing inspection, technician stopped >30s ago | set | written | one 10-second toast on next open, then deleted — see below |
| Brand-new inspection, first save happened offline | **null** | **never written, at all** | **gone** |

The middle row is the only one with any protection, it is the least likely
state for someone mid-inspection to be in, and even it is fragile.

### Step 4 — tech keeps working, fills Section 4

Works normally. Nothing blocks. `formData` accumulates in memory. Auto-save
keeps failing every 30 seconds and keeps saying so.

### Step 5 — tech navigates to Section 5

Safe. The handlers are `:4568-4571` and `:4733-4734`:

```js
const handlePrevious = () => {
  if (hasUnsavedChanges) handleSave();
  setCurrentSection((prev) => Math.max(1, prev - 1));
};
```

`handleSave()` is called **without `await`**. The navigation does not wait for
it and does not care that it failed. Because all nine sections share one
`formData` object and nothing unmounts, moving between them cannot lose data.
This step is not a risk.

### Step 6 — signal returns

Two things happen independently.

`useOfflineSync` fires a reassuring toast (`useOfflineSync.ts:69-76`):

```js
} else if (wasOfflineRef.current) {
  wasOfflineRef.current = false;
  toast.success('Back online');
}
```

Separately — and this is the part that actually matters — the next 30-second
tick of the form's own auto-save succeeds, writes every section at once, clears
the dirty flag, and toasts "Auto-saved / Progress saved to the server". Worst
case the tech waits 30 seconds. There is no listener for the `online` event on
the save path, so it is not instant.

**The work is saved. All of it** — provided the connection is properly back.

### The flaky-signal case, which is not the same thing

Fully offline, `handleSave` fails on its first write and nothing partial
happens. A *flaky* connection — bars showing, packets intermittently dropping,
which is what a subfloor actually looks like — is different, because only some
of the writes throw.

`handleSave` writes five tables in sequence. Only the first one and the subfloor
INSERT abort the save:

- `inspections` insert/update — **throws** (`:4145`, `:4153`)
- subfloor INSERT — **throws** (`:4323`)
- `inspection_areas` writes — `console.error`, **does not throw** (`:4218-4231`)
- subfloor UPDATE — `console.error`, **does not throw** (`:4315-4316`)
- `moisture_readings` writes — the Supabase result is **not destructured at
  all** (`:4259-4263`), so the error is discarded with no log anywhere
- the three deletes (`:4182`, `:4246`, `:4338`) — same, no error binding

Control then reaches `setHasUnsavedChanges(false)` at `:4424` and the green
**"Saved — Section N saved to the server"** toast at `:4433-4436` regardless.

So on a flaky connection a technician can lose an area's readings, be told the
section saved, and have the dirty flag cleared so it is never retried. The
`console.error` sites do reach Sentry via `consoleLoggingIntegration`
(`src/lib/sentry.ts:43`); the moisture-reading failures reach nothing at all.

This is the **"function returns 200 on failure"** class already in the bug
ledger (instances BUG-12/13/14), showing up in the client rather than an Edge
Function. It is out of scope for Option 1 and should be its own tracker item.

### And the photos

Photos are the opposite story, and the app is straight about it — though not as
early as it should be. The camera/picker itself has **no connectivity check**:
`openFilePicker` (`:3618-3624`) and `handlePhotoCapture` (`:3626-3633`) open
normally, and the technician takes or selects the photos before anything
objects. The refusal happens in `handlePhotoInputChange` afterwards
(`:3673-3679`):

```js
// Refuse before uploading rather than after: photo uploads go straight to
// the server and are not kept on the device, so a bulk selection attempted
// with no signal loses every file.
if (!navigator.onLine) {
  showPhotoOfflineToast(files.length);
  return;
}
```

and says so (`:3650-3651`):

> "Photos can't be uploaded without a connection and are not kept on this
> device. Add them again once you're back online."

The two job-completion photo sections say the same thing in the same words
(`Section3BeforePhotos.tsx:332`, `Section4AfterPhotos.tsx:228`). A signal drop
*mid*-upload is also handled: partial batches report
`"N of M photos uploaded — the rest failed and were not kept on this device."`
(`:3806`).

So: a technician working offline cannot add photos, is told clearly each time —
but only *after* framing and taking them, which wastes the trip into the
crawlspace. They then have to remember what they still owe. That is a workflow
cost, not a data-loss bug, and moving the check to the picker would be a
one-line improvement whenever someone is next in the file.

One inconsistency worth noting: `Section3BeforePhotos.tsx` checks offline
*before* the photo limit (`:329` then `:342`); `Section4AfterPhotos.tsx` checks
the limit first (`:218` then `:225`). Offline and over the limit, the two
sections tell the technician different things.

### Where the "offline photo queue" comes into this: nowhere

The Dexie queue exists and works. Nothing feeds it, and — worth being precise —
**`syncAll()` is never called at all.** Both of its call sites are gated on
`pendingCount > 0` (`useOfflineSync.ts:80` on reconnect, `:92` in the interval),
and `pendingCount` comes from counting the two permanently-empty Dexie stores.
The manual escape hatch is shut too: `SyncIndicator` returns `null` when synced
and empty (`:16`) and its `onClick` is `undefined` unless the state is `pending`
or `error` (`:22`), neither of which can occur. What actually runs every 30
seconds is `refreshCounts()` — two IndexedDB `count()` queries that always
return zero. The sync machinery is not a no-op that runs; it is code that never
executes.

```
$ grep -rn "queuePhotoOffline" src/
src/lib/utils/photoUpload.ts:57:export async function queuePhotoOffline(
src/lib/utils/__tests__/photoUpload.test.ts:3:// validatePhotoCaption() is called from queuePhotoOffline() and
src/lib/offline/types.ts:25:   * Required since Stage 4.1. Validated at enqueue (queuePhotoOffline) and
```

One definition and two comments. `saveDraft` and `queuePhoto` are the same —
their only appearances outside `SyncManager.ts` are in `SyncManager.test.ts`.

The JSDoc on the live upload function claims otherwise (`photoUpload.ts:82-83`):

> Upload a photo to Supabase Storage and save metadata to photos table.
> **If offline, automatically queues for later sync.**

It does not. There is no queue call anywhere in `uploadInspectionPhoto`; the
upload error path at `:133-151` logs to Sentry and throws.

**And therefore the quarantine feature can never fire.** A photo is quarantined
only inside `syncPhoto`, which only runs on rows dequeued from `photoQueue`
(`SyncManager.ts:263-266`). Nothing enqueues, so nothing dequeues, so nothing is
quarantined. `QuarantinedPhotosBanner` is mounted app-wide in `App.tsx:82` and
returns `null` on its first line (`:31`) forever.

---

## b. WHAT THE UI CLAIMS vs WHAT IS TRUE

Every user-facing offline string in the app, and whether it holds.

| Where | What it says | True? |
|---|---|---|
| `OfflineBanner.tsx:53` | "You're offline — new changes stay on this device until you're back online." | **FALSE.** Changes stay in the page's memory, not on the device — unless the inspection has already saved once. It is also the *only* version of this banner that can ever appear (see below). |
| `TechnicianInspectionForm.tsx:4455-4459` | "You're offline — not saved to the server. Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online." | **HALF FALSE — corrected 2026-09-05.** The second sentence is the retry promise and it is **true**: the dirty flag survives and the 30s timer retries. The first sentence, *"your changes are only on this device for now"*, is **false at the moment it appears** — this toast is fired by the mount-anchored interval, which almost always beats the keystroke-anchored backup write. In the reproduction the changes were on no device at all. "Keep this form open" is the only part carrying real weight, and it is doing more work than the technician can tell. |
| `TechnicianInspectionForm.tsx:4640-4644` | "You're offline — inspection not submitted. Nothing was sent to the server… keep this form open and tap Complete again once you're back online." | **True.** Guarded by `lastSaveFailedOfflineRef` so Complete can never report success over a save that never landed. |
| `TechnicianInspectionForm.tsx:3650-3651` | "Photos can't be uploaded without a connection and are not kept on this device." | **True**, and the most useful sentence in the app. |
| `Section3BeforePhotos.tsx:332` / `Section4AfterPhotos.tsx:228` | "You're offline — the photo was not uploaded and is not kept on this device." | **True.** |
| `useJobCompletionForm.ts:327-328`, `:441-442` | Same wording as the inspection form, for jobs. | **True.** |
| `useOfflineSync.ts:74` | "Back online" | True, but it means the radio came back, not that anything synced. |
| `QuarantinedPhotosBanner.tsx:43` | "N photos couldn't sync — review required" | **Unreachable.** Cannot render; nothing can ever be quarantined. |
| `SyncIndicator.tsx:5-9` | Pills: Synced / Pending / Syncing / Offline / Sync Error | Only **Offline** is reachable, and not reliably — see below. |
| `FormRecoveryToast.tsx:21` | "Recover unsaved inspection data?" | **Unreachable.** The component is not mounted anywhere. |
| `docs/HOW_TO_USE_THE_APP.html:654` | "Be straight about this: the form does not work offline." | **True**, and correctly framed. |
| `docs/HOW_TO_USE_THE_APP.html:674-677` | "the form keeps a backup on your device, refreshed every 30 seconds… reopen the form within 24 hours and you'll see 'Unsaved work found'" | **FALSE in the case that matters.** No backup exists for an inspection that has never saved to the server. Also "every 30 seconds" describes an interval; the code is a 30-second debounce. |
| `docs/MRC_MASTER_BACKLOG.md:2501-2503` | "Why offline sync exists… Dexie + auto-save every 30 seconds." | **Half false.** The auto-save is real. Dexie has done nothing since the day it was added. |
| `docs/MRC_MASTER_BACKLOG.md:267` | "`SyncManager.ts` — Dexie offline sync — technicians work in basements with no signal" | **False.** It is inert. |
| `docs/PHASE_2_EXECUTION.md:18,30` | Records offline support as **Complete**, naming "IndexedDB, SyncManager, photo queue, offline banner" | **Three-quarters false.** The first three are dead; the banner is the one piece that genuinely runs. The same file also plans a `jobCompletionDrafts` Dexie store (`:330,344,381`) that was never built — `db.ts` v2 added `quarantinedPhotos` instead. |
| `CLAUDE.md` | "Auto-save every 30 seconds on forms", "Zero data loss on navigation" | Both **true** as written. Navigation genuinely does not lose data. |
| `photoUpload.ts:82-83` (code comment) | "If offline, automatically queues for later sync." | **False.** No queue call exists in that function. |

### Why the banner can only ever tell the lie

`OfflineBanner` picks between three messages (`:49-53`):

```js
const message = syncState === 'syncing'
  ? 'Syncing your changes...'
  : pendingCount > 0
    ? `You're offline. ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending.`
    : "You're offline — new changes stay on this device until you're back online.";
```

`pendingCount` comes from `syncManager.getPendingCounts()`, which counts rows in
the Dexie stores. Nothing writes to them, so it is always 0, so the first two
branches are dead and the third is the only reachable one. The two accurate
messages are the ones that were switched off.

Same mechanism on the indicator. `SyncIndicator` hides itself when synced and
empty (`:16`), and `useOfflineSync` can only reach `'offline'` or `'synced'` when
the count is permanently 0 (`useOfflineSync.ts:30-36`). So the technician sees a
red "Offline" pill or nothing at all — never a green "Synced", never a count.
It does not claim work is safe. It just cannot say anything useful.

Even the "Offline" pill is not guaranteed. `useOfflineSync` gets connectivity
from `useNetworkStatus`, which is **event-only** — `window.addEventListener('online'/'offline')`
with no polling (`useNetworkStatus.ts:8-19`). `OfflineBanner` does not trust
those events and polls every 3 seconds precisely because "iOS Safari often fails
to fire the window 'online'/'offline' events" (`OfflineBanner.tsx:5-9`). The
indicator has no such fallback. On the exact devices the comment is about, the
banner appears and the indicator stays blank.

### The uncomfortable detail

The false line was **added by the commit that made everything else honest** —
`b6d3639 feat(offline): honest offline messaging + job photo lightbox`, 1 Aug
2026. That commit wrote the truthful save toasts, the truthful photo toasts, and
the `lastSaveFailedOfflineRef` Complete guard. It introduced this line at the
same time. That is why it has survived review: it reads as part of the fix.

---

## c. THE GAP

### UNPROVEN — the recovery prompt may crash the app if it ever renders

**Status: neither confirmed nor disproved.** The 2026-09-05 reproduction did not
reach this path. No "Unsaved work found" prompt appeared, because no backup had
been written, so the code below never executed. The browser test that disproved
the *scoping* of the backup finding says nothing either way about this one.

Kept in the report rather than deleted, because if it is real it changes the
order of the fix. The static reading follows; treat it as a hypothesis.

The inspection form imports the shadcn toast (`TechnicianInspectionForm.tsx:6`,
`import { useToast } from '@/hooks/use-toast'`). That toast's `action` is typed
as a React **element**:

```ts
// src/hooks/use-toast.ts:12
action?: ToastActionElement;
// src/components/ui/toast.tsx:99
type ToastActionElement = React.ReactElement<typeof ToastAction>;
```

and the host renders it straight into the tree as a child
(`src/components/ui/toaster.tsx:16`):

```jsx
{action}
```

The restore prompt passes a plain object, with `as any` silencing the compiler
(`TechnicianInspectionForm.tsx:4527-4535`):

```js
action: {
  label: 'Restore',
  onClick: () => {
    setFormData(parsed.formData);
    ...
  },
},
} as any);
```

React does not render plain objects as children — it throws *"Objects are not
valid as a React child (found: object with keys {label, onClick})"*. And
`<Toaster />` is mounted at `App.tsx:508`, a **sibling above** `<ErrorBoundary>`
at `:510`, with no boundary in `main.tsx` either. An error thrown there is not
caught by anything and unmounts the whole React root.

`ToastAction` — the component that would make this correct — is never used
anywhere in the app.

The two other sites that pass an object action, `useJobCompletionForm.ts:404`
and `FormRecoveryToast.tsx:23`, both import `toast` from **sonner**, which
accepts `{ label, onClick }`. They are fine. The inspection form is the only one
using the shadcn toast with an object action.

**Why nobody has hit this:** the prompt only fires when a backup is actually on
disk, and — as the reproduction showed — a backup is almost never on disk. The
code has probably never run in production. That is also why the 2026-09-05 test
did not settle it.

**What would settle it.** The test has to *force* a backup to exist first, which
the earlier attempt did not do:

1. Open an existing inspection **online** and let it load fully.
2. Go offline (DevTools → Network → Offline).
3. Change one field, then **do not touch the form for 60 seconds.** This is the
   step that matters — the debounce needs 30 uninterrupted seconds, and the
   earlier test reloaded before it elapsed.
4. In DevTools → Application → Local Storage, confirm a key
   `mrc_inspection_backup_<inspection-id>` now exists. **If it does not, this
   section is moot and the backup write is broken more deeply than the debounce
   explains — report that, it would be a bigger finding than the crash.**
5. With the key confirmed present, reload the page.
6. Watch what happens in the first two seconds.

Outcomes: a **Restore button** means this finding is wrong and recovery works.
A **white screen**, or `Objects are not valid as a React child` in the console,
means it is right and it is a P0 that comes before any other offline work. A
reload that shows the old value with **no prompt and no crash** means something
third is going on and the restore effect is not running at all — also worth
knowing.

### Scope of the loss — two questions the reproduction raised

**Is an edit made BEFORE going offline any safer than one made after?**

"Before vs after going offline" is not the axis. The real axis is **did a
successful save land in between**. An edit is safe only once
`setHasUnsavedChanges(false)` at `:4424` has run, which happens only inside the
success path of `handleSave`. Concretely:

- Edited online, an auto-save tick succeeded, *then* signal dropped — **safe**,
  it is on the server. Note that same success also deleted the on-device backup
  (`:4544-4548`), so it is on the server and nowhere else.
- Edited online but signal dropped before the next tick — **exactly as exposed
  as an edit made offline.** The tick fires, fails, and the edit is in memory
  only. The technician cannot tell these two cases apart; both show the same
  amber toast.

Since ticks are 30 seconds apart and anchored at page load, there is always a
rolling window of up to 30 seconds of work in this state, even with perfect
signal. Going offline just freezes that window open indefinitely.

**Does Section 3 area data behave differently from a Section 1 text field?**

**Yes — Section 3 is worse, and this is a bug in its own right, not an offline
one.** There are only three `setHasUnsavedChanges` calls in the entire 4,880-line
file (`:3465`, `:3475`, `:4424`). Plain area fields are covered by `:3475`. But
**eight other Section 3 / Section 4 mutators call `setFormData` without setting
the dirty flag at all**:

| Line | Handler |
|---|---|
| `:3478` | `handleAddArea` |
| `:3486` | `handleRemoveArea` |
| `:3503` | `handleMoistureReadingAdd` |
| `:3520` | `handleMoistureReadingRemove` |
| `:3531` | `handleMoistureReadingChange` |
| `:3553` | `handleSubfloorReadingAdd` |
| `:3565` | `handleSubfloorReadingRemove` |
| `:3572` | `handleSubfloorReadingChange` |

(`handleCalculateDewPoint` at `:3586` is *not* one of them — it delegates to
`handleAreaChange` and `handleChange`, so it does set the flag.)

Everything that protects work is gated on that flag, so all eight edits are
invisible to **all four** of these:

- the 30-second auto-save — `if (hasUnsavedChangesRef.current …)` (`:4486`)
- the save on Next/Previous — `if (hasUnsavedChanges) handleSave()` (`:4569`, `:4733`)
- the localStorage backup — `if (!localStorageKey || !hasUnsavedChanges) return` (`:4497`)
- the Back-navigation warning — `if (hasUnsavedChanges) { window.confirm(…) }` (`:3864`)

So a technician who enters a room's **moisture readings and nothing else**, then
taps Next, triggers no save and gets no warning. Those readings reach the server
only if they tap **Save** explicitly — the Header and Footer buttons call
`handleSave` unconditionally (`:4770`, `:4798`) — or if some *other* edit happens
to set the flag and drag the whole form along with it, since `handleSave` always
writes everything.

That last mechanism is why this has not been catastrophic: in normal use people
type in other fields too. But it means moisture readings, the core measurement
data of an inspection, are persisted by luck rather than by design — and offline
it compounds, because they are not backed up either.

**This is separate from the offline work and deserves its own tracker item.**
It is a data-loss bug with signal, not just without it.

For the plain fields that *do* set the flag, the two paths are identical: same
`formData` object, same debounce, same exposure.

```js
// :3463-3466  — Section 1 "Attention To" goes through this
const handleChange = (field: keyof InspectionFormData, value: any) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
  setHasUnsavedChanges(true);
};

// :3468-3476  — Section 3 area fields go through this
const handleAreaChange = (areaId: string, field: keyof InspectionArea, value: any) => {
  setFormData((prev) => ({ ...prev, areas: prev.areas.map(...) }));
  setHasUnsavedChanges(true);
};
```

These two are equivalent — same object, same flag, same debounce. It is the nine
handlers in the table above, which set no flag at all, that make Section 3 worse.

Area work is also more exposed by degree even where the flag is set, because
filling in areas involves sustained typing, which resets the debounce
continuously.

One asymmetry runs the other way: area rows are written to
`inspection_areas` **after** the `inspections` write in `handleSave`. Offline the
`inspections` write throws first (`:4145`/`:4153`), so the area writes are never
attempted at all — which is why an offline save fails cleanly rather than
partially. On a flaky connection that protection disappears; see the
flaky-signal section above.

### Genuinely at risk

**1. In practice, no inspection has a safety net while the technician is
working. (The real one — and broader than this report first said.)**

Two independent causes, and either alone is enough to lose the work:

- **On any inspection, new or existing:** the backup timer restarts on every
  keystroke, so it only fires after 30 uninterrupted seconds. A technician
  filling in a form does not sit still for 30 seconds, so the write does not
  happen. **This is what the 2026-09-05 reproduction hit**, on an inspection
  that had a server id and which the earlier version of this report called safe.
- **On a brand-new inspection additionally:** `localStorageKey` is null until
  the server has accepted a save, so the backup effect returns on its first line
  and nothing is ever written no matter how long they wait.

Either way the work exists only in the page's memory, and anything that ends the
page ends the work:

- closing the tab or the PWA
- pull-to-refresh, an accidental back-swipe
- iOS reclaiming a backgrounded PWA — which techs do constantly between rooms;
  `OfflineBanner.tsx:8` names this behaviour in a comment ("techs background the
  app between rooms")
- the service worker updating mid-shift (`registerType: "autoUpdate"`,
  `skipWaiting: true`, `clientsClaim: true` in `vite.config.ts:37-39`)
- a crash

and there is **no `beforeunload` guard anywhere in the codebase**:

```
$ grep -rn "beforeunload\|onbeforeunload\|useBlocker\|unstable_usePrompt" src/
(no matches)
```

`handleBack` has a `window.confirm` (`:3863-3867`), but that only covers the
in-app back button. The browser's own close, refresh and back are unguarded.

The exposure is the full 30 minutes, and the technician has been told in writing
that a backup exists.

**2. The team has been promised, in writing, a backup that does not exist.**

`docs/HOW_TO_USE_THE_APP.html:674-677` — the document Glen, Clayton and Vryan
are told to read — says:

> "There is also a safety net: the form keeps a backup on your device, refreshed
> every 30 seconds. If the app crashes or the page reloads, reopen the form
> within 24 hours and you'll see 'Unsaved work found' with a 'Restore' button —
> tap it and your work comes back."

It is wrong four ways, and there is no case in which it is true.

- **"Refreshed every 30 seconds" is false.** It is a debounce, not an interval:
  it restarts on every keystroke and only fires after 30 uninterrupted seconds
  of not touching the form. During active work it does not fire at all. This is
  the sentence that made the reproduction's outcome surprising, and it is the
  most important line in the document to correct.
- **Even when it does fire, it has usually just been deleted.** The clear effect
  removes the backup after every successful save, so during a normal online
  session there is nothing on disk at essentially any moment.
- For an inspection that has never reached the server, **no backup is written at
  all**, however long they wait, so there is nothing to restore.
- **"Within 24 hours" is not the window.** The backup is deleted from the device
  the instant the form reopens; the only chance to recover is the 10-second
  toast. A technician who follows this paragraph literally — reopens the form
  later that day, reads the message, goes to find their phone charger, comes
  back — has by then destroyed the backup by opening the form.

`:739-741` repeats the same promise for the job completion form, and `:1346-1347`
repeats it again in "Things the app does by itself".

**This line needs correcting whether or not the code is fixed.** It is the one
place the promise is made to the team in their own words, and it is the reason a
technician would feel safe closing the app. Correcting the doc is a
five-minute change and does not depend on any code decision. If the code fix
lands, the paragraph becomes true and can stay; if it does not, the paragraph
has to say that a brand-new inspection is only held in the open page.

**3. The job completion form cannot be opened offline at all.** `jobCompletionId`
comes from two network calls at mount; either throwing sets `error`
(`useJobCompletionForm.ts:290-292`), and `JobCompletionForm.tsx:104-116` renders
an error screen instead of the form body. So a technician who arrives at a job
with no signal cannot even start it. That is a hard stop rather than silent data
loss, and it is arguably the safer behaviour — but nobody has decided that on
purpose, and the technician-facing doc does not mention it.

Its `handleSave` also opens with `if (!jobCompletionId) return` (`:317`), and
`localStorageKey` is null without it (`:364-366`) — the same shape as the
inspection form, but unreachable from the UI because the form never renders
without the id. Separately, five call sites on that page call `handleSave()`
un-awaited and uncaught while `handleSave` re-throws (`:336`), so an offline
save from any of them produces an unhandled promise rejection.

**4. The banner actively misleads.** A technician who reads "new changes stay on
this device" has been given permission to close the app. That turns risk 1 from
an edge case into an instruction.

**5. Photos are a workflow cost, not a bug.** Nothing is lost that the tech
wasn't told about, but a subfloor with no signal means no photos at all, and
they must remember what they owe. `MRC-APP-1D` ("Photo upload failed",
`/technician/inspection`, iPhone Safari, first 2 Sep) is in the tracker.

### Not at risk — stop worrying about these

- **Section navigation.** One shared `formData`, saves fire-and-forget, nothing
  unmounts. Steps 4 and 5 of the scenario are safe.
- **Reconnection, if the form is still open.** Automatic, whole-form, within 30
  seconds. No manual step. The dirty flag survives the failure, so the retry is
  real. This is the one part of the offline story that genuinely works.
- **Anything to do with the Dexie queue.** It cannot lose data because it never
  holds any.

**Removed from this list on 2026-09-05, because the reproduction disproved them:**

- ~~"Work already saved once. After the first successful save the tech has both a
  server row and a debounced on-device backup with a 24-hour restore window."~~
  **False.** The edits made *after* that save are the ones at risk, and they are
  not backed up while the technician is still typing. Having saved once protects
  what was saved, and nothing since.
- ~~"Silent data loss during an offline spell. The tech is told every 30
  seconds…"~~ **False as reassurance.** They are told every 30 seconds, but what
  they are told is wrong: the message asserts the work is on the device when it
  usually is not. Being told frequently is not the same as being told correctly,
  and the loss at reload is silent — nothing warns that anything went missing.

---

## FOUR SUBSYSTEMS SHIPPED AND NEVER CONNECTED

This is the part of the investigation that generalises beyond offline.

| What | Added in | Ever wired? |
|---|---|---|
| `src/lib/offline/` write side — `saveDraft`, `queuePhoto`, `syncAll`, the quarantine path, all four Dexie stores | `330310c`, 2026-02-10 | **No.** Never had a caller. |
| `queuePhotoOffline` in `photoUpload.ts` | `330310c`, 2026-02-10 | **No.** Only its definition and two comments mention it. |
| `src/components/FormRecoveryToast.tsx` | `6c6b22e`, 2026-03-11 | **No.** Nothing imports it. |
| `src/lib/api/apiClient.ts` — `supabaseMutation` and its offline guard | `6c6b22e`, 2026-03-11 | **No.** Only its own test file imports it. |

Two commits, seven months ago, four subsystems. **Nothing was disconnected — none
of it was ever connected.** `git log -S` on each symbol shows the definition
arriving in a commit and never acquiring a call site:

```
$ git log --oneline --diff-filter=A -- src/lib/offline/db.ts
330310c feat: Production deployment prep — Admin fixes, Edge Functions, E2E verified

$ git log --oneline --diff-filter=A -- src/components/FormRecoveryToast.tsx src/lib/api/apiClient.ts
6c6b22e feat: production-ready error handling, Sentry monitoring & offline resilience
```

Both commit messages announce the capability. Neither delivers it.

### Why nobody noticed for seven months

Four things covered for each other:

- **The tests pass.** `SyncManager.test.ts` has 14 green tests. Every one seeds
  the queue by hand inside the test body (`await sm.saveDraft({ id: 'draft-2', … })`).
  Not one asserts that production code enqueues anything. `apiClient.test.ts`
  imports `supabaseMutation` directly. A green suite proves the machine works
  *if something feeds it*, and reads as proof the feature works.
- **The read side is mounted and visible.** `OfflineBanner` and
  `QuarantinedPhotosBanner` are in `App.tsx`, `SyncIndicator` is in the
  technician nav. Real components, in the real tree, reading an empty store.
  The wiring looks present because half of it is.
- **The docs describe the intent, not the state.**
  `MRC_MASTER_BACKLOG.md:267` lists `SyncManager.ts` in the architecture table
  as "Dexie offline sync"; `:2501` explains why it exists. Both were written
  from the commit message.
- **The dead branches produce visible output.** `OfflineBanner` reads
  `pendingCount` from the empty queue and, because it is always 0, renders a
  sentence. The sentence is wrong, but it is *there*, which reads as the feature
  working.

### Candidate bug class

Proposed for `docs/BUG_LEDGER.md`, in the house format:

```
## CLASS: Subsystem shipped without a caller
A complete, tested subsystem is committed with no production call site. It is
never removed and never connected, so it reads as a working feature: the module
exists, the tests are green, the architecture docs list it, and any UI that
reads its (permanently empty) state still renders. The tests pass because they
construct their own inputs — they exercise the subsystem, never the wiring.
Instances: the Dexie offline queue, queuePhotoOffline, FormRecoveryToast,
apiClient.supabaseMutation (all offline, 330310c + 6c6b22e, Feb–Mar 2026)
Check: for every module that claims a capability, grep its public entry points
across src/ and classify each hit as PRODUCTION CALLER / TEST / DEFINITION /
RE-EXPORT. If the only non-test hit is the definition, the feature does not
exist regardless of what the tests, the docs or the UI say.
Corollary for tests: a unit test that seeds its own input proves the unit, not
the feature. At least one test per subsystem should start from the user action.
```

Four instances in one domain from two commits is not four accidents. It is one
habit: shipping the mechanism and the announcement in the same commit, and
leaving the connection for later. Worth checking the other "production
readiness" commits from the same period for the same shape before assuming
offline was the only place it happened.

---

## d. OPTIONS

### Option 1 — Stop the UI lying, and make the backup actually happen

**Rescoped 2026-09-05.** This option was originally two edits, on the premise
that only brand-new inspections were exposed. The reproduction showed the
debounce is the bigger cause and affects everything, so there are now three
parts and 1b is the important one.

**1a. The banner.** `OfflineBanner.tsx:49-53`. Delete the dead `pendingCount`
branches and replace the message with something true:

> "You're offline. Keep this form open — your work saves automatically when
> signal returns."

Also removes the last live read of the Dexie queue from the banner.

**1b. Make the backup fire while the technician is working. (The one that
matters.)** `TechnicianInspectionForm.tsx:4496-4510`. The debounce is the defect:
it restarts on every keystroke, so it never fires during exactly the activity it
exists to protect. It should be a **throttle or an interval**, not a trailing
debounce — write at most every N seconds *while dirty*, rather than N seconds
after the last change. A 5–10 second interval writing to `localStorage` is
cheap; the form state is a small JSON blob.

The same change should also make the write happen **immediately on the first
failed save**, so that the moment the app tells a technician their work is on
the device, it is.

**1c. The key gate.** `:4494`. Key the backup on something that exists before the
first server round-trip; `leadId` is in the URL and available on mount:

```js
const localStorageKey = currentInspectionId
  ? `mrc_inspection_backup_${currentInspectionId}`
  : `mrc_inspection_backup_lead_${leadId}`;
```

Care needed on the transition: the restore-on-mount and clear-on-save effects
key off the same value, so an inspection that moves from lead-keyed to id-keyed
must not orphan or double-offer a backup.

**1d. Reconsider the clear, and the recovery path.** `:4544-4548` deletes the
backup on every transition to clean, including every successful auto-save, so an
online technician has no backup on disk at any moment. Whether that is right
depends on what the backup is for — if it is crash recovery, it should probably
survive until the work is provably on the server *and* the form has moved on.

**Fixing 1b alone is not enough.** Even with a backup that reliably exists,
recovery is still a single 10-second toast that the technician has to notice and
tap, on a phone, in the field — and the key is deleted in the same render that
offers it. A backup nobody can retrieve is not much better than no backup. The
session should decide what recovery actually looks like, not just make the write
fire.

**1f. Apply the same fix to the job completion form.**
`useJobCompletionForm.ts:369-384` is the identical effect — same guard, same
`setTimeout`, same four-element dependency array, same cleanup, same
`removeItem` at `:423`. Its own comment at `:368` correctly calls it a "debounce
pattern", which is how the inspection form's mislabelled comment was caught. If
only one is fixed, Phase 2's job-completion workflow keeps the same loss window.

Also fix the two false doc lines (`HOW_TO_USE_THE_APP.html:674-677`,
`MRC_MASTER_BACKLOG.md:2501-2503`).

Optionally **1e**: a `beforeunload` guard while `hasUnsavedChanges` is true.

**Cost, rescoped.** 1a half an hour. 1b 2–3 hours — changing the timer is a
few lines, but it needs a test that actually asserts a write happens *during*
continuous editing, which is the assertion nobody wrote the first time. 1c 2–3
hours including the transition case. 1d is a decision plus an hour. 1e an hour.
Still a **single session**, now closer to a full day than a half. One file for
the banner, one for the form, two docs. No migration, no Edge Function, no
schema.

**Ordering note:** settle the UNPROVEN crash question first (test in section e).
If the restore prompt does crash, fixing it is small and belongs in the same
session — but the session should not ship a backup that finally gets written
only for the recovery path to white-screen on it.

**What it buys:** a backup that exists during the work it is supposed to protect,
and an app that stops telling technicians something untrue. After this, "keep
the form open" is honest advice rather than the only thing standing between a
technician and losing their morning.

#### What Option 1 does NOT fix — read this before repeating it to anyone

**Option 1 does not make the app work offline.** It makes the app tell the
truth about not working offline, and it makes the crash net real. That is all.
After Option 1 ships, every one of the following is still true:

- **Photos still cannot be taken offline.** No photo, no queue, nothing held on
  the device. A technician in a subfloor with no signal still leaves with zero
  photos and has to remember what they owe and re-shoot them later. This is the
  single biggest day-to-day cost of offline and Option 1 does not touch it.
- **Nothing reaches the server while offline.** No inspection row, no areas, no
  moisture readings. The job is not visible to the office until signal returns.
- **A form that is closed is still a form that stops retrying.** Option 1b means
  the work is *recoverable* after a crash, not that it *saves itself*. The
  technician still has to reopen the form and tap Restore. If they never reopen
  it, or reopen it more than 24 hours later, the work is still gone.
- **The 24-hour backup window is unchanged**, and the backup is still a
  debounce — work done in the last 30 seconds before a crash is still lost.
- **The form may still not open at all offline.** The mount fetches lead and
  inspection data over a cache that expires after an hour (see section e). If
  that turns out to fail, Option 1 does not help — a tech who cannot open the
  form has nothing to protect.
- **Sync status is still not shown**, because there is still nothing to sync.
  The indicator will still only ever say "Offline" or nothing — and on iOS,
  where its event-only detection fails, often nothing.
- **A partly-failed save still reports success.** The swallowed area,
  moisture-reading and subfloor-update writes are a separate bug of a different
  class and Option 1 does not go near them.
- **The job completion form still cannot be opened without signal.**
- **Photos are still refused only after the technician has taken them**, not
  before the camera opens.

And two things that must be settled *before* Option 1 is scoped, because they
change what it means:

- **If the restore toast does crash the app, that is a P0 and it comes first.**
  There is no point hardening a backup whose only recovery path white-screens.
  Fixing it is small — pass a `<ToastAction>` element instead of an object, or
  switch that call to sonner like the job form — but it has to be known first.
- **The backup is deleted after every successful save**, so Option 1b's re-key
  needs to decide when a backup should actually persist. Keying it on `leadId`
  without touching the delete effect would still leave an online technician with
  no backup on disk at any moment.

If the honest one-line summary after Option 1 is needed: *"The form needs signal
to save. It keeps trying while you leave it open, and if it crashes you can get
your work back for 24 hours. Photos still need signal."*

Anyone who reads Option 1 as "offline now works" will make worse decisions than
they would have made before it shipped.

### Option 2 — Wire up the existing Dexie queue

What is actually missing, having read it: the queue itself is complete and
tested. What is absent is the enqueue side and, more importantly, the *decision*
about what offline means.

To make it work you would need:
- a call to `saveDraft` from the inspection form's save path when the network
  fails, with `formData` mapped to a draft;
- the reverse mapping on recovery — and `syncDraft` writes `draft.formData`
  straight onto the `inspections` table columns (`SyncManager.ts:206-210`),
  which is not the shape `TechnicianInspectionForm` holds. Its `handleSave` is a
  multi-table upsert across `inspections`, `inspection_areas`,
  `subfloor_data`, `moisture_readings`. `syncDraft` writes one table. **The
  queue cannot currently express an inspection.** This is the real work.
- photo capture rerouted through `queuePhotoOffline` with blobs held in
  IndexedDB, plus a storage-quota story for a day of subfloor photos;
- `FormRecoveryToast` mounted;
- conflict handling for a draft that syncs after someone edited the row;
- the whole thing exercised offline on a real iPhone, because none of it has
  ever run in production.

**Cost:** a genuine multi-session build. The queue is maybe 20% of it; the
mapping, the photo blob lifecycle and the testing are the rest. Realistically
**a week of sessions**, and it touches `TechnicianInspectionForm.tsx` and
`photoUpload.ts`, both of which other sessions are working in.

**What it buys:** photos offline, and survival across an app kill. Those are the
two things Option 1 does not give you.

### Option 3 — Delete the dead layer, keep Option 1

The code suggests this. Four dead modules, seven months old, never called,
actively generating false confidence — a green test suite, a "Dexie offline
sync" line in the architecture table, and a banner that reads the empty queue
and produces a false sentence because of it.

Delete `src/lib/offline/{db,SyncManager,types,photoResizer,useOfflineSync,useNetworkStatus,useQuarantinedPhotos,SyncIndicator,index}.ts(x)`,
`FormRecoveryToast.tsx`, `apiClient.ts`, `queuePhotoOffline`, and the two test
files; drop `QuarantinedPhotosBanner` and the `SyncIndicator` from the nav; drop
`dexie` from `package.json`. Do Option 1 in the same session.

**Cost:** on top of Option 1, about **two hours**. `OfflineBanner` needs its own
`navigator.onLine` state, which it already has (`:12`) — it only uses
`useOfflineSync` for the two dead branches.

**What it buys:** the docs stop describing a system that does not exist, and the
next person to ask "does offline work?" gets the answer from the code in ten
seconds instead of a session.

### Recommendation

**Option 1 now, as a single session — now closer to a full day than a half.
Option 3 folded into it if you want the ledger clean. Option 2 only if Glen or
Clayton say photos-offline is a real operational need — and that is a business
call, not an engineering one.**

> **Ruled 2026-09-05 (Michael): Option 1 endorsed — fix the backup gate and the
> banner. Dexie is explicitly not being wired: a week of work blocked on a
> question nobody has put to Glen yet.** Implementation is a later session; this
> report changed no code.
>
> **Rescoped the same evening** after the reproduction. The ruling stands and
> nothing about it depends on the corrections — Option 1 is still the right call
> and Dexie is still not the answer. But 1b is now a different, larger and more
> important edit than "fix the backup gate": the gate was never the main cause,
> the debounce was. Two further items surfaced that were not on the table when
> the ruling was made and are **not** part of Option 1: the dirty-flag gap on
> moisture readings, and the swallowed partial-save writes. Both want their own
> tracker entries.

The reasoning is unchanged and if anything stronger: the harm on the table is a
technician losing their morning's work after the app told them twice it was
safe. That has now been demonstrated rather than predicted. Option 2 is a week
and buys capability the team may not need — techs currently cope by taking
photos when they surface.

**What I would not do:**

- **I would not build Option 2 before someone answers whether photos-offline is
  needed.** It is most of the cost and it is the only thing Option 1 cannot
  deliver. Ask first.
- **I would not wire the queue up as-is.** `syncDraft` writes a single flat table
  and the form owns four. Connecting it without fixing that would produce
  drafts that sync into a partly-populated inspection — worse than no queue,
  because it would look like it worked.
- **I would not touch `TechnicianInspectionForm.tsx` in parallel with Sessions G
  or G2.** The changes are small but the file is contested, and 1b now touches
  the timer as well as the key.
- **I would not leave the banner as it is while deferring the rest.** It is the
  cheapest edit here and the only one that changes what a technician *does*.
- **I would not ship 1b without a test that asserts a write happens during
  continuous editing.** That is the exact assertion nobody wrote the first time,
  and its absence is why this shipped and why the first version of this report
  believed the feature worked.
- **I would not fold the moisture-reading dirty-flag gap into this session.** It
  is a bigger blast radius — eight handlers, and it changes when saves fire with
  full signal. It deserves its own session and its own testing, not a ride-along
  on an offline fix.

---

## e. WHAT I COULD NOT DETERMINE BY READING

**Answered on 2026-09-05:** *does an existing inspection with a server id keep an
offline edit across a reload?* **No.** Reproduced above. That test also showed
there is no crash on that path and no restore prompt, because no backup existed.

| Question | Runtime test |
|---|---|
| **Does the backup write EVER fire?** The debounce explains the reproduction, but only if the write works once 30 quiet seconds elapse. If it never writes even then, something worse is wrong. | Open an existing inspection online, go offline, change one field, then **do not touch anything for 60 seconds**. DevTools → Application → Local Storage. Key `mrc_inspection_backup_<id>` present = the debounce is the whole story and Option 1b fixes it. Absent = the write is broken outright and this report still understates the problem. |
| **Does the "Unsaved work found" toast crash the app?** Still open — the 2026-09-05 test never reached it. | Run the test above first so a backup provably exists, *then* reload. Restore button = the crash finding is wrong. White screen, or `Objects are not valid as a React child` in the console = it is right and it is a P0 ahead of the rest of Option 1. Old value with no prompt and no crash = the restore effect is not running at all, which is a third finding. |
| **Does an offline reload with a cold cache create a duplicate inspection row?** INFERRED, not reproduced. The 2026-09-05 test had a warm cache, so the form reloaded with its saved values rather than blank. | Open an inspection, go offline, wait out the one-hour REST cache (or clear the `supabase-api-cache` entry in DevTools → Application → Cache Storage), reload. If the form comes back **empty**, type something and go back online. Then check whether the lead now has two `inspections` rows. A duplicate would be a data-integrity bug worth its own item. |
| **Do moisture readings save on their own?** The eight handlers set no dirty flag. | Open an inspection, add a moisture reading and change nothing else, wait 40 seconds without touching the form, then reload without pressing Save. If the reading is gone, the dirty-flag gap is confirmed with signal, not just without it. |
| Does the inspection form even open offline? The shell is precached, but the mount fetches the lead, booking and existing inspection over `/rest/`, cached `NetworkFirst` with `maxAgeSeconds: 60 * 60` (`vite.config.ts:91`). An hour after the tech last loaded that job, the cache entry has expired. | On the Vercel preview after a full SW reset: open a technician job online, wait, go offline in DevTools, hard-navigate to the form URL. Does it render with data, render empty, or fail? Repeat >1 hour later. Empty-but-rendered is the dangerous outcome — the tech could start typing over nothing. |
| Does the auth token survive a long offline spell? `autoRefreshToken: true` and `useSessionRefresh` refreshes at <10 min to expiry, but `/auth/` is `NetworkOnly`. If the JWT expires during a 90-minute basement job, does the first reconnected save 401 and lose the retry? | Log in, go offline, advance past token expiry, edit the form, reconnect. Watch whether the next auto-save succeeds or 401s. A 401 here would turn "keep the form open" into false advice. |
| What does a mid-shift deploy do to an open form? `skipWaiting` + `clientsClaim` + `autoUpdate`. Does the page reload and drop in-memory `formData`? | Open the form with unsaved changes, deploy to preview, watch. If it reloads, this is a second silent-loss vector with the same root cause as risk 1 and the same fix. |
| The "bars but no packets" case — radio connected, no route. `navigator.onLine` is `true`, so `OfflineBanner` and `SyncIndicator` stay hidden and the photo guards let the upload start. Does `isNetworkLevelError` still catch it via the message sniff, so the save toast is still correct? | Devtools throttling to a black-holed proxy, or a real basement. Check which toast appears on a failed save and whether the photo upload hangs rather than failing. |
| Does iOS actually kill the backgrounded PWA often enough to matter? | Ask Clayton and Glen directly — this is the frequency term on risk 1 and it decides whether Option 1b is urgent or merely correct. |
| Is `localStorage` ever full on a working phone? Both backup writes swallow the exception silently (`:4505-4507`). | Check `navigator.storage.estimate()` on a real tech device at the end of a shift. |

None of these change the recommendation. Every one of them makes risk 1 worse if
it goes the wrong way, and none of them makes it better.

---

## Reading notes

Read against `origin/main` at `4d7c15b` in `~/mrc-offline`. The only difference
between `main` and `production` in any file touched here is a subfloor-hours
pricing change in `TechnicianInspectionForm.tsx` — nothing offline-related. The
findings apply to the live app.

GitNexus was not used; every claim here comes from grep and direct reads, and
line numbers are from the committed files at that sha.

**Method.** Nine subsystems were read independently, then every claim was put to
a second reader whose instructions were to refute it by opening the cited lines.
That pass changed real conclusions — it caught that `syncAll()` never executes
rather than merely no-ops, that the photo picker opens before refusing, that the
backup is deleted after every save rather than once per reopen, and that
`PHASE_2_EXECUTION.md`'s dead-component list wrongly includes the one component
that works.

**It was still wrong about the thing that mattered most, and a five-minute
browser test found it.** Both readers and verifiers checked the backup's *guard
conditions* — is the key null, is the flag set — and none worked out when its
*timer* fires relative to the timer that produces the reassuring toast. The bug
was in the interaction between two effects that were each individually correct.
Reading found every condition and missed the race.

The lesson for the next investigation of this kind: when two timers govern a
promise and its fulfilment, draw the timeline before drawing a conclusion — and
when a report says a safety mechanism works, test it before merging rather than
after. This one was merged on a static reading and corrected within the hour.

Findings still labelled UNPROVEN are exactly the ones reading cannot settle.
They are not hedges on the rest, and after this they should be treated as
genuinely open rather than probably right.

No application code was changed. This branch contains one new file.

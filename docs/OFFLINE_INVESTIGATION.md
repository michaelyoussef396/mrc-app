# OFFLINE — WHAT ACTUALLY HAPPENS

Session O. Investigation only, no code changed.
Branch `docs/offline-investigation`, read against `origin/main` at `4d7c15b`.
Tracker item: **P1-22**.

**The question:** a technician is in a subfloor with no signal, 30 minutes into
the 9-section inspection form. What actually happens to their work?

**The short answer:** the work survives, as long as the form stays open. It is
held in the browser's memory and retried against the server every 30 seconds
until signal returns. Nothing is silently lost while the tech keeps working.

There are four real holes, and the first two are serious:

1. **The crash-recovery prompt appears to crash the app.** The inspection form
   passes a plain object where the toast library requires a React element, and
   the toast host sits outside every error boundary. On the reading of the code,
   a technician who reopens the form to recover lost work gets a white screen
   instead of a Restore button. **This one needs a two-minute runtime check
   before anyone acts on it** — it is the only finding here that could be a
   false alarm, and it is also the worst if it is true.
2. **A brand-new inspection that has never reached the server has no on-device
   backup at all.** The crash-recovery net the technician has been told about is
   switched off precisely in the case it exists for. And on an offline reload,
   the form comes back **blank** — the backup cannot be found without the server.
3. **One banner tells the technician the opposite of the truth** — and because
   of how it is written, it is the only version of that banner they can ever see.
4. **A partly-failed save still reports "Saved".** Area, moisture-reading and
   subfloor-update failures are swallowed; only the first write throws. Fully
   offline this is harmless, because the first write fails. On a flaky
   connection — bars, no packets, which is the subfloor case — it is not.

Everything else about offline in this app is either honest or harmless.

---

## The headline correction

The premise this session started from was that offline is wired to nothing and
the UI lies about it. Half of that is right.

The **Dexie offline queue is dead** — confirmed, and worse than assumed: it was
never wired, not unwired later. But the inspection form does not use the Dexie
queue. It has its own, separate offline handling, added seven months later, and
that handling is real, works, and is mostly truthful. The gap is much narrower
and much more specific than "offline does not work".

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
  seconds. In steady work it fires in the pauses; while someone is actively
  filling a section it does not fire at all. Navigating away within 30 seconds
  of the last keystroke runs the cleanup and cancels the pending write.
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

- **On an offline reload the backup cannot be found at all.** The key needs
  `currentInspectionId`, which on reopen comes from the mount fetch
  (`:3082-3092`) — a network call. Offline, `:3065` throws, the catch at
  `:3418-3424` shows "Failed to load data", `localStorageKey` stays null, and
  the restore effect returns at `:4514` without ever looking. **The technician
  gets an empty 9-section form with their work sitting unread in localStorage.**
  Worse: if they start typing into that blank form and signal returns,
  `handleSave` sees `currentInspectionId === null` and takes the INSERT branch
  at `:4148` — creating a **second inspection row for the same lead**.

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

**Whether anything is written to the device at this step depends entirely on
whether the inspection had ever saved before the signal dropped:**

| | `currentInspectionId` | localStorage backup | If the app dies now |
|---|---|---|---|
| Inspection opened and saved earlier while online | set | written 30s after typing stops | recoverable within 24h |
| Brand-new inspection, first save happened offline | **null** | **never written** | **everything is gone** |

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
| `TechnicianInspectionForm.tsx:4455-4459` | "You're offline — not saved to the server. Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online." | **True.** The dirty flag survives the failure and the 30s timer retries. "Keep this form open" is doing real work in that sentence. |
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

### The recovery prompt looks like it crashes the app

Flagged separately because it is the most severe thing found and because it is
the one finding that most needs confirming in a browser before anyone acts.

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

**Why this could have gone unnoticed for months:** the prompt only fires when a
backup is actually on disk, and the delete effect (below) wipes the backup after
every successful save. So it only appears after a crash or a close with unsaved
work — exactly the rare path nobody tests, and exactly the path the
documentation tells the team to rely on.

**Confirm before acting.** Open a saved inspection, make a change, wait for the
debounce, kill the tab, reopen. Either a Restore button appears (this finding is
wrong) or the app white-screens (this finding is right and it is a P0). Two
minutes. It is the first runtime test in section (e) for that reason.

### Genuinely at risk

**1. A new inspection started with no signal has no safety net. (The real one.)**

`localStorageKey` is null until the server has accepted a save, so the backup
effect returns immediately and nothing is ever written to the device. The work
exists only in the page's memory. Anything that ends the page ends the work:

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

It is wrong three ways.

- For an inspection that has never reached the server, **no backup is written at
  all**, so there is nothing to restore and no toast appears.
- **"Refreshed every 30 seconds" is a debounce, not an interval** — it fires
  after typing stops, and is cancelled outright if the tech leaves within 30
  seconds of the last keystroke.
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
- **Work already saved once.** After the first successful save the tech has both
  a server row and a debounced on-device backup with a 24-hour restore window.
- **Silent data loss during an offline spell.** The tech is told every 30
  seconds, the Complete button refuses to lie, and Sentry gets every failure.
- **Reconnection.** Automatic, whole-form, within 30 seconds. No manual step.
- **Anything to do with the Dexie queue.** It cannot lose data because it never
  holds any.

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

### Option 1 — Stop the UI lying, and fix the backup gate

Two edits, both small, and they are not the same size of idea.

**1a. The banner.** `OfflineBanner.tsx:49-53`. Delete the dead `pendingCount`
branches and replace the message with something true:

> "You're offline. Keep this form open — your work saves automatically when
> signal returns."

Also removes the last live read of the Dexie queue from the banner.

**1b. The backup gate — this is the one that actually protects work.**
`TechnicianInspectionForm.tsx:4494`. Key the backup on something that exists
before the first server round-trip. `leadId` is in the URL and available on
mount:

```js
const localStorageKey = currentInspectionId
  ? `mrc_inspection_backup_${currentInspectionId}`
  : `mrc_inspection_backup_lead_${leadId}`;
```

Needs care on two points: the restore-on-mount effect and the clear-on-save
effect both key off the same value, so an inspection that transitions from
lead-keyed to id-keyed must not orphan or double-offer a backup. That is the
whole design question, and it is a small one.

Optionally **1c**: a `beforeunload` guard while `hasUnsavedChanges` is true, and
fix the two false doc lines (`HOW_TO_USE_THE_APP.html:674-677`,
`MRC_MASTER_BACKLOG.md:2501-2503`).

**Cost:** 1a is half an hour. 1b is 2–3 hours including the transition case and
a test. 1c another hour. Call it a **half-day session**, one file for the banner,
one for the form, two docs. No migration, no Edge Function, no schema.

**What it buys:** closes the only genuine data-loss hole and stops the app
telling technicians something that isn't true. After this, "keep the form open"
is the honest instruction and the backup covers the case where they don't.

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

**Option 1 now, as a single half-day session. Option 3 folded into it if you
want the ledger clean. Option 2 only if Glen or Clayton say photos-offline is a
real operational need — and that is a business call, not an engineering one.**

> **Ruled 2026-09-05 (Michael): Option 1 endorsed — fix the backup gate and the
> banner. Dexie is explicitly not being wired: a week of work blocked on a
> question nobody has put to Glen yet.** Implementation is a later session; this
> report changed no code.

The reasoning: the actual harm on the table is one technician losing 30 minutes
because they closed an app that told them it was safe to close. Option 1b fixes
that for a few hours' work. Option 2 is a week and buys capability the team may
not need — techs currently cope by taking photos when they surface.

**What I would not do:**

- **I would not build Option 2 before someone answers whether photos-offline is
  needed.** It is most of the cost and it is the only thing Option 1 cannot
  deliver. Ask first.
- **I would not wire the queue up as-is.** `syncDraft` writes a single flat table
  and the form owns four. Connecting it without fixing that would produce
  drafts that sync into a partly-populated inspection — worse than no queue,
  because it would look like it worked.
- **I would not touch `TechnicianInspectionForm.tsx` in parallel with Sessions G
  or G2.** The one-line change at `:4494` is small but the file is contested.
- **I would not leave the banner as it is while deferring the rest.** It is the
  cheapest edit here and the only one that changes what a technician *does*.

---

## e. WHAT I COULD NOT DETERMINE BY READING

| Question | Runtime test |
|---|---|
| **Does the "Unsaved work found" toast crash the app?** The single most important open question here — everything about the recovery story depends on it. | **Do this first, it takes two minutes.** Open a saved inspection, change a field, wait 30 seconds for the debounce, kill the tab, reopen. Restore button = the finding is wrong and recovery works. White screen or a React "Objects are not valid as a React child" error in the console = it is right and it is a P0 in its own right, ahead of everything in Option 1. |
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
that works. Findings labelled as needing a runtime check are exactly the ones
reading cannot settle; they are not hedges on the rest.

No application code was changed. This branch contains one new file.

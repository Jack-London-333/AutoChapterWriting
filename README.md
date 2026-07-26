# zcv-app

Local Web app for DOI-exact Zotero matching and collection assignment.

This app does not download RIS, import RIS, validate RIS, or call Zotero Connector.
Users manually download official RIS files and import them with Zotero Desktop.
The app only checks whether Zotero has an exact DOI item and then adds that item
to the selected collection through `codex-zotero-bridge`.

## Run From PowerShell

`zcv-app` can live in any folder. The paper workspace is selected by
`zcv-app/state/app-state.json`:

```json
{
  "workspace": "C:\\Users\\19144\\Desktop\\paper-test-0521",
  "turn": "003",
  "collection_name": "codex-zotero-plugin",
  "collection_key": "DZR22PSH",
  "host": "127.0.0.1",
  "port": 8787,
  "open_browser_on_start": true,
  "browser_url_path": "/",
  "uv_cache_dir": ".uv-cache",
  "codex_worker_home": "state\\codex-worker-home",
  "codex_worker_model": "gpt-5.5",
  "codex_worker_reasoning_effort": "high"
}
```

`workspace` may be absolute, or relative to the `zcv-app` directory. App-local
paths such as `uv_cache_dir`, `codex_worker_home`, and
`codex_worker_ca_bundle` may also be absolute or relative to `zcv-app`.

For normal use, double-click:

```text
Start ZCV App.bat
```

The start button first closes any old process whose command line contains the
current `zcv-app` folder path, then starts a fresh app from
`state/app-state.json`. If `open_browser_on_start` is true, it opens
`http://<host>:<port><browser_url_path>` after a short delay.

Recommended from the `zcv-app` directory:

```powershell
Set-Location C:\path\to\zcv-app
.\start-zcv-app.ps1
```

You can also run the script by absolute path from any directory:

```powershell
& 'C:\path\to\zcv-app\start-zcv-app.ps1'
```

Then open:

```text
http://127.0.0.1:8787
```

For the dedicated citation verification console, open:

```text
http://127.0.0.1:8787/verify-console
```

If PowerShell blocks local scripts, run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\path\to\zcv-app\start-zcv-app.ps1'
```

The expanded command is:

```powershell
$AppDir='C:\path\to\zcv-app'
$env:UV_CACHE_DIR="$AppDir\.uv-cache"
Set-Location $AppDir
uv run --project $AppDir uvicorn app.main:app --app-dir $AppDir --host 127.0.0.1 --port 8787
```

The app saves the selected turn, collection name, and collection key in
`zcv-app/state/app-state.json` when you click `Save` in the UI. `app-state.json`
is the source of truth for `workspace`, `turn`, `collection_name`,
`collection_key`, `host`, `port`, worker paths, and cache paths. Stale
PowerShell variables such as `ZCV_WORKSPACE`, `ZCV_TURN`, `ZCV_COLLECTION`, and
`ZCV_COLLECTION_KEY` are ignored.

`uv_cache_dir` tells the app launcher to use this app's local cache directory by
default: `zcv-app/.uv-cache`. This avoids permission problems in the global uv
cache under `C:\Users\19144\AppData\Local\uv\cache` and keeps the app
self-contained. Verification workers do not share this cache: each worker gets
its own task-local cache at
`runtime/verification-sandboxes/<task_id>/work/.uv-cache`.

`codex_worker_model` selects the model used by the verification worker. For
example:

```json
"codex_worker_model": "gpt-5.5"
```

`codex_worker_reasoning_effort` controls the worker's reasoning effort for each
verification task. For `gpt-5.5`, the OpenAI model documentation lists:

```text
none
low
medium
high
xhigh
```

For the most careful PDF verification, use:

```json
"codex_worker_reasoning_effort": "high"
```

If the field is missing or contains an unsupported value, the app falls back to
`high`. The app also accepts `minimal` for compatibility with older GPT-5 model
families, but `minimal` is not listed on the GPT-5.5 model page. Changes take
effect for newly started Codex workers; restart the app before a verification
run if you want to make sure no old worker state remains.

While the app is running, `start-zcv-app.ps1` writes
`zcv-app/state/zcv-app.pid.json` with the launcher PID, app directory, host,
port, and start time. The stop script uses this only as a hint; the main stop
mechanism is scanning for processes whose command line contains the current
`zcv-app` absolute path.

## Run From cmd.exe

If the prompt looks like this, you are in `cmd.exe`, not PowerShell:

```text
C:\Users\19144\Desktop\paper-test-0521\zcv-app>
```

From `cmd.exe`, use `set`, `cd /d`, and `findstr`. Do not use `$env:`,
`Set-Location`, or `Select-String`.

If you are already inside the `zcv-app` folder, run:

```bat
cd /d C:\path\to\zcv-app
set UV_CACHE_DIR=C:\path\to\zcv-app\.uv-cache
uv run --project . uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8787
```

If you are outside the app directory, run:

```bat
set APPDIR=C:\path\to\zcv-app
set UV_CACHE_DIR=%APPDIR%\.uv-cache
uv run --project %APPDIR% uvicorn app.main:app --app-dir %APPDIR% --host 127.0.0.1 --port 8787
```

Open:

```text
http://127.0.0.1:8787
```

When the page opens or refreshes, the app automatically runs `Recheck All`
before enabling the UI. During that operation the page is greyed out and all
controls are disabled.

## LaTeX Generation

Click `Generate LaTeX` after `Parse Draft` and `Recheck All`.

The app converts Markdown math delimiters as LaTeX math instead of normal text.
These forms are supported:

```text
$...$
$$...$$
\(...)
\[...\]
```

Display math blocks may span multiple lines when delimited by either `$$` or
`\[` and `\]`.

The generated file:

```text
turn-N/latex-manuscript/main-turn-N.tex
```

loads the local format file:

```text
zcv-app/state/latex-format.tex
```

If that file does not exist, the app creates it automatically from the default
template. Edit `latex-format.tex` to customize document class, packages, page
geometry, title behavior, and bibliography style. The tracked example is:

```text
zcv-app/state/latex-format.example.tex
```

By default, no title is printed. To print a title, edit
`state/latex-format.tex`, set `\zcvshowtitletrue`, and customize `\title{...}`.

## Verification Evidence

Click `Generate Verification` after `Generate LaTeX`.

The app reads:

```text
turn-N/latex-manuscript/main-turn-N.tex
turn-N/citation-map-turn-N.json
```

It writes:

```text
turn-N/verification-evidence/claims-turn-N.json
turn-N/verification-evidence/verification-queue-turn-N.json
turn-N/verification-evidence/verification-turn-N.md
```

`claims-turn-N.json` is an internal claim index used by the workflow. The
Markdown file is the user-facing verification file. For each claim, every
citekey is listed separately. If the Zotero item has a PDF attachment, the block
is marked `待核验`; if the Zotero item exists but has no PDF attachment, the
support strength is `未知`.

The app also builds a queue. Each row is one claim/citekey pair with one of
these states:

```text
pending
current
verified
reused
no_pdf
skipped
failed
needs_human_review
```

Click `Prepare Next` or a row's `Prepare` button. The app creates a per-task
file sandbox:

```text
runtime/current-verification-task.json
runtime/current-verification-task.md
runtime/verification-sandboxes/<task_id>/input/request.json
runtime/verification-sandboxes/<task_id>/input/main-turn-N.tex
runtime/verification-sandboxes/<task_id>/input/reference.pdf
runtime/verification-sandboxes/<task_id>/output/result.json
```

The app no longer calls an OpenAI API for verification. Codex, a real sandbox,
or a one-time subagent must read `runtime/current-verification-task.json`, read
the full manuscript TeX and full reference PDF, and write standardized JSON only
to the sandbox `output/result.json`. It must not edit `verification-turn-N.md`,
the citation map, or the queue directly.

Verification results support one or more evidence screenshots. The legacy
`evidence` object is still required and represents the primary screenshot. When
one screenshot is not enough, the worker may also return `evidence_images`, an
array whose first item is the primary evidence followed by additional crops.
Each evidence object must contain `image_path`, `pdf_path`, `pdf_page`, and
`description_zh`. The app validates all image entries, copies every screenshot
to `turn-N/verification-evidence/images/`, and renders all of them in
`verification-turn-N.md`.

In the verify console, `Run Codex Worker` starts a one-shot local `codex exec
--ephemeral --sandbox workspace-write` process for the current sandbox task. The worker is launched from
the app, reads the sandbox `input/request.json`, writes logs to the sandbox
`output/` directory, and should leave `output/result.json` plus an evidence
image. If the Codex executable is not found, set `codex_worker_exe` in
`zcv-app/state/app-state.json`.

The worker runs with the task sandbox as its working directory and receives the
`zcv-app` directory as an additional workspace-write directory so it can run the
project's Python helpers with `uv run --project`. Its `UV_CACHE_DIR` is forced to
the task sandbox, so uv cache writes do not go into the app directory or the
global user cache.

The verification worker writes a temporary Codex `config.toml` before each run.
It uses `codex_worker_model` for `model` and `codex_worker_reasoning_effort` for
`model_reasoning_effort`.

Each worker uses a separate task-local Codex home at
`runtime/verification-sandboxes/<task_id>/codex-home/`. On each run the app
copies `auth.json` from the normal `%USERPROFILE%\.codex\` directory and writes
a minimal worker `config.toml` there, so one-shot workers do not contend with
the Codex Desktop `state_*.sqlite` files or with each other. The older
`codex_worker_home` setting remains in `app-state.json` for compatibility, but
normal verification workers use the task-local Codex home.

The worker also clears inherited `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and
Git proxy variables by default. This prevents a parent Codex/dev shell proxy
such as `127.0.0.1:9` from breaking the worker. Set
`codex_worker_inherit_proxy: true` in `app-state.json` only when the worker
should intentionally use the parent proxy environment.

Each task request includes the six support-strength definitions used for
claim-level judgment: `直接支持`, `较强支持`, `间接支持`, `不充分支持`, `不支持`,
and `未知`. The worker must choose exactly one of these labels.

Click `Apply Result` after `result.json` exists. The app validates the JSON,
copies any evidence image to `turn-N/verification-evidence/images/`, stores the
standard result under `turn-N/verification-evidence/results/`, updates
`verification-turn-N.md`, and advances the queue status.

Use `Auto Verify` to run the whole verification loop continuously. The app
loads the queue, skips completed/reused/no-PDF entries, then repeats: prepare
the next pending task, start the Codex worker, wait for `result_ready`, apply
the result, and move to the next pending task. It does not rebuild the queue at
startup because that would overwrite rows manually marked with `Mark Reverify`.
`Max parallel` must be a whole number from 1 to 100; invalid values such as `3.5`
are normalized to `2`. The scheduler launches at most that many new tasks in
one pass, even if some starts fail immediately. `Stop Auto` requests a stop
after already-running workers finish. If a worker returns `failed` or
`invalid_result`, the app marks that task failed, preserves its sandbox output
for inspection, and continues with other pending tasks.

Use `All Failed -> Pending` to reset failed rows for another Auto Verify run.
This does not delete the archived failure output; it only clears the runnable
queue state back to `pending`.

`Refresh Tasks` reloads the current verification queue from disk and refreshes
the UI. If there is no current task, it also rebuilds the queue from the claims,
citation map, Zotero PDF attachment status, and reusable previous-turn results.

If a completed result needs to be redone, select it in the verify console and
click `Mark Reverify`. The app archives the old result JSON, resets the row to
`pending`, and restores the Markdown block to a pending state. It does not
prepare a sandbox immediately, so several rows can be marked for reverify first;
then `Auto Verify` can process them in one run. Worker output containing obvious
Chinese encoding damage such as repeated `????` is rejected as `invalid_result`
and must be rerun or corrected before it can be applied.

For later turns, reusable evidence is copied from previous
`verification-evidence/results/*.json` only when claim text, citekey, Zotero
item key, and PDF fingerprint are all unchanged. Reused evidence is also written
back into the current turn's `verification-turn-N.md`. If the previous turn had
no PDF, there is no reusable result JSON; once a later turn has a PDF attachment,
the entry becomes `pending` and will be verified normally.

## Stop From PowerShell

For normal use, double-click:

```text
Stop ZCV App.bat
```

The stop button closes all processes whose command line contains the current
`zcv-app` absolute path, excluding the stop script's own PowerShell/cmd process.
This catches stale instances even if an earlier run used a different port such
as `8788`, `8799`, or `8800`.

Recommended:

```powershell
Set-Location C:\path\to\zcv-app
.\stop-zcv-app.ps1
```

If PowerShell blocks local scripts, run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\path\to\zcv-app\stop-zcv-app.ps1'
```

The stop script also reads `port` from `zcv-app/state/app-state.json` and checks
that port after path-based process cleanup. To fully stop the app manually, kill
the process listening on that port:

```powershell
$lines = netstat -ano | Select-String ':8787'
$lines | ForEach-Object {
  $pidText = (($_.ToString() -split '\s+') | Select-Object -Last 1)
  if ($pidText -and $pidText -ne '0') {
    Stop-Process -Id ([int]$pidText) -Force -ErrorAction SilentlyContinue
  }
}
```

Verify that port `8787` is closed:

```powershell
netstat -ano | findstr :8787 | findstr LISTENING
```

No output means the app is fully stopped.

You can also click `Close App` in the web UI. The app asks for confirmation,
tries to stop any running Codex worker process started by the app, and then
shuts down the local server.

## Stop From cmd.exe

Check port `8787`:

```bat
netstat -ano | findstr :8787
```

Stop the process using the PID shown in the last column:

```bat
taskkill /PID <PID> /F
```

For example, if `netstat` shows PID `45416`, run:

```bat
taskkill /PID 45416 /F
```

Then verify it is closed:

```bat
netstat -ano | findstr :8787
```

No output means the app is fully stopped.



# codex-zotero-bridge

Minimal Zotero Desktop plugin for adding existing Zotero items to an existing collection.

This bridge exists because Zotero's local HTTP API is read-only for the operation needed by the citation workflow. It does not edit `zotero.sqlite` directly.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\codex-zotero-bridge\build.ps1
```

Output:

```text
codex-zotero-bridge\codex-zotero-bridge.xpi
```

Plugin id:

```text
codex-zotero-bridge@codex.example.com
```

## Install In Zotero

1. Open Zotero Desktop.
2. Go to `Tools` -> `Add-ons`.
3. Use the gear menu and choose `Install Add-on From File...`.
4. Select `C:\Users\19144\Desktop\paper-test-0521\codex-zotero-bridge\codex-zotero-bridge.xpi`.
5. Restart Zotero if Zotero asks for it.

## Test

```powershell
python .\codex-zotero-bridge\call_bridge.py status
```

Expected response:

```json
{
  "ok": true,
  "plugin": "codex-zotero-bridge",
  "version": "0.1.0"
}
```

## Add Existing Items To `codex-zotero-plugin`

Target collection key:

```text
DZR22PSH
```

Items currently known to need this operation:

```powershell
python .\codex-zotero-bridge\call_bridge.py add-items-to-collection --collection-key DZR22PSH SFHLND8Z YD2UINJR JFKXPZJ8 PBYD7XVY WJTZ89D9
```

The endpoint only appends items to the existing collection. It does not create collections, delete anything, or remove items from any other collection.

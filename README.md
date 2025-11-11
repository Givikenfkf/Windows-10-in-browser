# BoxedWine Browser Starter


This repo is a static-site starter to host a BoxedWine (Wine-in-WASM) frontend on GitHub Pages or any static host.


> **Important:** This repository does not include compiled `boxedwine.js` / `boxedwine.wasm` binaries. You must obtain or build a BoxedWine Emscripten bundle and place it in `/boxedwine/`.


## What you need to add to `/boxedwine/`


- `boxedwine.js` (Emscripten JS glue)
- `boxedwine.wasm` (wasm binary)
- any `.data` or filesystem assets the build emits (e.g., `boxedwine.data`, filesystem zips, etc.)


Different builds have different names for the entrypoint and glue helpers. The `main.js` file uses common Emscripten patterns (`Module.callMain`, `Module.IDBFS`, `Module.FS`) but you may need to adapt the `launchExe()` function to your specific boxedwine build.


## Quick usage
1. Put the boxedwine build files in `/boxedwine/` in this repo.
2. Commit & push to GitHub Pages (or host statically). The page will load the wasm bundle.
3. Use the UI to upload an `.exe` — it will be written to the persistent filesystem (`/persistent/`) and the starter will attempt to invoke Wine to run it.


## Running locally for testing
Run a local static server (do **not** just open the HTML from the file system):


```bash
# Python 3
python -m http.server 8000
# or with Node
npx serve . -l 8000

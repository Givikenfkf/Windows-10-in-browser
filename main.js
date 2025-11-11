// Minimal pattern using an Emscripten style Module object.
// Adjust to the boxedwine build's actual API.

const statusEl = document.getElementById('status');
const screen = document.getElementById('screen');

function log(s){ screen.textContent += s + "\n"; screen.scrollTop = screen.scrollHeight; }

const Module = {
  locateFile: (path) => 'boxedwine/' + path, // tells glue where .wasm/.data lives
  preRun: [],
  postRun: [],
  print: (s) => { log(s); },
  printErr: (s) => { log('ERR: ' + s); },
  onRuntimeInitialized: async function() {
    statusEl.textContent = 'runtime initialized';
    // mount IDBFS at /persistent to persist files
    try {
      Module.FS.mkdir('/persistent');
    } catch(e){}
    Module.FS.mount(Module.IDBFS, {}, '/persistent');
    // sync from IDB -> MEM on startup
    await new Promise(resolve => Module.FS.syncfs(true, (err) => { if(err) console.error(err); resolve(); }));
    statusEl.textContent = 'filesystem ready (IDBFS)';
  }
};

// If boxedwine glue exposes a global factory, the included boxedwine.js usually
// calls createModule(Module) automatically. If not, call it here. 
// (Adjust according to the actual boxedwine build.)
window.Module = Module;

// UI: handle file upload -> write into IDBFS, then run wine
document.getElementById('run-btn').addEventListener('click', async () => {
  const input = document.getElementById('exe-file');
  const f = input.files && input.files[0];
  if(!f){ alert('pick an exe file'); return; }

  statusEl.textContent = 'reading file...';
  const ab = await f.arrayBuffer();
  const data = new Uint8Array(ab);

  // write into the emscripten FS under /persistent/user.exe
  const path = '/persistent/user.exe';
  try { Module.FS.unlink(path); } catch(e){}
  Module.FS.writeFile(path, data, { canOwn: true });
  // flush MEM -> IndexedDB
  statusEl.textContent = 'saving to IDBFS...';
  await new Promise(resolve => Module.FS.syncfs(false, (err) => { if(err) console.error(err); resolve(); }));

  statusEl.textContent = 'launching...';
  log('Starting user.exe via BoxedWine/Wine:');

  // Typical Emscripten programs use ccall / callMain to invoke main.
  // BoxedWine packaging may provide a wrapper like `boxedwine_run(['-root','/persistent', '/bin/wine','/persistent/user.exe'])`.
  // Replace the line below with the actual API from the boxedwine build you include.
  if (typeof Module.callMain === 'function') {
    // example: call main with args; real boxedwine may use a different entrypoint
    try {
      Module.callMain(['-root', '/persistent', '/bin/wine', '/persistent/user.exe']);
    } catch(e) {
      log('callMain error: ' + e);
    }
  } else {
    log('No callMain found in Module — adapt this to your boxedwine build API.');
  }
});

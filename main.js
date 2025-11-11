/* main.js — robust starter for BoxedWine glue
   This file intentionally avoids ES module exports to prevent "Unexpected token" if loaded as a normal script.
*/

(function(){
  const statusEl = document.getElementById('status');
  const screen = document.getElementById('screen');

  function log(msg){
    screen.textContent += msg + '\n';
    screen.scrollTop = screen.scrollHeight;
    console.log('[APP]', msg);
  }

  // The onRuntimeInitialized handler we use locally (called by inline Module or later by runtime)
  async function onRuntimeInitialized(){
    statusEl.textContent = 'runtime initialized';
    log('Runtime initialized — mounting persistent FS');

    try { Module.FS.mkdir('/persistent'); } catch(e){}
    try { Module.FS.mount(Module.IDBFS, {}, '/persistent'); } catch(e){ log('mount error: ' + e); }

    // sync IndexedDB -> MEM
    await new Promise(resolve => Module.FS.syncfs(true, (err) => {
      if(err) log('syncfs init error: ' + err);
      resolve();
    }));

    statusEl.textContent = 'filesystem ready (IDBFS)';
    window.APP_MODULE_READY = true;
  }

  // If runtime already flagged ready by inline config, call handler now.
  if(window.BOXEDWINE_RUNTIME_READY){
    onRuntimeInitialized();
  } else {
    // let inline Module call this function when ready
    window.boxedwine_onready = onRuntimeInitialized;
  }

  // write uploaded file into FS
  async function writeUploadedFile(file, destName){
    const ab = await file.arrayBuffer();
    const u8 = new Uint8Array(ab);
    const path = '/persistent/' + destName;
    try { Module.FS.unlink(path); } catch(e){}
    Module.FS.writeFile(path, u8, { canOwn: true });
    await new Promise(resolve => Module.FS.syncfs(false, (err) => {
      if(err) log('syncfs save error: ' + err);
      resolve();
    }));
    return path;
  }

  function launchExe(exePath){
    log('launching: ' + exePath);
    // try common entry methods used by Emscripten builds
    if(typeof Module.callMain === 'function'){
      try{
        Module.callMain(['-root', '/persistent', '/bin/wine', exePath]);
      }catch(e){ log('callMain error: ' + e); console.error(e); }
    } else if(typeof Module.boxedwine_run === 'function'){
      try{ Module.boxedwine_run(['/persistent', exePath]); }
      catch(e){ log('boxedwine_run error: ' + e); console.error(e); }
    } else {
      log('No known launcher found on Module. Inspect boxedwine glue or paste its first 30 lines here and I will adapt this.');
      console.log('Module keys:', Object.keys(Module || {}));
    }
  }

  // UI wiring
  document.getElementById('run-btn').addEventListener('click', async () => {
    if(!window.APP_MODULE_READY){
      alert('Runtime not ready yet. Wait a moment (check console for errors).');
      return;
    }
    const input = document.getElementById('exe-file');
    const f = input.files && input.files[0];
    if(!f){ alert('Pick an .exe file first'); return; }
    statusEl.textContent = 'saving file...';
    const saved = await writeUploadedFile(f, f.name);
    statusEl.textContent = 'running...';
    launchExe(saved);
  });

  document.getElementById('reset-btn').addEventListener('click', async () =>{
    if(!confirm('Delete all files in the persistent filesystem?')) return;
    try{
      const entries = Module.FS.readdir('/persistent');
      for(const e of entries){ if(e === '.' || e === '..') continue; try{ Module.FS.unlink('/persistent/' + e); }catch(_){} }
    }catch(e){ }
    await new Promise(resolve => Module.FS.syncfs(false, (err) => { if(err) log('syncfs clear error: ' + err); resolve(); }));
    log('persistent FS cleared');
  });

})();

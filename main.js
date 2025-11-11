// main.js — Emscripten Module scaffold for BoxedWine builds
statusEl.textContent = 'filesystem ready (IDBFS)';
moduleReady = true;
}


// Helper: write an uploaded file into the emscripten FS under /persistent/
async function writeUploadedFile(file, destName){
const ab = await file.arrayBuffer();
const u8 = new Uint8Array(ab);
const path = '/persistent/' + destName;
try { Module.FS.unlink(path); } catch(e){}
Module.FS.writeFile(path, u8, { canOwn: true });
// flush MEM -> IDB
await new Promise(resolve => Module.FS.syncfs(false, (err) => { if(err) log('syncfs save error: ' + err); resolve(); }));
return path;
}


// Attempt to start the EXE using common BoxedWine entry patterns.
// Different builds expose different wrappers — adapt as needed.
function launchExe(exePath){
log('launching: ' + exePath);
// Typical Emscripten entry -- many builds provide callMain
if(typeof Module.callMain === 'function'){
try{
// Example arg array: adapt to your boxedwine build API
Module.callMain(['-root', '/persistent', '/bin/wine', exePath]);
}catch(e){ log('callMain error: ' + e); }
} else if(typeof Module.boxedwine_run === 'function'){
try{ Module.boxedwine_run(['/persistent', exePath]); }
catch(e){ log('boxedwine_run error: ' + e); }
} else {
log('No known launcher found on Module. Inspect your boxedwine build glue to find the entrypoint.');
}
}


// UI wiring
document.getElementById('run-btn').addEventListener('click', async () => {
if(!moduleReady){ alert('Runtime not ready yet. Wait a moment.'); return; }
const input = document.getElementById('exe-file');
const f = input.files && input.files[0];
if(!f){ alert('Pick an .exe file first'); return; }
statusEl.textContent = 'saving file...';
const saved = await writeUploadedFile(f, f.name);
statusEl.textContent = 'running...';
launchExe(saved);
});


// Reset persistent FS (WARNING: deletes /persistent contents)
document.getElementById('reset-btn').addEventListener('click', async () =>{
if(!confirm('Delete all files in the persistent filesystem?')) return;
try{
// remove files and clear IDB by syncing an empty FS
const entries = Module.FS.readdir('/persistent');
for(const e of entries){ if(e === '.' || e === '..') continue; try{ Module.FS.unlink('/persistent/' + e); }catch(_){} }
}catch(e){ }
await new Promise(resolve => Module.FS.syncfs(false, (err) => { if(err) log('syncfs clear error: ' + err); resolve(); }));
log('persistent FS cleared');
});


export {};

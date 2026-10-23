import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { createGuide, GUIDE_TYPES, normalizeGuide } from './guide-schema.js';
import { makeStore } from './firebase-store.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const displayMode = params.get('mode') === 'display' || params.get('mode') === 'host';
const requestedGuideId = params.get('guide') || '';
const roles = {
  'protestadesnathangabriel.ssggov@gmail.com': 'admin',
  'protestadesnathangabriel.udmshs@gmail.com': 'admin',
  'studentcouncil.caloocan@laverdad.edu.ph': 'operator'
};
let auth, db, user, role = '', store, guide = null, stopWatch = null, stopDraftWatch = null;
let autoSaveTimer = null, draftTimer = null, saving = false, saveQueued = false, lastSaved = '', dirty = false;
const localChannel = 'BroadcastChannel' in window ? new BroadcastChannel('ssg-program-guide') : null;

function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2300); }
function status(msg, tone='') { $('saveStatus').textContent = msg; $('saveStatus').style.color = tone === 'error' ? 'var(--danger)' : tone === 'good' ? 'var(--accent)' : 'var(--muted)'; }
function errText(e) { return e?.message || String(e || 'Unknown error'); }
function fingerprint(g = collectGuide()) { return JSON.stringify(normalizeGuide(g)); }
function canEdit() { return ['admin','operator'].includes(role) && !displayMode; }
function stopListeners() { if (stopWatch) stopWatch(); if (stopDraftWatch) stopDraftWatch(); stopWatch = stopDraftWatch = null; }
function showApp() { $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); $('signOutBtn').classList.remove('hidden'); $('userBadge').textContent = `${user.email} · ${role}`; }
function showAuth(msg='') { $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); $('signOutBtn').classList.add('hidden'); $('authMessage').textContent = msg; }
function safeText(tag, value) { const el = document.createElement(tag); el.textContent = value ?? ''; return el; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function collectGuide() {
  if (!guide) return null;
  const g = structuredClone(guide);
  g.title = $('titleInput').value.trim() || 'Untitled Program Guide';
  g.type = $('typeInput').value; g.eventDate = $('dateInput').value; g.venue = $('venueInput').value;
  g.organizersCallTime = $('callInput').value; g.formalStart = $('startInput').value; g.mainBgm = $('bgmInput').value; g.fileLink = $('fileLinkInput').value;
  g.sections = [...$('sectionsRoot').querySelectorAll('.section-card')].map((card, si) => ({
    id: card.dataset.id, title: card.querySelector('[data-section="title"]').value || `Section ${si+1}`,
    startTime: card.querySelector('[data-section="startTime"]').value, endTime: card.querySelector('[data-section="endTime"]').value,
    notes: card.querySelector('[data-section="notes"]').value,
    items: [...card.querySelectorAll('.item-row')].map((row, ii) => {
      const val = key => row.querySelector(`[data-field="${key}"]`)?.value || '';
      return { id: row.dataset.id, number: val('number') || String(ii+1), title: val('title') || `Program Item ${ii+1}`, startTime: val('startTime'), endTime: val('endTime'), trt: val('trt'), duration: val('trt'), media: val('media'), mediaUrl: val('mediaUrl'), link: val('link'), participants: val('participants'), notes: val('notes') };
    })
  }));
  return normalizeGuide(g);
}
function inputField(label, field, value='', type='text', placeholder='') {
  return `<label>${label}<input data-field="${field}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></label>`;
}
function itemHtml(item, i) {
  return `<div class="item-row" data-id="${escapeHtml(item.id)}">
    <div class="item-number">${i+1}</div><label data-field-label="title">Item title<input data-field="title" value="${escapeHtml(item.title)}" placeholder="Program item"></label>
    <label>Start<input data-field="startTime" value="${escapeHtml(item.startTime)}" placeholder="8:00 AM"></label><label>End<input data-field="endTime" value="${escapeHtml(item.endTime)}" placeholder="8:10 AM"></label><label>TRT<input data-field="trt" value="${escapeHtml(item.trt || item.duration)}" placeholder="10 min"></label>
    <button class="icon-button remove-item" type="button" title="Remove item" aria-label="Remove item">×</button>
    <div class="item-extra">${inputField('Item no.','number',item.number)}${inputField('Media / song','media',item.media)}${inputField('Media URL','mediaUrl',item.mediaUrl,'url','https://...')}${inputField('Reference link','link',item.link,'url','https://...')}${inputField('Participants / host','participants',item.participants)}<label>Notes<textarea data-field="notes" placeholder="Notes, cues, instructions">${escapeHtml(item.notes)}</textarea></label></div>
  </div>`;
}
function sectionHtml(section, i) {
  return `<article class="section-card" data-id="${escapeHtml(section.id)}"><div class="section-head"><label>Section title<input data-section="title" value="${escapeHtml(section.title)}" placeholder="Section ${i+1}"></label><label>Start<input data-section="startTime" value="${escapeHtml(section.startTime)}" placeholder="7:00 AM"></label><label>End<input data-section="endTime" value="${escapeHtml(section.endTime)}" placeholder="8:00 AM"></label><button class="icon-button remove-section" type="button" title="Remove section" aria-label="Remove section">×</button></div><div class="section-body"><div class="items-root">${section.items.map(itemHtml).join('')}</div><div class="section-foot"><button class="button subtle add-item" type="button">＋ Add item</button><label class="notes-label">Section notes<textarea data-section="notes" placeholder="Section notes">${escapeHtml(section.notes)}</textarea></label></div></div></article>`;
}
function renderEditor(g, {keepFocus=false}={}) {
  guide = normalizeGuide(g); $('emptyState').classList.add('hidden'); $('editorView').classList.remove('hidden');
  if (!keepFocus || document.activeElement !== $('titleInput')) $('titleInput').value = guide.title;
  $('guideTypeLabel').textContent = guide.type === GUIDE_TYPES.SEQUENCE ? 'PROGRAM SEQUENCE' : 'PROGRAM FLOW';
  $('typeInput').value = guide.type; $('dateInput').value = guide.eventDate; $('venueInput').value = guide.venue;
  $('callInput').value = guide.organizersCallTime; $('startInput').value = guide.formalStart; $('bgmInput').value = guide.mainBgm; $('fileLinkInput').value = guide.fileLink;
  if (!keepFocus || !document.activeElement.closest?.('.section-card')) $('sectionsRoot').innerHTML = guide.sections.map(sectionHtml).join('');
  const isReadOnly = !canEdit(); document.querySelectorAll('#editorView input,#editorView select,#editorView textarea,#editorView button').forEach(el => { el.disabled = isReadOnly || (displayMode && ['deleteGuideBtn','addSectionBtn','saveBtn'].includes(el.id)); });
  $('displayBtn').disabled = false; $('exportBtn').disabled = false; $('deleteGuideBtn').classList.toggle('hidden', role !== 'admin' || displayMode);
  $('addSectionBtn').classList.toggle('hidden', isReadOnly); $('saveBtn').classList.toggle('hidden', isReadOnly); $('typeInput').disabled = isReadOnly;
  if (displayMode) document.body.classList.add('display-mode');
}
function renderGuideList(items) {
  const root = $('guideList'); root.innerHTML = '';
  if (!items.length) { root.append(safeText('p','No saved guides yet.')); root.lastChild.className='muted small'; return; }
  items.forEach(g => { const b = document.createElement('button'); b.className = `guide-card${guide?.id === g.id ? ' active' : ''}`; b.type='button'; b.innerHTML=`<strong>${escapeHtml(g.title)}</strong><small>${g.type === GUIDE_TYPES.SEQUENCE ? 'Program Sequence' : 'Program Flow'} · ${escapeHtml(g.eventDate || 'No date')}</small>`; b.addEventListener('click',()=>openGuide(g.id)); root.append(b); });
}
async function refreshList() { const list = await store.list(); renderGuideList(list); return list; }
async function openGuide(id) {
  try {
    stopListeners(); clearTimeout(autoSaveTimer); clearTimeout(draftTimer);
    const g = await store.get(id);
    if (!g) { toast('Guide not found.'); return; }
    guide = g; renderEditor(g); lastSaved = fingerprint(g); dirty = false; status('Saved', 'good');
    stopWatch = store.watch(id, remote => {
      if (!remote) return;
      if (!dirty && !saving) { renderEditor(remote); lastSaved = fingerprint(remote); status('Saved', 'good'); }
      refreshList().catch(console.error);
    }, e => status(`Live sync error: ${errText(e)}`, 'error'));
    stopDraftWatch = store.watchDraft(id, draft => { if (draft && displayMode) renderEditor(draft); }, e => console.warn('Draft listener:',e));
    if (localChannel) localChannel.postMessage({type:'open', guideId:id, guide:g});
    if (displayMode) $('editorView').classList.remove('hidden');
    await refreshList();
  } catch (e) { toast(`Could not open guide: ${errText(e)}`); }
}
async function newGuide(type=GUIDE_TYPES.FLOW) {
  const id = `guide_${crypto.randomUUID().slice(0,8)}`;
  const g = createGuide(id,type); g.title = type === GUIDE_TYPES.SEQUENCE ? 'New Program Sequence' : 'New Program Flow';
  try { await store.save(g); await refreshList(); await openGuide(id); toast('Guide created.'); }
  catch(e) { toast(`Could not create guide: ${errText(e)}`); }
}
function scheduleChanges() {
  if (!canEdit() || !guide) return;
  dirty = true; status('Unsaved changes…'); clearTimeout(autoSaveTimer); clearTimeout(draftTimer);
  autoSaveTimer = setTimeout(() => saveNow(true), 500);
  draftTimer = setTimeout(() => publishDraft(), 180);
  const snapshot = collectGuide(); if (localChannel) localChannel.postMessage({type:'draft', guideId:guide.id, guide:snapshot});
  try { if (window.opener && !window.opener.closed) window.opener.postMessage({type:'ssg-guide-update',guideId:guide.id,guide:snapshot}, location.origin); } catch {}
}
async function publishDraft() { if (!canEdit() || !guide) return; try { await store.publishDraft(collectGuide()); } catch(e) { console.warn('Live draft failed',e); } }
async function saveNow(automatic=false) {
  if (!canEdit() || !guide) return;
  clearTimeout(autoSaveTimer); const snapshot = collectGuide(), fp = fingerprint(snapshot);
  if (fp === lastSaved) { dirty=false; status('Saved','good'); return; }
  if (saving) { saveQueued=true; return; }
  saving=true; $('saveBtn').disabled=true; status(automatic?'Auto-saving…':'Saving…');
  try { await store.save(snapshot); lastSaved=fp; dirty=false; status(automatic?'Saved automatically':'Saved','good'); await refreshList(); }
  catch(e) { status(`Save failed: ${errText(e)}`,'error'); toast('Save failed. Check your connection and Firestore rules.'); }
  finally { saving=false; $('saveBtn').disabled=false; if (saveQueued || fingerprint() !== lastSaved) { saveQueued=false; autoSaveTimer=setTimeout(()=>saveNow(true),100); } }
}
function addSection() { if (!guide) return; const g=collectGuide(); g.sections.push({id:`SEC_${crypto.randomUUID()}`,title:`Section ${g.sections.length+1}`,startTime:'',endTime:'',notes:'',items:[]}); renderEditor(g); scheduleChanges(); }
function addItem(card) { const g=collectGuide(); const s=g.sections.find(x=>x.id===card.dataset.id); if(!s)return; s.items.push({id:`ITM_${crypto.randomUUID()}`,number:String(s.items.length+1),title:'New Program Item',startTime:'',endTime:'',trt:'',duration:'',media:'',mediaUrl:'',link:'',participants:'',notes:''}); renderEditor(g); scheduleChanges(); }
function removeItem(row) { const g=collectGuide(); for(const s of g.sections) s.items=s.items.filter(x=>x.id!==row.dataset.id); renderEditor(g); scheduleChanges(); }
function removeSection(card) { if(!confirm('Delete this section and all its items?'))return; const g=collectGuide(); g.sections=g.sections.filter(s=>s.id!==card.dataset.id); renderEditor(g); scheduleChanges(); }
async function deleteCurrent() { if(!guide || role!=='admin')return; if(!confirm(`Delete “${guide.title}”? This cannot be undone.`))return; try { stopListeners(); await store.remove(guide.id); guide=null; $('editorView').classList.add('hidden'); $('emptyState').classList.remove('hidden'); await refreshList(); toast('Guide deleted.'); } catch(e) { toast(`Delete failed: ${errText(e)}`); } }
function exportGuide() { const g=collectGuide(); if(!g)return; const blob=new Blob([JSON.stringify(g,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${g.title.replace(/[^a-z0-9-_]+/gi,'_') || 'ssg-guide'}.json`; a.click(); URL.revokeObjectURL(url); }
function printGuide() {
  const g = collectGuide(); if (!g) return;
  const esc = value => escapeHtml(value).replace(/\n/g, '<br>');
  const rows = g.sections.map((section, si) => `<section><h2>${si+1}. ${esc(section.title)}</h2>${section.notes ? `<p class="notes">${esc(section.notes)}</p>` : ''}<table><thead><tr><th>#</th><th>Program item</th><th>Time</th><th>TRT</th><th>Media / song</th><th>Participants / host</th><th>Notes</th></tr></thead><tbody>${section.items.map((item, ii) => `<tr><td>${esc(item.number || String(ii+1))}</td><td>${esc(item.title)}</td><td>${esc([item.startTime,item.endTime].filter(Boolean).join(' – '))}</td><td>${esc(item.trt || item.duration)}</td><td>${esc(item.media)}${item.mediaUrl ? `<br><small>${esc(item.mediaUrl)}</small>` : ''}</td><td>${esc(item.participants)}</td><td>${esc(item.notes)}</td></tr>`).join('')}</tbody></table></section>`).join('');
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) { toast('Allow pop-ups to print or save as PDF.'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.title)}</title><style>body{font:12px Arial,sans-serif;color:#111;margin:24px}h1{margin-bottom:4px}h2{font-size:16px;margin:22px 0 8px;border-bottom:1px solid #999;padding-bottom:4px}.meta{color:#444;margin:4px 0 16px}.notes{white-space:normal;color:#444}table{border-collapse:collapse;width:100%;table-layout:fixed;margin-bottom:14px}th,td{border:1px solid #aaa;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eee}small{font-size:10px;color:#555}@media print{body{margin:10mm}section{break-inside:avoid}button{display:none}}</style></head><body><h1>${esc(g.title)}</h1><p class="meta">${esc(g.type === GUIDE_TYPES.SEQUENCE ? 'Program Sequence' : 'Program Flow')} · ${esc(g.eventDate)} · ${esc(g.venue)}</p><p class="meta">Organizer call time: ${esc(g.organizersCallTime)} · Formal start: ${esc(g.formalStart)} · Main BGM: ${esc(g.mainBgm)}</p>${rows}<script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  w.document.close();
}

async function searchLibrary() {
  const kind = $('libraryKind').value, term = $('libraryQuery').value.trim(), root = $('libraryResults');
  root.innerHTML = ''; $('libraryStatus').textContent = 'Searching imported Firestore records…'; $('librarySearchBtn').disabled = true;
  try {
    const results = await store.searchLibrary(kind, term);
    $('libraryStatus').textContent = `${results.length} result(s). This searches records already imported into Firestore.`;
    if (!results.length) { root.append(safeText('p', 'No matching records. The library may not yet be imported, or the search returned no matches.')); return; }
    results.forEach(item => {
      const title = item.title || item.name || item.songTitle || item.mediaTitle || item.id;
      const detail = [item.artist, item.author, item.category, item.type, item.url, item.mediaUrl].filter(Boolean).join(' · ');
      const card = document.createElement('article'); card.className = 'library-result';
      const info = document.createElement('div'); const h = safeText('strong', title); const small = safeText('small', detail || `Record ID: ${item.id}`); info.append(h, small);
      const use = document.createElement('button'); use.className = 'button subtle'; use.type = 'button'; use.textContent = 'Use in guide';
      use.addEventListener('click', () => { const target = document.activeElement?.closest?.('.item-row'); const rows = [...document.querySelectorAll('#sectionsRoot .item-row')]; const row = target || rows[rows.length - 1]; if (!row) { toast('Add a program item first.'); return; } const media = row.querySelector('[data-field="media"]'); const url = row.querySelector('[data-field="mediaUrl"]'); if (media) media.value = title; const link = item.url || item.mediaUrl || item.link; if (url && link) url.value = link; scheduleChanges(); $('libraryDialog').close(); toast('Library item added to selected program item.'); });
      card.append(info, use); root.append(card);
    });
  } catch (e) { $('libraryStatus').textContent = `Library search failed: ${errText(e)}. Check Firestore rules and collection names.`; }
  finally { $('librarySearchBtn').disabled = false; }
}

function startDisplay() { if(!guide)return; const url=new URL(location.href); url.searchParams.set('mode','display'); url.searchParams.set('guide',guide.id); window.open(url,'ssg-guide-display','width=1200,height=850'); }
function wire() {
  $('signInBtn').addEventListener('click',async()=>{ $('signInBtn').disabled=true; try { await signInWithPopup(auth,new GoogleAuthProvider()); } catch(e) { $('authMessage').textContent=errText(e); } finally { $('signInBtn').disabled=false; } });
  $('signOutBtn').addEventListener('click',()=>signOut(auth)); $('newGuideBtn').addEventListener('click',()=>newGuide()); $('emptyNewBtn').addEventListener('click',()=>newGuide());
  $('addSectionBtn').addEventListener('click',addSection); $('saveBtn').addEventListener('click',()=>saveNow(false)); $('deleteGuideBtn').addEventListener('click',deleteCurrent); $('exportBtn').addEventListener('click',exportGuide); $('printBtn').addEventListener('click',printGuide); $('displayBtn').addEventListener('click',startDisplay); $('libraryBtn').addEventListener('click',()=>{ $('libraryDialog').showModal(); $('libraryQuery').focus(); }); $('librarySearchBtn').addEventListener('click',searchLibrary); $('libraryQuery').addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();searchLibrary();} });
  ['titleInput','typeInput','dateInput','venueInput','callInput','startInput','bgmInput','fileLinkInput'].forEach(id => $(id).addEventListener('input',()=>{ if(id==='typeInput') $('guideTypeLabel').textContent=$('typeInput').value===GUIDE_TYPES.SEQUENCE?'PROGRAM SEQUENCE':'PROGRAM FLOW'; scheduleChanges(); }));
  $('sectionsRoot').addEventListener('input',e=>{ if(e.target.matches('input,textarea,select')) scheduleChanges(); });
  $('sectionsRoot').addEventListener('click',e=>{ const card=e.target.closest('.section-card'); if(e.target.closest('.add-item')) addItem(card); else if(e.target.closest('.remove-item')) removeItem(e.target.closest('.item-row')); else if(e.target.closest('.remove-section')) removeSection(card); });
  if(localChannel) localChannel.onmessage=e=>{ const m=e.data; if(!displayMode||!m||m.guideId!==requestedGuideId)return; if(m.type==='draft'&&m.guide)renderEditor(m.guide); if(m.type==='open'&&m.guide)renderEditor(m.guide); };
  window.addEventListener('message',e=>{ if(e.origin!==location.origin||!displayMode)return; if(e.data?.type==='ssg-guide-update'&&e.data.guideId===requestedGuideId)renderEditor(e.data.guide); });
}

if (displayMode) { document.body.classList.add('display-mode'); $('authView').classList.add('hidden'); }
try {
  const app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app); wire();
  onAuthStateChanged(auth,async u=>{
    user=u;
    if(!u){stopListeners();showAuth('Sign in with an authorized Google account to continue.');return;}
    role=roles[String(u.email||'').toLowerCase()];
    if(!u.emailVerified||!role){await signOut(auth);showAuth('This account is not on the approved SSG allowlist.');return;}
    store=makeStore(db,u);showApp();
    try {
      const items=await refreshList();
      if(requestedGuideId){await openGuide(requestedGuideId);}
      else if(items.length){await openGuide(items[0].id);}
      else if(!displayMode&&role!=='operator') { $('emptyState').classList.remove('hidden'); }
      else { $('emptyState').classList.remove('hidden'); }
      if(displayMode){ $('signOutBtn').classList.add('hidden'); $('userBadge').classList.add('hidden'); }
    } catch(e) { showAuth(`Could not load guides: ${errText(e)}. Check Firestore rules.`); }
  });
} catch(e) { showAuth(`App setup error: ${errText(e)}`); }

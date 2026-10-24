/* SSG Firestore compatibility adapter.
 * Firebase web config is public by design. Authorization is enforced by Firestore Rules.
 * Never place service-account keys or other private credentials in this file.
 */
(function(){
  const firebaseConfig = {"apiKey": "AIzaSyBz6tu7JPunkwCMefhXqUi8Ivyge__q19c", "authDomain": "ssg-program-operator-tool.firebaseapp.com", "projectId": "ssg-program-operator-tool", "storageBucket": "ssg-program-operator-tool.firebasestorage.app", "messagingSenderId": "1096917988080", "appId": "1:1096917988080:web:a3179839eeea51f81b4835", "measurementId": "G-MMGHEVN9PL"};
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  let authReadyResolve;
  const authReady = new Promise(resolve => { authReadyResolve = resolve; });
  auth.onAuthStateChanged(user => authReadyResolve(user));

  function err(message, code='APP_ERROR'){ const e=new Error(message); e.code=code; return e; }
  async function currentAccess(){
    await authReady;
    const user = auth.currentUser;
    if(!user) throw err('AUTH_REQUIRED: Sign in with Google first.','AUTH_REQUIRED');
    const snap = await db.collection('users').doc(user.uid).get();
    const role = snap.exists ? String(snap.data().role||'').toLowerCase() : '';
    return {user, role:['officer','admin'].includes(role)?role:'viewer'};
  }
  async function requireOfficer(){
    const access=await currentAccess();
    if(access.role==='viewer') throw err('AUTH_FORBIDDEN: This account has view-only access. Request officer access from the dashboard.','AUTH_FORBIDDEN');
    return access;
  }
  async function getAll(collection, max=5000){
    const snap = await db.collection(collection).limit(max).get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  function normTerms(value){
    return [...new Set(String(value||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s'-]/gu,' ').split(/\s+/).filter(t=>t.length>1))].slice(0,200);
  }
  async function searchByTerms(collection, q, fields, limit=200){
    const query=String(q||'').trim().toLowerCase();
    if(query.length<2) return [];
    const terms=normTerms(query);
    if(!terms.length) return [];
    const snap=await db.collection(collection).where('searchTerms','array-contains',terms[0]).limit(limit).get();
    let rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    rows=rows.filter(r=>terms.every(t=>String(r.searchText||fields.map(f=>r[f]||'').join(' ')).toLowerCase().includes(t)));
    rows.sort((a,b)=>{
      const at=String(a.title||a.name||'').toLowerCase(), bt=String(b.title||b.name||'').toLowerCase();
      const score=s=>(s===query?1000:0)+(s.includes(query)?500:0);
      return score(bt)-score(at)||at.localeCompare(bt);
    });
    return rows.slice(0,25);
  }
  function normalizeGuide(g){
    const out={...g};
    out.id=String(g.id||('GUIDE_'+crypto.randomUUID().replace(/-/g,'').slice(0,14)));
    out.title=String(g.title||'').trim();
    out.type=String(g.type||'PROGRAM_FLOW').toUpperCase()==='PROGRAM_SEQUENCE'?'PROGRAM_SEQUENCE':'PROGRAM_FLOW';
    out.visibility='PUBLIC'; out.publicAccess='EDIT'; out.ownerUsername='SSG OFFICER'; out.ownerName='SSG Officer';
    out.hosts=Array.isArray(g.hosts)?g.hosts:[];
    out.sections=(Array.isArray(g.sections)?g.sections:[]).map((s,si)=>({
      id:String(s.id||('SEC_'+crypto.randomUUID().replace(/-/g,'').slice(0,14))),
      title:String(s.title||`Section ${si+1}`),startTime:String(s.startTime||''),endTime:String(s.endTime||''),notes:String(s.notes||''),
      items:(Array.isArray(s.items)?s.items:[]).map((it,ii)=>({...it,id:String(it.id||('ITM_'+crypto.randomUUID().replace(/-/g,'').slice(0,14))),number:String(it.number||ii+1),title:String(it.title||`Program Item ${ii+1}`),trt:String(it.trt||it.duration||'')}))
    }));
    return out;
  }
  async function getGuide(id){
    if(!id) return null;
    const snap=await db.collection('guides').doc(String(id)).get();
    if(!snap.exists) return null;
    let canEdit=false; try { canEdit=(await currentAccess()).role!=='viewer'; } catch(e) {}
    const g=snap.data();
    return {...g,id:snap.id,isOwner:canEdit,canEdit};
  }
  function newId(prefix){return String(prefix||'ID')+'_'+crypto.randomUUID().replace(/-/g,'').slice(0,14);}
  function getCPFCTemplate() {
    return {
      id: '',
      title: 'COMMUNITY PRAYER & FLAG CEREMONY TECH GUIDE',
      eventDate: '2026-09-21',
      organizersCallTime: '6:30 AM',
      formalStart: '7:30 AM',
      mainBgm: '',
      fileLink: '',
      sections: [
        {
          id: newId('SEC'),
          title: 'A. COMMUNITY PRAYER — I. AWITAN',
          startTime: '7:30 AM',
          endTime: '8:00 AM',
          notes: '',
          items: [
            { id: newId('ITM'), number: '1', title: 'MCGI Symphony Orchestra - Awit Ng MMC', startTime: '7:30 AM', endTime: '7:36 AM', media: '', link: 'https://drive.google.com/file/d/1Qakhg6QHiC7r40IFu8egpp4UtUEKE1c9/view?usp=drive_link', participants: '', notes: '' },
            { id: newId('ITM'), number: '2', title: 'Paanyaya Sa Pormal Na Awitan', startTime: '7:36 AM', endTime: '7:39 AM', media: 'LVCC CP PAALALA NEW.mp4', link: '', participants: '', notes: '' },
            { id: newId('ITM'), number: '3', title: 'Special Song - Dakila Ka', startTime: '7:38 AM', endTime: '7:43 AM', media: '', link: 'https://drive.google.com/file/d/1Wihg8V-xfBPuj9OK5ZiThl0yTl_df7jcv/view?usp=drive_link', participants: '', notes: '' },
            { id: newId('ITM'), number: '4', title: 'MCGI Servant', startTime: '7:43 AM', endTime: '7:45 AM', media: '', link: '', participants: '', notes: '' },
            { id: newId('ITM'), number: '5', title: 'Himnario - 36 Kami Ingatan Mo', startTime: '7:45 AM', endTime: '7:54 AM', media: 'HIMNO 36', link: 'https://drive.google.com/file/d/1qvXEgBhPHGwvRkARoZVNAvyv4xTG7oz/view?usp=drive_link', participants: '', notes: '' },
            { id: newId('ITM'), number: '6', title: 'Prayer', startTime: '7:54 AM', endTime: '7:59 AM', media: '', link: '', participants: '', notes: '' },
            { id: newId('ITM'), number: '7', title: 'Doxology', startTime: '7:59 AM', endTime: '8:00 AM', media: 'DOXOLOGIA_TAG-MULTILANGUAGE+1_REV_WHITE.mp4', link: '', participants: '', notes: '' }
          ]
        },
        {
          id: newId('SEC'),
          title: 'II. BREAK (PROGRAM INTERVAL)',
          startTime: '8:00 AM',
          endTime: '8:30 AM',
          notes: '',
          items: [
            { id: newId('ITM'), number: '1', title: 'Chorale de La Verdad & LV Dance Troupe - We Will Sing Forever 247', startTime: '8:00 AM', endTime: '8:05 AM', media: '', link: 'https://drive.google.com/file/d/1eWaRtRSwPQM cq4Rv6Wgx565hlUWBja_/view?usp=drive_link'.replace('PQM ', 'PQM'), participants: '', notes: '' },
            { id: newId('ITM'), number: '2', title: '[REVISED] Countdown', startTime: '8:05 AM', endTime: '8:06 AM', media: '', link: 'https://drive.google.com/file/d/1NTCMI7aqfwFmGLYB9Hb4AgZd4yvN-YC/view?usp=drivesdk', participants: '', notes: '' },
            { id: newId('ITM'), number: '3', title: 'Playables (if there is any)', startTime: '8:06 AM', endTime: '8:15 AM', media: '', link: '', participants: '', notes: '' }
          ]
        },
        {
          id: newId('SEC'),
          title: 'III. FLAG CEREMONY',
          startTime: '8:15 AM',
          endTime: '8:30 AM',
          notes: '',
          items: [
            { id: newId('ITM'), number: '1', title: 'LVCC Caloocan Community Prayer and Flag Ceremony Primer AVP', startTime: '8:15 AM', endTime: '8:15 AM', media: '', link: 'https://drive.google.com/file/d/1ori0QEO7vmTPCdJXeKJVNuZsnvJfl6uA/view?usp=sharing', participants: '', notes: '' },
            { id: newId('ITM'), number: '2', title: 'Invocation Primer AVP', startTime: '8:15 AM', endTime: '8:16 AM', media: '', link: 'https://drive.google.com/file/d/18kfJU_eyFnBKhySpNH2MoBkkVxts6iD/view?usp=sharing', participants: '', notes: '' },
            { id: newId('ITM'), number: '3', title: 'Invocation - Kung Kasama Ka', startTime: '8:16 AM', endTime: '8:22 AM', media: '', link: 'https://drive.google.com/file/d/1kZ-bXbKaTGSA_XqxZCSskddR-FNf4PRv/view?usp=sharing', participants: '', notes: '' },
            { id: newId('ITM'), number: '4', title: 'Flag Ceremony Primer VO [Optional. Can be done LIVE]', startTime: '8:22 AM', endTime: '8:23 AM', media: '', link: 'https://drive.google.com/file/d/1kDxEg-5Ee03wRhjFb4W4AUGZbfsGZfXV/view?usp=sharing', participants: '', notes: '' },
            { id: newId('ITM'), number: '5', title: 'National Anthem', startTime: '8:23 AM', endTime: '8:24 AM', media: 'NATIONAL ANTHEM.mp4', link: '', participants: '', notes: '' },
            { id: newId('ITM'), number: '6', title: 'LVCC Hymn [Subject to change: may be used to end the event instead]', startTime: '8:24 AM', endTime: '8:26 AM', media: 'LVCC HYMN.mp4', link: '', participants: '', notes: '' },
            { id: newId('ITM'), number: '7', title: "Christian Habit - Kung Ika’y May Katulong (Jamaican Farewell Adapt.)", startTime: '8:26 AM', endTime: '8:30 AM', media: '', link: 'https://drive.google.com/file/d/1zdf721P1rtT7qWzKd5EvTu-92326PMWR/view?usp=sharing', participants: '', notes: 'Lyrics only and with choreo references are both available.' }
          ]
        }
      ]
    };
  }
  
  async function apiCall(method,args){
    const publicMethods=['getBootstrap','getGuides','getGuide','submitOfficerRequest','warmupLibraries'];
    if(!publicMethods.includes(method)) await requireOfficer();
    const a=Array.isArray(args)?args:[args];
    switch(method){
      case 'getBootstrap': return {appName:'SSG PROGRAM FLOW / TECH GUIDE BUILDER',appUrl:location.origin+location.pathname,databaseId:'firestore',timezone:'Asia/Manila'};
      case 'getGuides': {
        const rows=await getAll('guides',1000);
        let role='viewer'; try { role=(await currentAccess()).role; } catch(e) {}
        const canEdit=role!=='viewer';
        return rows.map(g=>({...g,isOwner:canEdit,canEdit})).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
      }
      case 'submitOfficerRequest': {
        const {user,role}=await currentAccess();
        if(role!=='viewer') throw err('Your account already has officer access.','REQUEST_NOT_NEEDED');
        const name=String(a[0]?.name||'').trim();
        const teamRole=String(a[0]?.teamRole||'').trim();
        if(!name||!teamRole) throw err('Please enter both your full name and Production-Technical Team role.');
        if(name.length>200||teamRole.length>200) throw err('Please keep your name and team role within 200 characters each.');
        const requestRef=db.collection('officerAccessRequests').doc(user.uid);
        await requestRef.set({uid:user.uid,email:user.email||'',name,teamRole,status:'pending',requestedAt:firebase.firestore.FieldValue.serverTimestamp()});
        return {success:true,message:'Your request was submitted for admin review.'};
      }
      case 'getGuide': return await getGuide(a[0]);
      case 'publishOperatorState': {
        const {user,role}=await requireOfficer();
        const payload=a[0]||{};
        const guideId=String(payload.guideId||'');
        if(!guideId) throw err('A saved guide is required before publishing live status.');
        const state=payload.state&&typeof payload.state==='object'?payload.state:{};
        await db.collection('operatorSessions').doc(user.uid).set({
          uid:user.uid, guideId, operatorName:String(user.displayName||user.email||'SSG Officer'),
          email:String(user.email||''), role, online:true, state,
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
        return {success:true};
      }
      case 'markOperatorOffline': {
        const {user}=await requireOfficer();
        await db.collection('operatorSessions').doc(user.uid).set({online:false,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        return {success:true};
      }
      case 'listOnlineOperators': {
        const guideId=String(a[0]||'');
        if(!guideId) return [];
        const snap=await db.collection('operatorSessions').where('guideId','==',guideId).get();
        const now=Date.now();
        return snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.online===true&&x.updatedAt&&typeof x.updatedAt.toMillis==='function'&&(now-x.updatedAt.toMillis())<15000).map(x=>({uid:x.uid,operatorName:x.operatorName||x.email||'Online operator',email:x.email||'',guideId:x.guideId,updatedAt:x.updatedAt?.toMillis?.()||0}));
      }
      case 'saveGuide': {
        const g=normalizeGuide(a[0]||{});
        if(!g.title) throw err('Guide/Event Title is required.');
        const ref=db.collection('guides').doc(g.id);
        const old=await ref.get();
        const now=new Date().toISOString();
        g.createdAt=(old.exists&&old.data().createdAt)||g.createdAt||now;
        g.updatedAt=now;
        await ref.set(g);
        return {success:true,message:'Guide saved successfully.',guide:{...g,isOwner:true,canEdit:true}};
      }
      case 'deleteGuide': {
        const id=String(a[0]||''); if(!id) throw err('Guide ID is required.');
        await db.collection('guides').doc(id).delete();
        return {success:true,message:'Guide deleted successfully.'};
      }
      case 'getCPFCTemplate': return getCPFCTemplate();
      case 'searchMcgiSongs': {
        const rows=await searchByTerms('songLibrary',a[0],['title','link','searchText']);
        return rows.map(r=>({id:r.id,title:r.title||r.name||'',link:r.link||'',source:r.source||'MCGI SONG DATABASE',sheet:r.sourceSheet||''}));
      }
      case 'searchMcgiLyrics': {
        const rows=await searchByTerms('lyricsLibrary',a[0],['title','content','version','searchText']);
        const q=String(a[0]||'').toLowerCase();
        return rows.map(r=>{const content=String(r.content||''),at=content.toLowerCase().indexOf(q);let snippet=content.replace(/\s+/g,' ').trim();if(at>=0)snippet=content.substring(Math.max(0,at-70),Math.min(content.length,at+q.length+120)).replace(/\s+/g,' ').trim();else snippet=snippet.slice(0,190);return {id:r.id,name:r.title||r.name||'',path:'MCGI Lyrics Database',url:'',modified:r.modified||'',tags:r.version||'',snippet,content,fileType:'DATABASE'};});
      }
      case 'getMcgiLyric': {
        const id=String(a[0]||''); const s=await db.collection('lyricsLibrary').doc(id).get();
        if(!s.exists) throw err('Lyric not found in the imported Firestore library.');
        const r=s.data(); return {success:true,id:s.id,name:r.title||'',version:r.version||'',path:'MCGI Lyrics Database',url:'',modified:r.modified||'',tags:r.version||'',content:r.content||''};
      }
      case 'searchMcgiMedia': {
        const rows=await searchByTerms('mediaLibrary',a[0],['name','folder','mimeType','searchText'],100);
        return rows.slice(0,30).map(r=>({id:r.id,name:r.name||r.title||'',mimeType:r.mimeType||'',url:r.url||'',modified:r.modified||'',folder:r.folder||''}));
      }
      case 'getMcgiMediaDuration': return {success:false,durationSeconds:null,message:'Automatic Google Drive video-duration lookup is not available in the GitHub Pages + Spark configuration. Enter duration manually or use the media link.'};
      case 'warmupLibraries': return {success:true,message:'Firestore libraries are ready.'};
      case 'refreshMcgiLyricsLibrary':
      case 'refreshMcgiMediaLibrary':
      case 'refreshMcgiSongLibraries': throw err('This library is imported from the XLSX file in the one-time Import Data page. Drive refresh requires a separate trusted integration and is not included in the Spark-only build.');
      case 'saveLyricLineup': {
        const p=a[0]||{}, id=String(p.id||('LINEUP_'+crypto.randomUUID().replace(/-/g,'').slice(0,14))), now=new Date().toISOString();
        await db.collection('lineups').doc(id).set({name:String(p.name||'Untitled lineup'),owner:auth.currentUser.uid,createdAt:p.createdAt||now,updatedAt:now,payload:p});
        return {success:true,id,message:'Lineup saved.'};
      }
      case 'getLyricLineups': {
        const snap=await db.collection('lineups').where('owner','==',auth.currentUser.uid).get();
        return snap.docs.map(d=>({id:d.id,...d.data()}));
      }
      case 'loadLyricLineup': {
        const s=await db.collection('lineups').doc(String(a[0]||'')).get();
        if(!s.exists || s.data().owner!==auth.currentUser.uid) return null;
        return {...s.data().payload,id:s.id};
      }
      case 'deleteLyricLineup': {
        const s=await db.collection('lineups').doc(String(a[0]||'')).get();
        if(s.exists && s.data().owner===auth.currentUser.uid) await s.ref.delete();
        return {success:true};
      }
      case 'exportGuide': throw err('Export is handled locally by the app.');
      default: throw err('This feature is not implemented in the Firestore migration adapter: '+method);
    }
  }
  function makeRunner(){
    const runner={
      _ok:null,_fail:null,
      withSuccessHandler(fn){this._ok=fn;return this;},
      withFailureHandler(fn){this._fail=fn;return this;},
      apiCall(method,args,token){const ok=this._ok,fail=this._fail;Promise.resolve().then(()=>apiCall(method,args)).then(v=>ok&&ok(v)).catch(e=>fail&&fail(e));},
      validateSession(token){const ok=this._ok,fail=this._fail;Promise.resolve().then(currentAccess).then(({user,role})=>ok&&ok({success:true,role,email:user.email||'',username:user.displayName||user.email,name:user.displayName||user.email,task:''})).catch(e=>fail&&fail(e));},
      logoutSession(){const ok=this._ok,fail=this._fail;auth.signOut().then(()=>ok&&ok({success:true})).catch(e=>fail&&fail(e));},
      verifyOfficerCode(){const fail=this._fail;Promise.reject(err('Use Google sign-in instead of the legacy officer code.')).catch(e=>fail&&fail(e));}
    };
    return runner;
  }
  window.google=window.google||{};
  window.google.script=window.google.script||{};
  Object.defineProperty(window.google.script,'run',{configurable:true,get:makeRunner});
  window.SSGFirebase={
    signIn:async()=>{
      const result=await auth.signInWithPopup(provider);
      const {user,role}=await currentAccess();
      return {success:true,token:user.uid,role,email:user.email||'',username:user.displayName||user.email,name:user.displayName||user.email,task:''};
    },
    signOut:()=>auth.signOut(),
    onReady:callback=>authReady.then(callback),
    // Cross-account real-time subscription for the currently displayed guide.
    listOnlineOperators:(guideId,onNext,onError)=>{
      let unsubscribe=null,cancelled=false;
      const fail=typeof onError==='function'?onError:(e=>console.error('Operator list error:',e));
      Promise.resolve().then(currentAccess).then(()=>{
        if(cancelled)return;
        unsubscribe=db.collection('operatorSessions').where('guideId','==',String(guideId)).onSnapshot(snap=>{
          const now=Date.now();
          const rows=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.online===true&&x.updatedAt&&typeof x.updatedAt.toMillis==='function'&&(now-x.updatedAt.toMillis())<15000).map(x=>({uid:x.uid,operatorName:x.operatorName||x.email||'Online operator',email:x.email||'',guideId:x.guideId,updatedAt:x.updatedAt?.toMillis?.()||0}));
          if(typeof onNext==='function')onNext(rows);
        },fail);
      }).catch(fail);
      return ()=>{cancelled=true;if(unsubscribe)unsubscribe();};
    },
    subscribeOperatorSession:(uid,onNext,onError)=>{
      let unsubscribe=null,cancelled=false;
      const fail=typeof onError==='function'?onError:(e=>console.error('Operator session error:',e));
      Promise.resolve().then(currentAccess).then(()=>{
        if(cancelled)return;
        unsubscribe=db.collection('operatorSessions').doc(String(uid)).onSnapshot(snap=>{
          if(!snap.exists){if(typeof onNext==='function')onNext(null);return;}
          const session={uid:snap.id,...snap.data()};
          const stamp=session.updatedAt&&typeof session.updatedAt.toMillis==='function'?session.updatedAt.toMillis():0;
          if(!session.online||!stamp||Date.now()-stamp>15000){if(typeof onNext==='function')onNext(null);return;}
          if(typeof onNext==='function')onNext(session);
        },fail);
      }).catch(fail);
      return ()=>{cancelled=true;if(unsubscribe)unsubscribe();};
    },
    subscribeGuide:(guideId,onNext,onError)=>{
      let unsubscribe=null, cancelled=false;
      const fail=typeof onError==='function'?onError:(e=>console.error('Guide live-sync error:',e));
      Promise.resolve().then(currentAccess).then(()=>{
        if(cancelled)return;
        unsubscribe=db.collection('guides').doc(String(guideId)).onSnapshot(snap=>{
          if(!snap.exists){fail(err('This program guide was deleted or is no longer available.','GUIDE_NOT_FOUND'));return;}
          if(typeof onNext==='function')onNext({...snap.data(),id:snap.id});
        },fail);
      }).catch(fail);
      return ()=>{cancelled=true;if(unsubscribe)unsubscribe();};
    },
    validateCurrentUser:async()=>{const {user,role}=await currentAccess();return {success:true,role,email:user.email||'',username:user.displayName||user.email,name:user.displayName||user.email,task:''};}
  };
})();

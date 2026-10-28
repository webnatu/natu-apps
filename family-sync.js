/* Optional family viewing. Only Benji's paired device can write progress. */
(() => {
'use strict';
const root=document.querySelector('#familyContent');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=document.querySelector('#familyStatus');
const tell=(message)=>{status.textContent=message};
const button=(id,label)=>`<button type="button" class="btn" id="${id}">${label}</button>`;
const field=(id,label,type='text')=>`<label class="field">${label}<input id="${id}" type="${type}" autocomplete="${type==='password'?'current-password':type==='email'?'email':'off'}"></label>`;
const config=window.BENJI_FIREBASE_CONFIG;
if(!config?.apiKey||!config?.projectId){
 tell('Family viewing needs a one-time connection before it can work across phones. Benji’s game still works on this device.');
 root.innerHTML='<p>Once family viewing is connected, each parent signs in separately to see Benji’s task checkmarks, weekly progress and rewards. Neither parent needs the other’s approval.</p><p>No progress has been shared online yet.</p>';return;
}
let auth,db,A,F,user,role='',familyId='',unsubscribe,ready=false,timer,revision=0;
let familyInfo=null,latestProgress=null;
function reset(){clearTimeout(timer);if(unsubscribe)unsubscribe();unsubscribe=null;ready=false;role='';familyId='';familyInfo=null;latestProgress=null;document.body.classList.remove('family-parent');}
function wrap(fn){return async()=>{try{await fn()}catch(e){const messages={'auth/invalid-credential':'Email or password did not match.','auth/email-already-in-use':'This email already has an account. Please sign in.','auth/weak-password':'Use a password with at least 8 characters.','permission-denied':'Access was denied. Check your email verification and the family invitation.','auth/network-request-failed':'Could not connect. Please check your internet connection.','auth/too-many-requests':'Too many attempts. Please wait before trying again.'};tell(messages[e.code]||'Could not finish that action. Check the connection and try again.')}};}
function bind(id,fn){const el=document.getElementById(id);if(el)el.onclick=wrap(fn)}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('')}
function savedSession(){try{return JSON.parse(localStorage.getItem('benjiFamilySession')||'null')}catch{return null}}
function remember(){localStorage.setItem('benjiFamilySession',JSON.stringify({uid:user.uid,role,familyId}))}
function logoutButton(){bind('familyLogout',async()=>{await A.signOut(auth);localStorage.removeItem('benjiFamilySession');reset();showLogin()})}
function showLogin(){
 root.innerHTML=`<h3>Parent sign-in</h3><p>Each parent uses their own account. This dashboard only shows progress; it does not require approvals from either parent.</p>${field('parentEmail','Your email','email')}${field('parentPassword','Password (at least 8 characters)','password')}<div class="btnrow">${button('parentSignIn','Sign in')}${button('parentSignUp','Create parent account')}${button('parentReset','Reset password')}</div><hr><h3>On Benji’s device</h3><p>A parent first creates a family, then shares its one-time device code here.</p>${field('childPairCode','One-time device code')}${button('childPair','Connect Benji’s device')}`;
 const credentials=()=>({email:document.getElementById('parentEmail').value.trim().toLowerCase(),password:document.getElementById('parentPassword').value});
 bind('parentSignIn',async()=>{let c=credentials();await A.signInWithEmailAndPassword(auth,c.email,c.password)});
 bind('parentSignUp',async()=>{let c=credentials();if(c.password.length<8){tell('Use a password with at least 8 characters.');return}let result=await A.createUserWithEmailAndPassword(auth,c.email,c.password);await A.sendEmailVerification(result.user);tell('Check your email for the verification link, then tap “I verified my email”.')});
 bind('parentReset',async()=>{let c=credentials();await A.sendPasswordResetEmail(auth,c.email);tell('If an account exists for that address, check its password reset email.')});
 bind('childPair',async()=>{
  let parts=document.getElementById('childPairCode').value.trim().split('.');if(parts.length!==2||!/^[A-Za-z0-9]{20}$/.test(parts[0])||!/^[a-f0-9]{64}$/.test(parts[1])){tell('Paste the complete one-time device code from the parent setup.');return}
  if(!confirm('Connect this browser as Benji’s device? Use a separate browser or phone for the parent dashboard.'))return;
  await A.signOut(auth);let credential=await A.signInAnonymously(auth);user=credential.user;
  await F.updateDoc(F.doc(db,'families',parts[0]),{childUid:user.uid,pairToken:null,pairingProof:parts[1]});
  familyId=parts[0];role='child';remember();await startChild();
 });
}
function verifyScreen(){
 root.innerHTML=`<p>Verify your email address before opening family progress.</p><div class="btnrow">${button('parentVerified','I verified my email')}${button('parentResend','Resend verification')}${button('familyLogout','Sign out')}</div>`;
 bind('parentVerified',async()=>{await user.reload();await user.getIdToken(true);user=auth.currentUser;if(user.emailVerified)await showParentSetup();else tell('Your email is not verified yet. Check your inbox and spam folder.')});
 bind('parentResend',async()=>{await A.sendEmailVerification(user);tell('Verification email sent.')});logoutButton();
}
async function showParentSetup(){
 if(!user.emailVerified){verifyScreen();return}
 document.body.classList.add('family-parent');document.querySelector('[data-view="family"]').click();
 root.innerHTML=`<p>Signed in as ${esc(user.email)}. Parents can view Benji’s checkmarks without approving one another.</p><h3>First parent</h3>${button('familyCreate','Create our family')}<h3>Already invited?</h3>${field('familyJoinId','Family ID shared by the other parent')}${button('familyJoin','Open family')}<p>Both parents need separate verified accounts. The first parent adds the other parent’s email.</p>${button('familyLogout','Sign out')}`;
 bind('familyCreate',async()=>{let ref=F.doc(F.collection(db,'families'));await F.setDoc(ref,{ownerUid:user.uid,parentEmails:[user.email],childUid:null,pairToken:token()});familyId=ref.id;role='parent';remember();await startParent()});
 bind('familyJoin',async()=>{let id=document.getElementById('familyJoinId').value.trim();if(!/^[A-Za-z0-9]{20}$/.test(id)){tell('Enter the Family ID shared by the first parent.');return}let snap=await F.getDoc(F.doc(db,'families',id));if(!snap.exists())throw new Error('missing');familyId=id;role='parent';remember();await startParent()});logoutButton();
}
function stateSummary(data){
 let s;try{s=JSON.parse(data.stateJson)}catch{return '<p>Could not read the shared progress.</p>'}
 let now=new Date(),names=window.benjiFamily.tasks;let dates=Array.from({length:7},(_,i)=>{let d=new Date(now);d.setDate(d.getDate()-i);return {key:`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`,label:d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}});
 let today=dates[0],completed=names.filter((_,i)=>s.done?.[today.key+':'+i]).length;
 return `<h3>Today: ${completed}/${names.length} tasks marked</h3><p class="subtitle">These are Benji’s checkmarks, not independent verification. Days follow this phone’s time zone.</p>${dates.map((d,index)=>`<details ${index===0?'open':''}><summary style="padding:12px 0;cursor:pointer">${esc(d.label)} — ${names.filter((_,i)=>s.done?.[d.key+':'+i]).length}/${names.length}</summary>${names.map((name,i)=>`<div class="task"><span aria-label="${s.done?.[d.key+':'+i]?'Marked complete':'Not marked'}">${s.done?.[d.key+':'+i]?'✅':'⬜'}</span><span>${esc(name)}</span></div>`).join('')}</details>`).join('')}<h3>Game & rewards</h3><div class="progress-cards"><div><strong>${Number(s.coins)||0}</strong>Decoration coins</div><div><strong>${Number(s.homeworkPoints)||0}</strong>Treat points</div><div><strong>${Array.isArray(s.dogs)?s.dogs.length:0}</strong>Unlocked pets</div></div><p>Adventure level ${Number(s.adventure?.level)||1}</p><h3>Reward requests</h3>${Array.isArray(s.rewards)&&s.rewards.length?s.rewards.slice(-10).reverse().map(r=>`<div class="note">${esc(r)}</div>`).join(''):'<p>No reward requests recorded.</p>'}`;
}
async function startParent(){
 ready=false;if(unsubscribe)unsubscribe();document.body.classList.add('family-parent');document.querySelector('[data-view="family"]').click();
 let info=await F.getDoc(F.doc(db,'families',familyId));familyInfo=info.data();if(!familyInfo)throw new Error('missing');
 root.innerHTML=`<p><strong>Parent dashboard · view only</strong><br>Signed in as ${esc(user.email)}</p><p>Family ID: <code>${esc(familyId)}</code></p><div id="familyManagement"></div><div id="familyProgress"><p>Waiting for Benji’s first sync…</p></div>${button('familyLogout','Sign out')}`;
 const manage=document.getElementById('familyManagement');
 if(familyInfo.ownerUid===user.uid){
  manage.innerHTML=`<details><summary style="cursor:pointer;padding:10px 0">Family connections</summary><p>Share the Family ID above with the other parent. They sign in with the email you add below.</p>${field('inviteParent','Other parent’s email','email')}${button('inviteSave','Save parent access')}<p id="invitedEmail"></p><p>One-time code for Benji’s device (keep private):</p><code id="pairCode" style="display:block;overflow-wrap:anywhere"></code><p>Generating a replacement code disconnects the previous child browser until the new device is paired.</p>${button('pairRegenerate','Replace device connection')}</details>`;
  document.getElementById('invitedEmail').textContent='Other parent: '+(familyInfo.parentEmails.find(e=>e!==user.email)||'not added');
  document.getElementById('pairCode').textContent=familyInfo.pairToken?`${familyId}.${familyInfo.pairToken}`:'Device code used. Benji’s browser is connected.';
  bind('inviteSave',async()=>{let email=document.getElementById('inviteParent').value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){tell('Enter a valid email address.');return}await F.updateDoc(F.doc(db,'families',familyId),{parentEmails:[...new Set([user.email,email])]});tell('Parent access saved. Share the Family ID with that parent.');await startParent()});
  bind('pairRegenerate',async()=>{if(!confirm('Disconnect the previous Benji device and create a replacement code?'))return;await F.updateDoc(F.doc(db,'families',familyId),{childUid:null,pairToken:token()});await startParent()});
 }
 logoutButton();
 unsubscribe=F.onSnapshot(F.doc(db,'families',familyId,'progress','current'),{includeMetadataChanges:true},snap=>{
  if(!snap.exists()){tell('No shared progress yet. Connect Benji’s device with the one-time code.');return}
  latestProgress=snap.data();document.getElementById('familyProgress').innerHTML=stateSummary(latestProgress);
  let at=latestProgress.updatedAt?.toDate();tell(`${snap.metadata.fromCache?'Saved copy — reconnect to check for updates.':'Connected.'} Last received: ${at?at.toLocaleString():'syncing…'}`);
 },()=>{document.getElementById('familyProgress').textContent='Shared progress is unavailable.';tell('Cannot read this family. Access may have changed or the connection was interrupted.')});
}
async function upload(){
 if(!ready||role!=='child')return;
 const current=revision;
 try{tell('Syncing Benji’s checkmarks…');await F.setDoc(F.doc(db,'families',familyId,'progress','current'),{stateJson:JSON.stringify(window.benjiFamily.getState()),updatedAt:F.serverTimestamp(),deviceUpdatedAt:Date.now()});if(current===revision)localStorage.removeItem('benjiFamilyDirty');tell('Checkmarks shared with both parents.')}catch{tell('Progress is saved on this device. Could not sync; reconnect and tap “Sync now”.')}
}
async function startChild(){
 root.innerHTML=`<p>This is Benji’s connected device. His task checkmarks and game progress are shared with the invited parents. They can view them; neither parent needs to approve the other.</p><div class="btnrow">${button('familySyncNow','Sync now')}${button('familyLogout','Disconnect this device')}</div>`;logoutButton();bind('familySyncNow',upload);
 let snapshot=await F.getDoc(F.doc(db,'families',familyId,'progress','current'));
 if(snapshot.exists()&&!localStorage.getItem('benjiFamilyDirty')){let state;try{state=JSON.parse(snapshot.data().stateJson)}catch{throw new Error('invalid state')}window.benjiFamily.restore(state)}
 ready=true;await upload();
}
window.addEventListener('benji-progress-saved',()=>{if(role!=='child')return;revision++;localStorage.setItem('benjiFamilyDirty','1');clearTimeout(timer);timer=setTimeout(upload,650)});
window.addEventListener('online',()=>{if(role==='child')upload()});
(async()=>{
 tell('Connecting to family viewing…');
 [A,F]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')]);
 const app=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');let instance=app.initializeApp(config);auth=A.getAuth(instance);db=F.getFirestore(instance);
 A.onAuthStateChanged(auth,async current=>{
  user=current;reset();try{
   if(!user){showLogin();tell('Sign in as a parent, or connect Benji’s device.');return}
   // Anonymous sign-in during pairing is handled by the pairing action.
   let saved=savedSession();if(user.isAnonymous){if(saved?.uid===user.uid&&saved.role==='child'){role='child';familyId=saved.familyId;await startChild()}return}
   if(!user.emailVerified){verifyScreen();tell('Please verify your email address.');return}
   if(saved?.uid===user.uid&&saved.role==='parent'){role='parent';familyId=saved.familyId;await startParent()}else await showParentSetup();
  }catch{tell('Family viewing could not connect. Your local game is unchanged. Sign out and try again.');root.innerHTML=button('familyLogout','Sign out');logoutButton()}
 });
})().catch(()=>{tell('Family viewing could not load. Check your connection; Benji’s local game still works.');root.innerHTML='<p>Try reopening the app when you are online.</p>'});
})();

/* SmartCare Clinic — Supabase-backed application.
   Configure supabase-config.js and run supabase/schema.sql before using. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const cfg = window.SMARTCARE_SUPABASE || {};
const supabaseReady = Boolean(window.supabase && cfg.url && cfg.anonKey);
const db = supabaseReady ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
let doctors = [], currentUser = null, currentProfile = null, toastTimer;
const localISODate=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function notify(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3200)}
function openModal(html){$("#modalContent").innerHTML=html;$("#modalBackdrop").hidden=false}
function closeModal(){$("#modalBackdrop").hidden=true}
function configWarning(){if(!supabaseReady){notify("Supabase setup is incomplete. Configure supabase-config.js first.");return true}return false}
async function init(){
 $("#year").textContent=new Date().getFullYear();$("#appointmentDate").min=localISODate();$("#appointmentDate").value=localISODate();
 $("#menuToggle").onclick=()=>$("#mainNav").classList.toggle("open");
 $$('#mainNav a').forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));
 $("#modalClose").onclick=closeModal;$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
 $("#loginOpen").onclick=()=>authModal("login");$("#registerOpen").onclick=()=>authModal("register");
 $("#doctorGrid").addEventListener("click",e=>{const b=e.target.closest("[data-book-doctor]");if(!b)return;$("#doctorSelect").value=b.dataset.bookDoctor;$("#booking").scrollIntoView({behavior:"smooth"})});
 $("#bookingForm").addEventListener("submit",bookAppointment);$("#tokenForm").addEventListener("submit",lookupToken);
 document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="a")staffAccess()});
 if(!supabaseReady){renderDoctors([]);$("#heroServing").textContent="--";return}
 const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;
 if(currentUser)await loadProfile();
 db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;setTimeout(async()=>{if(currentUser)await loadProfile();else{currentProfile=null;renderHeaderAuth()}},0)});
 await loadDoctors();renderHeaderAuth();updateHeroServing();
}
async function loadDoctors(){const {data,error}=await db.from("doctors").select("*").order("name");if(error){notify("Could not load doctors. Run supabase/schema.sql.");doctors=[]}else doctors=data||[];renderDoctors(doctors)}
function renderDoctors(list){
 $("#doctorGrid").innerHTML=list.length?list.map(d=>`<article class="doctor-card"><div class="doctor-avatar">${esc(d.initials||d.name.split(" ").map(x=>x[0]).slice(0,2).join(""))}</div><h3>${esc(d.name)}</h3><div class="doctor-speciality">${esc(d.speciality)}</div><div class="doctor-meta">◷ ${esc(d.days)}<br>⌚ ${esc(d.hours)}</div><div class="doctor-bottom"><b>₹${Number(d.fee).toLocaleString("en-IN")}<small>Consultation fee</small></b><button type="button" data-book-doctor="${esc(d.id)}">Book now ↗</button></div></article>`).join(""):'<p class="empty-state">Doctor profiles will appear after Supabase is configured.</p>';
 $("#doctorSelect").innerHTML='<option value="">Choose a doctor</option>'+list.map(d=>`<option value="${esc(d.id)}">${esc(d.name)} — ${esc(d.speciality)}</option>`).join("");
}
async function loadProfile(){const {data,error}=await db.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();if(error){console.error(error);return}currentProfile=data;renderHeaderAuth()}
function renderHeaderAuth(){
 const login=$("#loginOpen"),register=$("#registerOpen");
 if(currentUser){login.textContent="My account";login.onclick=accountModal;register.textContent="Sign out";register.onclick=async()=>{await db.auth.signOut();notify("Signed out.")}}
 else{login.textContent="Login";login.onclick=()=>authModal("login");register.textContent="Get Started ↗";register.onclick=()=>authModal("register")}
}
function authModal(mode){
 const reg=mode==="register";
 openModal(`<div class="eyebrow">PATIENT ACCOUNT</div><h2 id="modalTitle">${reg?"Create your account":"Welcome back"}</h2><p>${reg?"Register with your email and create a secure password.":"Sign in to manage your appointments."}</p><form id="authForm">${reg?'<label>Full name<input name="name" required minlength="2" placeholder="Your full name"></label><label>Phone number<input name="phone" required pattern="[0-9+() -]{8,16}" placeholder="Your contact number"></label>':''}<label>Email address<input name="email" type="email" required placeholder="name@example.com"></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="${reg?"new-password":"current-password"}" placeholder="At least 8 characters"></label><button class="btn btn-primary" type="submit">${reg?"Create account":"Sign in"}</button></form><p class="form-foot">Use a unique password. Do not share your login details.</p><button class="text-link" id="switchAuth" type="button">${reg?"Already registered? Sign in":"New patient? Create an account"}</button>`);
 $("#switchAuth").onclick=()=>authModal(reg?"login":"register");
 $("#authForm").onsubmit=async e=>{e.preventDefault();if(configWarning())return;const f=Object.fromEntries(new FormData(e.currentTarget).entries()),btn=e.currentTarget.querySelector("button");btn.disabled=true;
  try{if(reg){const {data,error}=await db.auth.signUp({email:f.email,password:f.password,options:{data:{full_name:f.name,phone:f.phone}}});if(error)throw error;if(data.session){currentUser=data.user;await loadProfile();closeModal();notify("Account created.")}else notify("Check your email to confirm your account, then sign in.")}else{const {error}=await db.auth.signInWithPassword({email:f.email,password:f.password});if(error)throw error;closeModal();notify("Signed in successfully.")}}
  catch(err){notify(err.message||"Authentication failed.")}finally{btn.disabled=false}
 };
}
function accountModal(){openModal(`<div class="eyebrow">YOUR ACCOUNT</div><h2 id="modalTitle">${esc(currentProfile?.full_name||currentUser?.email||"Patient account")}</h2><p>Signed in as ${esc(currentUser?.email||"")}</p><p>Account role: <b>${esc(currentProfile?.role||"patient")}</b></p><button class="btn btn-light btn-full" id="accountClose">Close</button>`);$("#accountClose").onclick=closeModal}
async function bookAppointment(e){
 e.preventDefault();if(configWarning())return;if(!currentUser){notify("Please sign in before booking.");authModal("login");return}
 const d=Object.fromEntries(new FormData(e.currentTarget).entries());
 const {data,error}=await db.rpc("book_appointment",{p_patient_name:d.patientName,p_age:Number(d.age),p_phone:d.phone,p_email:d.email||null,p_doctor_id:d.doctorId,p_department:d.department,p_appointment_date:d.date,p_appointment_time:d.time,p_reason:d.reason||null});
 if(error){notify(error.message.includes("duplicate")?"An active appointment already exists for this doctor, date and time.":error.message);return}
 const a=data?.[0];if(!a){notify("Booking did not return a confirmation.");return}
 e.currentTarget.reset();$("#appointmentDate").value=localISODate();showReceipt({id:a.appointment_id,token:a.token_no,...d});updateHeroServing();
}
function showReceipt(a){
 const doc=doctors.find(x=>x.id===a.doctorId);
 openModal(`<div class="eyebrow">APPOINTMENT CONFIRMED</div><h2 id="modalTitle">You're all set!</h2><p>Your appointment is saved to the clinic's online database.</p><div class="receipt" id="printReceipt"><h3>SMARTCARE CLINIC</h3><p>Appointment Confirmation</p><div class="receipt-row"><span>Patient</span><b>${esc(a.patientName)}</b></div><div class="receipt-row"><span>Doctor</span><b>${esc(doc?.name||"Doctor")}</b></div><div class="receipt-row"><span>Appointment ID</span><b>${esc(a.id)}</b></div><div class="receipt-row"><span>Date & time</span><b>${esc(a.date)} · ${esc(a.time)}</b></div><div class="receipt-token"><small>YOUR TOKEN NUMBER</small><strong>${String(a.token).padStart(3,"0")}</strong></div><p>Keep your appointment ID and phone number for token lookup.</p></div><button class="btn btn-primary btn-full" id="printBtn">Print appointment receipt ↗</button><button class="btn btn-light btn-full" id="receiptDone">Done</button>`);
 $("#printBtn").onclick=()=>{const w=window.open("","_blank","width=650,height=750");if(!w){notify("Please allow pop-ups to print.");return}w.document.write('<html><head><title>SmartCare Receipt</title><style>body{font-family:Arial;padding:35px;color:#18343b}.receipt{border:1px dashed #8ab5a9;padding:25px;border-radius:12px}h3{text-align:center}.receipt-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ddd}.receipt-token{text-align:center;background:#eef8f5;padding:18px;margin-top:15px}.receipt-token strong{display:block;font-size:38px;color:#087f8c}</style></head><body><div class="receipt">'+$("#printReceipt").innerHTML+'</div></body></html>');w.document.close();w.print()};
 $("#receiptDone").onclick=closeModal;
}
async function lookupToken(e){
 e.preventDefault();if(configWarning())return;const raw=$("#tokenLookup").value.trim();if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(raw)){notify("Enter the full appointment ID from your receipt.");return}
 const phone=prompt("Enter the phone number used for this appointment:");if(!phone)return;
 const {data,error}=await db.rpc("lookup_appointment",{p_appointment_id:raw,p_phone:phone}),target=$("#tokenResult");
 if(error){target.innerHTML='<p class="empty-state">Unable to check this appointment right now.</p>';notify(error.message);return}
 const a=data?.[0];if(!a){target.innerHTML='<p class="empty-state">No appointment matched that ID and phone number.</p>';return}
 target.innerHTML=`<div class="token-result-card"><div><small>YOUR TOKEN</small><strong>#${String(a.token_no).padStart(3,"0")}</strong></div><div><small>DOCTOR</small><strong>${esc(a.doctor_name)}</strong></div><div><small>PATIENTS AHEAD</small><strong>${a.patients_ahead}</strong></div><div><small>STATUS</small><strong><span class="status-pill">${esc(a.status)}</span></strong></div><div><small>APPOINTMENT ID</small><strong>${esc(a.appointment_id)}</strong></div><div><small>DATE & TIME</small><strong>${esc(a.appointment_date)} · ${esc(a.appointment_time)}</strong></div><div><small>CURRENTLY CALLED</small><strong>#${String(a.currently_called).padStart(3,"0")}</strong></div></div>`;
}
async function updateHeroServing(){if(!db)return;const {data}=await db.from("appointments").select("token_no").eq("appointment_date",localISODate()).eq("status","Called").order("token_no",{ascending:false}).limit(1);$("#heroServing").textContent=data?.[0]?String(data[0].token_no).padStart(3,"0"):"--"}
function staffAccess(){if(!currentUser){notify("Sign in with an authorized clinic staff account first.");authModal("login");return}if(!["admin","doctor"].includes(currentProfile?.role)){notify("This account does not have staff permissions.");return}renderStaff()}
async function renderStaff(){
 const admin=currentProfile.role==="admin";let q=db.from("appointments").select("id,patient_name,phone,doctor_id,appointment_date,appointment_time,token_no,status").order("appointment_date").order("token_no").limit(250);if(!admin)q=q.eq("doctor_id",currentProfile.doctor_id);
 const {data,error}=await q;if(error){notify(error.message);return}const rows=data||[];
 openModal(`<div class="eyebrow">SECURE STAFF DASHBOARD</div><h2 id="modalTitle">Clinic appointments</h2><p>${admin?"Administrator view":"Doctor view"} · ${rows.length} records</p><div style="max-height:48vh;overflow:auto">${rows.map(a=>`<div style="padding:12px 0;border-bottom:1px solid #e5eeec;display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(a.patient_name)}</b><br><span style="color:#849496;font-size:10px">#${String(a.token_no).padStart(3,"0")} · ${esc(a.appointment_date)} · ${esc(a.appointment_time)} · ${esc(a.status)}</span></div><div style="display:flex;gap:5px;flex-wrap:wrap">${a.status==="Waiting"?`<button class="btn btn-light" data-status="Called" data-id="${a.id}">Call</button>`:""}${!["Completed","Cancelled"].includes(a.status)?`<button class="btn btn-light" data-status="Completed" data-id="${a.id}">Done</button><button class="btn btn-light" data-status="Cancelled" data-id="${a.id}">Cancel</button>`:""}</div></div>`).join("")||'<p class="empty-state">No appointments found.</p>'}</div><button class="btn btn-light btn-full" id="staffClose">Close</button>`);
 $("#staffClose").onclick=closeModal;$("#modalContent").querySelectorAll("[data-status]").forEach(b=>b.onclick=async()=>{const {error}=await db.from("appointments").update({status:b.dataset.status}).eq("id",b.dataset.id);if(error)notify(error.message);else{notify("Appointment updated.");renderStaff();updateHeroServing()}});
}
init();

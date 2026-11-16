/* SmartCare Clinic - front-end demonstration.
   Records are stored in this browser only. Connect a secured hosted database
   before using this for real patient appointments. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = "smartcare_demo_v1";
const doctorsSeed = [
  {id:"doc-ravi",name:"Dr. Ravi Kumar",speciality:"General Physician",department:"General Medicine",days:"Mon – Sat",hours:"9:00 AM – 1:00 PM",fee:300,initials:"RK"},
  {id:"doc-priya",name:"Dr. Priya",speciality:"Dermatologist",department:"Dermatology",days:"Mon – Fri",hours:"10:00 AM – 4:00 PM",fee:500,initials:"DP"},
  {id:"doc-suresh",name:"Dr. Suresh",speciality:"Cardiologist",department:"Cardiology",days:"Tue – Sat",hours:"9:30 AM – 2:00 PM",fee:700,initials:"DS"},
  {id:"doc-anjali",name:"Dr. Anjali",speciality:"Pediatrician",department:"Pediatrics",days:"Mon – Sat",hours:"11:00 AM – 5:00 PM",fee:400,initials:"DA"}
];
let state = loadState();
let toastTimer;
function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{doctors:doctorsSeed,appointments:[],users:[],serving:{}}}catch{return{doctors:doctorsSeed,appointments:[],users:[],serving:{}}}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function escapeHTML(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function notify(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
function localISODate(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function openModal(html){$("#modalContent").innerHTML=html;$("#modalBackdrop").hidden=false}
function closeModal(){$("#modalBackdrop").hidden=true}
function renderDoctors(){
  $("#doctorGrid").innerHTML=state.doctors.map(d=>`<article class="doctor-card"><div class="doctor-avatar">${escapeHTML(d.initials||d.name.split(" ").map(x=>x[0]).slice(0,2).join(""))}</div><h3>${escapeHTML(d.name)}</h3><div class="doctor-speciality">${escapeHTML(d.speciality)}</div><div class="doctor-meta">◷ ${escapeHTML(d.days)}<br>⌚ ${escapeHTML(d.hours)}</div><div class="doctor-bottom"><b>₹${Number(d.fee).toLocaleString("en-IN")}<small>Consultation fee</small></b><button type="button" data-book-doctor="${escapeHTML(d.id)}">Book now ↗</button></div></article>`).join("");
  $("#doctorSelect").innerHTML='<option value="">Choose a doctor</option>'+state.doctors.map(d=>`<option value="${escapeHTML(d.id)}">${escapeHTML(d.name)} — ${escapeHTML(d.speciality)}</option>`).join("");
}
function getQueue(doctorId,date){return state.appointments.filter(a=>a.doctorId===doctorId&&a.date===date&&a.status!=="Cancelled").sort((a,b)=>a.token-b.token)}
function updateServing(){const today=localISODate();const all=state.appointments.filter(a=>a.date===today);const first=all.sort((a,b)=>a.token-b.token)[0];$("#heroServing").textContent=first?String(state.serving[first.doctorId+"_"+today]||0).padStart(3,"0"):"--"}
function createId(){return "SC"+(1001+state.appointments.length).toString()}
function showReceipt(a){
  const d=state.doctors.find(x=>x.id===a.doctorId);
  openModal(`<div class="eyebrow">APPOINTMENT CONFIRMED</div><h2 id="modalTitle">You're all set!</h2><p>Your appointment has been added to this browser's demo records.</p><div class="receipt" id="printReceipt"><h3>SMARTCARE CLINIC</h3><p>Appointment Confirmation</p><div class="receipt-row"><span>Patient</span><b>${escapeHTML(a.patientName)}</b></div><div class="receipt-row"><span>Doctor</span><b>${escapeHTML(d?.name||"Doctor")}</b></div><div class="receipt-row"><span>Appointment ID</span><b>${escapeHTML(a.id)}</b></div><div class="receipt-row"><span>Date & time</span><b>${escapeHTML(a.date)} · ${escapeHTML(a.time)}</b></div><div class="receipt-row"><span>Status</span><b>${escapeHTML(a.status)}</b></div><div class="receipt-token"><small>YOUR TOKEN NUMBER</small><strong>${String(a.token).padStart(3,"0")}</strong></div><p>Please arrive 10 minutes before your appointment.</p></div><button class="btn btn-primary btn-full" id="printBtn">Print appointment receipt ↗</button><button class="btn btn-light btn-full" id="receiptDone">Done</button>`);
  $("#printBtn").onclick=()=>{const content=$("#printReceipt").innerHTML;const w=window.open("","_blank","width=650,height=750");if(!w){notify("Please allow pop-ups to print the receipt.");return}w.document.write('<html><head><title>SmartCare Receipt</title><style>body{font-family:Arial;padding:35px;color:#18343b}.receipt{border:1px dashed #8ab5a9;padding:25px;border-radius:12px}h3{text-align:center}p{text-align:center;color:#678} .receipt-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ddd}.receipt-token{text-align:center;background:#eef8f5;padding:18px;margin-top:15px}.receipt-token strong{display:block;font-size:38px;color:#087f8c}</style></head><body><div class="receipt">'+content+'</div></body></html>');w.document.close();w.print()};
  $("#receiptDone").onclick=closeModal;
}
$("#bookingForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);const data=Object.fromEntries(f.entries());
  const doctor=state.doctors.find(d=>d.id===data.doctorId);if(!doctor){notify("Please select a doctor.");return}
  if(data.date<localISODate()){notify("Please choose today or a future date.");return}
  const duplicate=state.appointments.some(a=>a.doctorId===data.doctorId&&a.date===data.date&&a.time===data.time&&a.phone===data.phone&&a.status!=="Cancelled");
  if(duplicate){notify("You already have a booking for this doctor and time.");return}
  const queue=getQueue(data.doctorId,data.date);const token=queue.length?Math.max(...queue.map(a=>a.token))+1:1;
  const appointment={...data,id:createId(),token,status:"Waiting",createdAt:new Date().toISOString()};
  state.appointments.push(appointment);saveState();e.currentTarget.reset();showReceipt(appointment);updateServing();
});
$("#tokenForm").addEventListener("submit",e=>{
  e.preventDefault();const q=$("#tokenLookup").value.trim().toLowerCase();const a=state.appointments.find(x=>x.id.toLowerCase()===q||String(x.token).padStart(3,"0")===q||String(x.token)===q);
  const target=$("#tokenResult");if(!a){target.innerHTML='<p class="empty-state">No matching appointment found in this browser. Check the ID or token number.</p>';return}
  const d=state.doctors.find(x=>x.id===a.doctorId);const queue=getQueue(a.doctorId,a.date);const serving=Number(state.serving[a.doctorId+"_"+a.date]||0);const ahead=Math.max(0,a.token-serving-1);const status=a.status==="Waiting"?(a.token<=serving?"Called":"Waiting"):a.status;
  target.innerHTML=`<div class="token-result-card"><div><small>YOUR TOKEN</small><strong>#${String(a.token).padStart(3,"0")}</strong></div><div><small>DOCTOR</small><strong>${escapeHTML(d?.name||"—")}</strong></div><div><small>PATIENTS AHEAD</small><strong>${status==="Waiting"?ahead:"—"}</strong></div><div><small>STATUS</small><strong><span class="status-pill">${escapeHTML(status)}</span></strong></div><div><small>APPOINTMENT ID</small><strong>${escapeHTML(a.id)}</strong></div><div><small>DATE & TIME</small><strong>${escapeHTML(a.date)} · ${escapeHTML(a.time)}</strong></div><div><small>CURRENTLY SERVING</small><strong>#${String(serving).padStart(3,"0")}</strong></div><div><small>ESTIMATED WAIT</small><strong>${status==="Waiting"?ahead*10+" min":"—"}</strong></div></div>`;
});
function authModal(mode="login"){
  const isReg=mode==="register";
  openModal(`<div class="eyebrow">PATIENT ACCOUNT</div><h2 id="modalTitle">${isReg?"Create your account":"Welcome back"}</h2><p>${isReg?"Register to keep your appointment details together.":"Sign in with the phone number you registered."}</p><form id="authForm">${isReg?'<label>Full name<input name="name" required minlength="2" placeholder="Your full name"></label>':''}<label>Phone number<input name="phone" required pattern="[0-9+() -]{8,16}" placeholder="Your phone number"></label>${isReg?'<label>Email address<input name="email" type="email" placeholder="name@example.com"></label>':''}<button class="btn btn-primary" type="submit">${isReg?"Create account":"Continue"}</button></form><p class="form-foot">Demo account only. Do not enter a real password or sensitive information.</p>`);
  $("#authForm").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());let user=state.users.find(u=>u.phone===f.phone);if(isReg){if(user){notify("This phone number is already registered.");return}user={name:f.name,phone:f.phone,email:f.email||""};state.users.push(user);saveState();notify("Demo account created.");}else if(!user){notify("No demo account found. Please register first.");return}else notify("Welcome back, "+user.name+".");closeModal();};
}
$("#loginOpen").onclick=()=>authModal("login");$("#registerOpen").onclick=()=>authModal("register");
$("#modalClose").onclick=closeModal;$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
$("#doctorGrid").addEventListener("click",e=>{const b=e.target.closest("[data-book-doctor]");if(!b)return;$("#doctorSelect").value=b.dataset.bookDoctor;$("#booking").scrollIntoView({behavior:"smooth"});});
$("#menuToggle").onclick=()=>$("#mainNav").classList.toggle("open");
$$('#mainNav a').forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));
$("#appointmentDate").min=localISODate();$("#appointmentDate").value=localISODate();$("#year").textContent=new Date().getFullYear();
renderDoctors();updateServing();

// Demo admin/doctor console: open with Ctrl+Shift+A. This is intentionally
// not production-secure; use server-side authorization before real deployment.
document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="a")adminLogin()});
function adminLogin(){openModal('<div class="eyebrow">STAFF DEMO CONSOLE</div><h2 id="modalTitle">Clinic dashboard</h2><p>Enter the demo access code to manage this browser\'s sample queue.</p><form id="adminForm"><label>Demo access code<input name="pin" type="password" required placeholder="Demo code"></label><button class="btn btn-primary">Open dashboard</button></form><p class="form-foot">Demo access code: <b>care2026</b>. Not suitable for a real clinic.</p>');$("#adminForm").onsubmit=e=>{e.preventDefault();if(new FormData(e.currentTarget).get("pin")!=="care2026"){notify("Incorrect demo code.");return}renderAdmin()}};
function renderAdmin(){
  const today=localISODate(),todayItems=state.appointments.filter(a=>a.date===today),waiting=todayItems.filter(a=>a.status==="Waiting").length,completed=todayItems.filter(a=>a.status==="Completed").length;
  openModal(`<div class="eyebrow">STAFF WORKSPACE · DEMO</div><h2 id="modalTitle">Clinic dashboard</h2><div class="token-result-card"><div><small>PATIENTS</small><strong>${state.users.length}</strong></div><div><small>ALL BOOKINGS</small><strong>${state.appointments.length}</strong></div><div><small>TODAY</small><strong>${todayItems.length}</strong></div><div><small>WAITING</small><strong>${waiting}</strong></div></div><h3 style="font:700 14px Manrope;margin:22px 0 10px">Today's appointments</h3><div id="adminRows">${todayItems.length?todayItems.map(a=>adminRow(a)).join(""):'<p class="empty-state">No appointments today.</p>'}</div><div style="display:flex;gap:8px;margin-top:15px"><button class="btn btn-light" id="adminExport">Export CSV</button><button class="btn btn-light" id="adminClose">Close</button></div>`);
  $("#adminRows").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const a=state.appointments.find(x=>x.id===b.dataset.id);if(!a)return;const action=b.dataset.action;if(action==="next"){const key=a.doctorId+"_"+a.date;state.serving[key]=Math.max(Number(state.serving[key]||0),a.token);a.status="Called"}else if(action==="done")a.status="Completed";else if(action==="cancel")a.status="Cancelled";saveState();updateServing();renderAdmin()});
  $("#adminClose").onclick=closeModal;$("#adminExport").onclick=exportCSV;
}
function adminRow(a){return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #edf2f0;padding:10px 0;font-size:10px"><div><b>${escapeHTML(a.patientName)}</b><br><span style="color:#849496">#${String(a.token).padStart(3,"0")} · ${escapeHTML(a.time)} · ${escapeHTML(a.status)}</span></div><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="doctor-bottom button" data-action="next" data-id="${a.id}">Call</button><button class="doctor-bottom button" data-action="done" data-id="${a.id}">Done</button><button class="doctor-bottom button" data-action="cancel" data-id="${a.id}">Cancel</button></div></div>`}
function exportCSV(){const rows=[["Appointment ID","Patient","Phone","Doctor","Date","Time","Token","Status"],...state.appointments.map(a=>[a.id,a.patientName,a.phone,state.doctors.find(d=>d.id===a.doctorId)?.name||"",a.date,a.time,a.token,a.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const link=document.createElement("a");link.href=url;link.download="smartcare-appointments.csv";link.click();URL.revokeObjectURL(url)}

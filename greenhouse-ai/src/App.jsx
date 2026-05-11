import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIG — byt ut dessa med dina egna värden från supabase.com
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://tmlgwtrairbqqfgttsmf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbGd3dHJhaXJicXFmZ3R0c21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTY4ODcsImV4cCI6MjA5NDA5Mjg4N30.zQ5g7Yjd9n-ncR0VKLhKjPoupvJDBmGNXHer412mQP4";

// Enkel Supabase-klient utan npm-paket
const sb = {
  headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  authHeaders: (token) => ({ "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }),

  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method:"POST", headers: sb.headers, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers: sb.headers, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:"POST", headers: sb.authHeaders(token) });
  },
  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: sb.authHeaders(token) });
    return r.json();
  },

  // Plants CRUD
  async getPlants(token, userId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/plants?user_id=eq.${userId}&order=created_at.asc`, { headers: sb.authHeaders(token) });
    return r.json();
  },
  async upsertPlant(token, plant) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/plants`, { method:"POST", headers: { ...sb.authHeaders(token), "Prefer":"resolution=merge-duplicates" }, body: JSON.stringify(plant) });
    return r.json();
  },
  async deletePlant(token, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/plants?id=eq.${id}`, { method:"DELETE", headers: sb.authHeaders(token) });
  },

  // Growth logs
  async addGrowthLog(token, log) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/growth_logs`, { method:"POST", headers: { ...sb.authHeaders(token), "Prefer":"return=representation" }, body: JSON.stringify(log) });
    return r.json();
  },
  async getGrowthLogs(token, plantId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/growth_logs?plant_id=eq.${plantId}&order=logged_at.asc`, { headers: sb.authHeaders(token) });
    return r.json();
  },

  // Harvest logs
  async addHarvestLog(token, log) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/harvest_logs`, { method:"POST", headers: { ...sb.authHeaders(token), "Prefer":"return=representation" }, body: JSON.stringify(log) });
    return r.json();
  },
  async getHarvestLogs(token, plantId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/harvest_logs?plant_id=eq.${plantId}&order=harvested_at.desc`, { headers: sb.authHeaders(token) });
    return r.json();
  },

  // Plant images
  async addPlantImage(token, img) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/plant_images`, { method:"POST", headers: { ...sb.authHeaders(token), "Prefer":"return=representation" }, body: JSON.stringify(img) });
    return r.json();
  },
  async getPlantImages(token, plantId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/plant_images?plant_id=eq.${plantId}&order=taken_at.desc`, { headers: sb.authHeaders(token) });
    return r.json();
  },
};

// Kolla om Supabase är konfigurerat
const SUPABASE_READY = SUPABASE_URL !== "DIN_SUPABASE_URL" && SUPABASE_ANON_KEY !== "DIN_SUPABASE_ANON_KEY";

// ─────────────────────────────────────────────────────────────────────────────
// DEMO-DATA (används utan Supabase)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_PLANTS = [
  { id:1, name:"Tomat", variety:"Sungold F1", emoji:"🍅", location:"Växthus A", planted:"2024-04-10", health:92, water:68, temp:24, humidity:72, status:"optimal", alert:null, harvest:"15 aug", tasks:["Tjuva sidoskott","Kontrollera blomklasar"], nutrients:85, notes:"", sensorId:null, wateringLog:[], growthLog:[{date:"V1",height:12},{date:"V2",height:22},{date:"V3",height:38},{date:"V4",height:58},{date:"V5",height:80},{date:"V6",height:105}], harvestLog:[], totalHarvest:0, color:"#e8604c" },
  { id:2, name:"Paprika", variety:"Californian Wonder", emoji:"🫑", location:"Växthus A", planted:"2024-04-05", health:78, water:45, temp:26, humidity:65, status:"warning", alert:"Låg fuktighet", harvest:"20 aug", tasks:["Vattna nu"], nutrients:70, notes:"", sensorId:null, wateringLog:[], growthLog:[{date:"V1",height:8},{date:"V2",height:15},{date:"V3",height:25},{date:"V4",height:35},{date:"V5",height:42},{date:"V6",height:50}], harvestLog:[], totalHarvest:0, color:"#f0a500" },
  { id:3, name:"Gurka", variety:"Marketmore", emoji:"🥒", location:"Växthus B", planted:"2024-04-20", health:88, water:82, temp:23, humidity:80, status:"optimal", alert:null, harvest:"10 aug", tasks:["Binda upp rankor"], nutrients:90, notes:"", sensorId:null, wateringLog:[], growthLog:[{date:"V1",height:6},{date:"V2",height:18},{date:"V3",height:40},{date:"V4",height:70},{date:"V5",height:110},{date:"V6",height:145}], harvestLog:[{date:"2 aug",amount:2,unit:"st",weight:400},{date:"5 aug",amount:3,unit:"st",weight:600}], totalHarvest:1000, color:"#4caf50" },
  { id:4, name:"Basilika", variety:"Genovese", emoji:"🌿", location:"Fönsterbräda", planted:"2024-05-01", health:65, water:30, temp:21, humidity:55, status:"critical", alert:"Håller på att blomma", harvest:"Löpande", tasks:["Vattna OMEDELBART","Klipp blomknoppar"], nutrients:55, notes:"", sensorId:null, wateringLog:[], growthLog:[{date:"V1",height:5},{date:"V2",height:10},{date:"V3",height:18},{date:"V4",height:22},{date:"V5",height:24},{date:"V6",height:23}], harvestLog:[{date:"1 aug",amount:1,unit:"knippe",weight:30}], totalHarvest:30, color:"#8bc34a" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sColor(s){ return {optimal:"#4ade80",good:"#86efac",warning:"#fbbf24",critical:"#f87171"}[s]||"#aaa"; }
function sLabel(s){ return {optimal:"Optimal",good:"Bra",warning:"Varning",critical:"Kritisk"}[s]||s; }
function nowStr(){ return new Date().toLocaleString("sv-SE",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"}); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

// Compress image and return { base64, mediaType }
function prepareImage(file) {
  return new Promise((res, rej) => {
    const mediaType = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Resize to max 1024px on longest side
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      res({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = () => {
      // Fallback: read raw
      const r = new FileReader();
      r.onload = () => res({ base64: r.result.split(",")[1], mediaType });
      r.onerror = rej;
      r.readAsDataURL(file);
    };
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Btn({ onClick, children, style={}, variant="default", disabled=false }) {
  const [p,setP]=useState(false);
  const base = variant==="primary"?{background:"#4ade80",color:"#0a0f0d",border:"none",fontWeight:700}
    :variant==="danger"?{background:"rgba(248,113,113,0.15)",color:"#f87171",border:"1px solid rgba(248,113,113,0.3)"}
    :variant==="ghost"?{background:"rgba(255,255,255,0.06)",color:"#e8f0eb",border:"1px solid rgba(255,255,255,0.1)"}
    :{background:"rgba(74,222,128,0.1)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.2)"};
  return (
    <button onClick={disabled?undefined:onClick} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)} onMouseLeave={()=>setP(false)} onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)}
      style={{borderRadius:12,padding:"10px 16px",fontSize:13,cursor:disabled?"not-allowed":"pointer",transition:"all 0.15s",transform:p?"scale(0.96)":"scale(1)",opacity:disabled?0.45:p?0.85:1,...base,...style}}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#0f1a14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:430,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:17}}>{title}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#aaa",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:18}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Radial({ value, color, size=48 }) {
  const r=(size-8)/2, circ=2*Math.PI*r, off=circ-(value/100)*circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset 1s ease"}}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">{value}%</text>
    </svg>
  );
}

function GrowthChart({ data, color }) {
  if(!data||data.length===0) return <div style={{color:"#6b7c72",fontSize:13}}>Ingen data ännu</div>;
  const maxH=Math.max(...data.map(d=>d.height));
  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80,marginBottom:4}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{fontSize:10,color:"#4ade80",fontWeight:600}}>{d.height}cm</div>
            <div style={{width:"100%",background:`${color}${i===data.length-1?"cc":"55"}`,borderRadius:4,height:`${(d.height/maxH)*65}px`,minHeight:4,transition:"height 0.5s"}}/>
            <div style={{fontSize:9,color:"#6b7c72"}}>{d.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth, onSkip }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit() {
    if(!email||!password) return setError("Fyll i e-post och lösenord");
    if(!SUPABASE_READY) return setError("Supabase är inte konfigurerat — se setup-guiden.");
    setLoading(true); setError("");
    try {
      const res = mode==="signup" ? await sb.signUp(email,password) : await sb.signIn(email,password);
      if(res.error || res.error_description) return setError(res.error_description || res.error?.message || "Fel vid inloggning");
      const token = res.access_token;
      const user = await sb.getUser(token);
      onAuth({ token, user, email });
    } catch(e) { setError("Anslutningsfel — kontrollera Supabase-URL"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{minHeight:"100vh",background:"#0a0f0d",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🌿</div>
          <div style={{fontSize:26,fontWeight:700,color:"#e8f0eb",letterSpacing:-0.5}}>Greenhouse AI</div>
          <div style={{fontSize:14,color:"#6b7c72",marginTop:6}}>Din smarta odlingsassistent</div>
        </div>

        {!SUPABASE_READY && (
          <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:14,padding:14,marginBottom:20,fontSize:13,color:"#fbbf24",lineHeight:1.5}}>
            ⚠️ Supabase ej konfigurerat. Följ setup-guiden nedan eller tryck "Fortsätt utan konto" för att testa appen med demo-data.
          </div>
        )}

        <div style={{display:"flex",gap:0,marginBottom:24,background:"rgba(255,255,255,0.04)",borderRadius:14,padding:4}}>
          {[["login","Logga in"],["signup","Skapa konto"]].map(([m,lbl])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,background:mode===m?"rgba(74,222,128,0.15)":"transparent",border:mode===m?"1px solid rgba(74,222,128,0.3)":"1px solid transparent",borderRadius:10,padding:"10px",fontSize:14,color:mode===m?"#4ade80":"#6b7c72",cursor:"pointer",fontWeight:mode===m?700:400,transition:"all 0.2s"}}>{lbl}</button>
          ))}
        </div>

        {[["E-postadress","email","email",email,setEmail],["Lösenord","password","password",password,setPassword]].map(([lbl,name,type,val,setter])=>(
          <div key={name} style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:5}}>{lbl}</div>
            <input type={type} value={val} onChange={e=>setter(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={name==="email"?"din@email.se":"Minst 8 tecken"} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",color:"#e8f0eb",fontSize:15,outline:"none"}}/>
          </div>
        ))}

        {error && <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#f87171",marginBottom:14}}>{error}</div>}

        <Btn variant="primary" onClick={submit} disabled={loading} style={{width:"100%",padding:"14px",fontSize:15,borderRadius:14,marginBottom:12}}>
          {loading?"Laddar…":mode==="signup"?"Skapa konto →":"Logga in →"}
        </Btn>

        <button onClick={onSkip} style={{width:"100%",background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"12px",fontSize:14,color:"#6b7c72",cursor:"pointer"}}>
          Fortsätt utan konto (demo-läge)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA / VISION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
function CameraAnalysis({ plants, onAddPlant, onClose }) {
  const [phase,setPhase]=useState("upload"); // upload | analyzing | result
  const [imageData,setImageData]=useState(null);
  const [imagePreview,setImagePreview]=useState(null);
  const [result,setResult]=useState(null);
  const [selectedPlantId,setSelectedPlantId]=useState(null);
  const [saving,setSaving]=useState(false);

  async function handleFile(file) {
    setImagePreview(URL.createObjectURL(file));
    setPhase("analyzing");
    try {
      const { base64, mediaType } = await prepareImage(file);
      setImageData(base64);
      await analyze(base64, mediaType);
    } catch(e) {
      setResult({ plant_name:"Bildfel", variety_guess:"", emoji:"❌", health_score:0, status:"warning",
        diagnosis:`Kunde inte läsa bildfilen: ${e.message||"okänt fel"}`, issues:[], recommendations:["Prova en annan bild (JPG/PNG)"], confidence:0, care_tips:"" });
      setPhase("result");
    }
  }

  async function analyze(b64, mediaType="image/jpeg") {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1024,
          system:`Du är en expert botaniker och trädgårdsrådgivare. Analysera bilden noggrant och svara ENBART med ett JSON-objekt, ingen annan text alls, inga backticks, inga förklaringar. JSON-schemat:
{"plant_name":"string","variety_guess":"string","emoji":"string","health_score":number,"status":"optimal|good|warning|critical","diagnosis":"string","issues":["string"],"recommendations":["string"],"confidence":number,"care_tips":"string"}`,
          messages:[{
            role:"user",
            content:[
              { type:"image", source:{ type:"base64", media_type: mediaType, data: b64 } },
              { type:"text", text:"Identifiera växten på bilden och analysera hälsotillståndet. Svara bara med JSON, inget annat." }
            ]
          }]
        })
      });

      if(!res.ok) {
        const errText = await res.text();
        throw new Error(`API-fel ${res.status}: ${errText.slice(0,200)}`);
      }

      const data = await res.json();

      // Handle API-level errors
      if(data.error) throw new Error(data.error.message||JSON.stringify(data.error));

      const rawText = data.content?.map(b => b.type==="text" ? b.text : "").join("").trim() || "";
      if(!rawText) throw new Error("Tomt svar från API");

      // Strip markdown fences if present
      const clean = rawText.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
      const parsed = JSON.parse(clean);

      setResult(parsed);
      setPhase("result");
    } catch(e) {
      setResult({
        plant_name:"Analysfel",
        variety_guess:"",
        emoji:"⚠️",
        health_score:0,
        status:"warning",
        diagnosis:`Fel: ${e.message||"Okänt fel"}. Kontrollera att bilden är tydlig och under 5 MB.`,
        issues:[],
        recommendations:["Använd en tydlig bild i bra ljus","Filen bör vara JPG eller PNG","Max 5 MB"],
        confidence:0,
        care_tips:""
      });
      setPhase("result");
    }
  }

  return (
    <Modal title="📷 Kamera & AI-analys" onClose={onClose}>
      {phase==="upload"&&(
        <div>
          <div style={{fontSize:14,color:"#6b7c72",marginBottom:16,lineHeight:1.5}}>Fota eller ladda upp en bild — AI identifierar växten och analyserar hälsan automatiskt.</div>
          <label style={{display:"block",cursor:"pointer"}}>
            <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
            <div style={{background:"rgba(74,222,128,0.06)",border:"2px dashed rgba(74,222,128,0.25)",borderRadius:18,padding:32,textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:48,marginBottom:10}}>📷</div>
              <div style={{fontSize:15,color:"#4ade80",fontWeight:600}}>Fota växt</div>
              <div style={{fontSize:12,color:"#6b7c72",marginTop:4}}>Tryck för att öppna kameran</div>
            </div>
          </label>
          <label style={{display:"block",cursor:"pointer"}}>
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:16,textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:14,color:"#aaa"}}>🖼 Välj bild från galleri</div>
            </div>
          </label>
        </div>
      )}

      {phase==="analyzing"&&(
        <div style={{textAlign:"center",padding:40}}>
          {imagePreview&&<img src={imagePreview} alt="preview" style={{width:140,height:140,borderRadius:16,objectFit:"cover",marginBottom:20,border:"2px solid rgba(74,222,128,0.3)"}}/>}
          <div style={{fontSize:32,marginBottom:12}}>🔬</div>
          <div style={{color:"#4ade80",fontSize:16,fontWeight:600,marginBottom:6}}>Analyserar med Claude Vision…</div>
          <div style={{color:"#6b7c72",fontSize:13}}>Identifierar växt och hälsoproblem</div>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:16}}>
            {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",opacity:0.6,animation:`bounce 1.4s ${i*0.2}s infinite`}}/>)}
          </div>
        </div>
      )}

      {phase==="result"&&result&&(
        <div>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            {imagePreview&&<img src={imagePreview} alt="plant" style={{width:90,height:90,borderRadius:14,objectFit:"cover",border:"2px solid rgba(74,222,128,0.3)",flexShrink:0}}/>}
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:24}}>{result.emoji||"🌱"}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:17}}>{result.plant_name}</div>
                  <div style={{fontSize:12,color:"#6b7c72"}}>{result.variety_guess}</div>
                </div>
              </div>
              <div style={{display:"inline-block",background:`${sColor(result.status)}22`,border:`1px solid ${sColor(result.status)}44`,color:sColor(result.status),borderRadius:20,padding:"2px 10px",fontSize:12}}>{sLabel(result.status)}</div>
            </div>
            <Radial value={result.health_score||70} color={sColor(result.status)} size={52}/>
          </div>

          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>AI-diagnos · {result.confidence}% säkerhet</div>
            <div style={{fontSize:14,lineHeight:1.6}}>{result.diagnosis}</div>
          </div>

          {result.issues&&result.issues.length>0&&(
            <div style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:14,padding:14,marginBottom:12}}>
              <div style={{fontSize:12,color:"#f87171",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Identifierade problem</div>
              {result.issues.map((issue,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13}}><span style={{color:"#f87171"}}>·</span>{issue}</div>
              ))}
            </div>
          )}

          {result.recommendations&&result.recommendations.length>0&&(
            <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:14,padding:14,marginBottom:16}}>
              <div style={{fontSize:12,color:"#4ade80",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Rekommenderade åtgärder</div>
              {result.recommendations.map((r,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:8,fontSize:13,background:"rgba(74,222,128,0.05)",borderRadius:10,padding:"8px 12px"}}><span style={{color:"#4ade80",fontWeight:700,minWidth:16}}>{i+1}.</span>{r}</div>
              ))}
            </div>
          )}

          {result.care_tips&&(
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:12,marginBottom:16,fontSize:13,color:"#aaa",lineHeight:1.5}}>
              💡 {result.care_tips}
            </div>
          )}

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:8}}>Lägg till som ny planta eller spara analys på befintlig:</div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="primary" style={{flex:1,textAlign:"center"}} onClick={()=>{
                onAddPlant({
                  name:result.plant_name, variety:result.variety_guess||"Okänd sort",
                  emoji:result.emoji||"🌱", location:"Okänd", planted:todayISO(),
                  health:result.health_score||75, water:60, temp:22, humidity:65,
                  status:result.status||"good", alert:result.issues?.[0]||null,
                  harvest:"Okänt", tasks:result.recommendations||[], nutrients:70,
                  notes:`AI-analys: ${result.diagnosis}`, sensorId:null,
                  wateringLog:[], growthLog:[{date:"V1",height:10}],
                  harvestLog:[], totalHarvest:0, color:"#4ade80"
                });
                onClose();
              }}>+ Lägg till planta</Btn>
              <Btn variant="ghost" onClick={()=>setPhase("upload")} style={{flexShrink:0}}>Ta om</Btn>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HARVEST LOG MODAL
// ─────────────────────────────────────────────────────────────────────────────
function HarvestModal({ plant, onSave, onClose }) {
  const [form,setForm]=useState({amount:"",unit:"st",weight:"",notes:"",date:todayISO()});
  return (
    <Modal title={`Skörd — ${plant.emoji} ${plant.name}`} onClose={onClose}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Datum</div>
        <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Antal</div>
          <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Enhet</div>
          <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} style={{width:"100%",background:"rgba(30,40,35,1)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}>
            {["st","knippe","kg","g","liter","dl"].map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Vikt (g)</div>
          <input type="number" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} placeholder="0" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Anteckning (valfritt)</div>
        <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="T.ex. 'Stora och söta'" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
      </div>
      <Btn variant="primary" style={{width:"100%"}} onClick={()=>{
        if(!form.amount) return;
        onSave({date:form.date,amount:Number(form.amount),unit:form.unit,weight:Number(form.weight)||0,notes:form.notes});
        onClose();
      }}>💚 Registrera skörd</Btn>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROWTH LOG MODAL
// ─────────────────────────────────────────────────────────────────────────────
function GrowthModal({ plant, onSave, onClose }) {
  const [height,setHeight]=useState("");
  const [health,setHealth]=useState(plant.health||80);
  const [notes,setNotes]=useState("");
  return (
    <Modal title={`Tillväxtlogg — ${plant.emoji} ${plant.name}`} onClose={onClose}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Höjd / storlek (cm)</div>
        <input type="number" value={height} onChange={e=>setHeight(e.target.value)} placeholder="T.ex. 45" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:"#6b7c72",marginBottom:6}}>Hälsopoäng: {health}%</div>
        <input type="range" min="0" max="100" value={health} onChange={e=>setHealth(Number(e.target.value))} style={{width:"100%",accentColor:"#4ade80"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7c72",marginTop:2}}>
          <span>Kritisk</span><span>Bra</span><span>Optimal</span>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>Notering</div>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="T.ex. 'Ny blomma synlig'" style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
      </div>
      <Btn variant="primary" style={{width:"100%"}} onClick={()=>{
        if(!height) return;
        onSave({date:`V${(plant.growthLog?.length||0)+1}`,height:Number(height),health,notes,logged_at:nowStr()});
        onClose();
      }}>📏 Spara mätning</Btn>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth,setAuth]=useState(null); // { token, user, email } | null
  const [demoMode,setDemoMode]=useState(false);
  const [tab,setTab]=useState("dashboard");
  const [plants,setPlants]=useState(DEMO_PLANTS);
  const [selPlant,setSelPlant]=useState(null);
  const [messages,setMessages]=useState([{role:"assistant",text:"Hej! 🌱 Jag är din AI-odlingsassistent. Jag kan hjälpa dig analysera bilder av dina plantor, följa deras tillväxt och ge råd. Vad kan jag hjälpa med?"}]);
  const [chatInput,setChatInput]=useState("");
  const [isTyping,setIsTyping]=useState(false);
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [loading,setLoading]=useState(false);
  const chatEndRef=useRef(null);

  const isLoggedIn = auth || demoMode;

  // Load plants from Supabase on login
  useEffect(()=>{
    if(auth&&SUPABASE_READY) loadPlantsFromDB();
  },[auth]);

  async function loadPlantsFromDB() {
    try {
      setLoading(true);
      const data = await sb.getPlants(auth.token, auth.user.id);
      if(Array.isArray(data)&&data.length>0) setPlants(data.map(p=>({...p,growthLog:p.growth_log||[],harvestLog:p.harvest_log||[],wateringLog:p.watering_log||[],tasks:p.tasks||[]})));
    } catch {} finally { setLoading(false); }
  }

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  function toast_(msg,type="info"){ setToast({msg,type}); setTimeout(()=>setToast(null),3200); }

  async function savePlant(plant) {
    const updated = plants.map(p=>p.id===plant.id?plant:p);
    setPlants(updated);
    if(auth&&SUPABASE_READY){
      try { await sb.upsertPlant(auth.token,{...plant,user_id:auth.user.id,growth_log:plant.growthLog,harvest_log:plant.harvestLog,watering_log:plant.wateringLog}); }
      catch { toast_("Kunde inte spara till molnet","error"); }
    } else {
      try { localStorage.setItem("gh_plants", JSON.stringify(updated)); } catch {}
    }
  }

  async function addPlantFn(newPlant) {
    const plant = { ...newPlant, id: auth ? crypto.randomUUID() : Date.now() };
    const updated = [...plants, plant];
    setPlants(updated);
    if(auth&&SUPABASE_READY){
      try { await sb.upsertPlant(auth.token,{...plant,user_id:auth.user.id,growth_log:plant.growthLog,harvest_log:plant.harvestLog,watering_log:plant.wateringLog}); toast_("🌱 Planta sparad i molnet!","success"); }
      catch { toast_("Planta tillagd lokalt","info"); }
    } else {
      try { localStorage.setItem("gh_plants", JSON.stringify(updated)); } catch {}
      toast_("🌱 Planta tillagd!","success");
    }
  }

  async function deletePlantFn(id) {
    const updated=plants.filter(p=>p.id!==id); setPlants(updated);
    if(auth&&SUPABASE_READY) { try { await sb.deletePlant(auth.token,id); } catch {} }
    else { try { localStorage.setItem("gh_plants", JSON.stringify(updated)); } catch {} }
    setSelPlant(null); toast_("🗑 Planta borttagen","info");
  }

  function addGrowthLog(plantId, log) {
    const plant=plants.find(p=>p.id===plantId);
    if(!plant) return;
    const updated={...plant,growthLog:[...(plant.growthLog||[]),log],health:log.health||plant.health};
    savePlant(updated); toast_("📏 Tillväxt registrerad!","success");
  }

  function addHarvestLog(plantId, log) {
    const plant=plants.find(p=>p.id===plantId);
    if(!plant) return;
    const updated={...plant,harvestLog:[...(plant.harvestLog||[]),log],totalHarvest:(plant.totalHarvest||0)+(log.weight||0)};
    savePlant(updated); toast_("🎉 Skörd registrerad!","success");
  }

  function waterPlant(id) {
    const plant=plants.find(p=>p.id===id); if(!plant) return;
    const updated={...plant,water:Math.min(100,plant.water+30),lastWater:nowStr(),wateringLog:[...(plant.wateringLog||[]),{date:nowStr()}]};
    savePlant(updated); toast_("💧 Vattning registrerad!","success");
  }

  async function sendChat() {
    if(!chatInput.trim()) return;
    const msg={role:"user",text:chatInput};
    const newMsgs=[...messages,msg]; setMessages(newMsgs); setChatInput(""); setIsTyping(true);
    try {
      const ctx=plants.map(p=>`${p.name}(${p.variety||""}): hälsa ${p.health}%, vatten ${p.water||0}%, status ${p.status||"ok"}${p.alert?`, varning:${p.alert}`:""}, total skörd ${p.totalHarvest||0}g`).join("\n");
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`Du är expert AI-odlingsassistent för nordiskt växthus. Svara alltid på svenska. Kort och praktisk.\nVäxter:\n${ctx}`,messages:newMsgs.map(m=>({role:m.role,content:m.text}))})});
      const data=await res.json();
      const reply=data.content?.[0]?.text||"Kunde inte svara.";
      setMessages([...newMsgs,{role:"assistant",text:reply}]);
    } catch { setMessages(m=>[...m,{role:"assistant",text:"Anslutningsfel."}]); }
    setIsTyping(false);
  }

  // ── PLANT DETAIL ────────────────────────────────────────────────────────────
  function PlantDetail({ plantId }) {
    const plant=plants.find(p=>p.id===plantId);
    const [note,setNote]=useState(plant?.notes||"");
    if(!plant) return null;
    const totalHarvestItems=(plant.harvestLog||[]).reduce((s,h)=>s+(h.amount||0),0);

    return (
      <div>
        <button onClick={()=>setSelPlant(null)} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#e8f0eb",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",marginBottom:16}}>← Tillbaka</button>

        {/* Header */}
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:20,marginBottom:14}}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
            <div style={{width:60,height:60,borderRadius:16,background:`${plant.color||"#4ade80"}22`,border:`1px solid ${plant.color||"#4ade80"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{plant.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700}}>{plant.name}</div>
              <div style={{color:"#6b7c72",fontSize:13}}>{plant.variety} · {plant.location}</div>
              <div style={{display:"inline-block",background:`${sColor(plant.status)}22`,border:`1px solid ${sColor(plant.status)}44`,color:sColor(plant.status),borderRadius:20,padding:"2px 10px",fontSize:12,marginTop:4}}>{sLabel(plant.status)}</div>
            </div>
            <Radial value={plant.health} color={sColor(plant.status)} size={52}/>
          </div>

          {/* Quick actions */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            <Btn variant="primary" style={{textAlign:"center",padding:"8px"}} onClick={()=>waterPlant(plant.id)}>💧 Vattna</Btn>
            <Btn style={{textAlign:"center",padding:"8px"}} onClick={()=>setModal({type:"growth",plant})}>📏 Mät</Btn>
            <Btn style={{textAlign:"center",padding:"8px"}} onClick={()=>setModal({type:"harvest",plant})}>🌾 Skörda</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Btn variant="ghost" style={{textAlign:"center",padding:"8px"}} onClick={()=>setModal({type:"camera",plants,onAddPlant:addPlantFn})}>📷 Fotoanalys</Btn>
            <Btn variant="ghost" style={{textAlign:"center",padding:"8px"}} onClick={()=>{setTab("chat");setSelPlant(null);setChatInput(`Hur mår min ${plant.name}?`);}}>💬 Fråga AI</Btn>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[["🌾","Total skörd",`${plant.totalHarvest||0}g`],["📦","Skördar",`${(plant.harvestLog||[]).length} st`],["💧","Vattningar",`${(plant.wateringLog||[]).length} st`]].map(([icon,lbl,val])=>(
            <div key={lbl} style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.12)",borderRadius:14,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:"#4ade80"}}>{val}</div>
              <div style={{fontSize:11,color:"#6b7c72",marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Growth chart */}
        {plant.growthLog&&plant.growthLog.length>0&&(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:600,fontSize:14}}>📈 Tillväxtkurva</div>
              <div style={{fontSize:12,color:"#4ade80"}}>Max: {Math.max(...plant.growthLog.map(g=>g.height))}cm</div>
            </div>
            <GrowthChart data={plant.growthLog} color={plant.color||"#4ade80"}/>
          </div>
        )}

        {/* Harvest log */}
        {plant.harvestLog&&plant.harvestLog.length>0&&(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>🌾 Skördelog</div>
            {plant.harvestLog.slice().reverse().map((h,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"8px 12px",background:"rgba(74,222,128,0.05)",borderRadius:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:500}}>{h.amount} {h.unit}</div>
                  {h.weight>0&&<div style={{fontSize:12,color:"#6b7c72"}}>{h.weight}g {h.notes&&`· ${h.notes}`}</div>}
                </div>
                <div style={{fontSize:12,color:"#6b7c72"}}>{h.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* Watering log */}
        {plant.wateringLog&&plant.wateringLog.length>0&&(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:14,marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>💧 Vattenlogg</div>
            {plant.wateringLog.slice(-5).reverse().map((w,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#aaa",marginBottom:6}}><span>Vattnad</span><span style={{color:"#6b7c72"}}>{w.date}</span></div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14,marginBottom:14}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>📝 Anteckningar</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Egna noteringar…" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:13,outline:"none",resize:"none",minHeight:70,fontFamily:"inherit"}}/>
          <Btn onClick={()=>{const up={...plant,notes:note};savePlant(up);toast_("✅ Sparad!","success");}} style={{marginTop:8}}>Spara anteckning</Btn>
        </div>

        <Btn variant="danger" style={{width:"100%"}} onClick={()=>deletePlantFn(plant.id)}>🗑 Ta bort planta</Btn>
      </div>
    );
  }

  // ── ADD PLANT FORM ──────────────────────────────────────────────────────────
  function AddPlantModal() {
    const emojis=["🍅","🫑","🥒","🌿","🌶️","🫐","🥕","🫛","🌻","🍓","🥬","🧅","🌾","🍆","🫒"];
    const [form,setForm]=useState({name:"",variety:"",emoji:"🌱",location:"Växthus A",planted:todayISO(),health:80,water:60,status:"optimal",harvest:"",nutrients:75,color:"#4ade80"});
    return (
      <Modal title="Lägg till ny planta" onClose={()=>setModal(null)}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {emojis.map(e=>(
            <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{fontSize:20,background:form.emoji===e?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.04)",border:form.emoji===e?"1px solid #4ade80":"1px solid transparent",borderRadius:10,padding:"6px 9px",cursor:"pointer"}}>{e}</button>
          ))}
        </div>
        {[["Växtnamn","name","text"],["Sort / Variant","variety","text"],["Placering","location","text"],["Planteringsdatum","planted","date"],["Förväntad skörd","harvest","text"]].map(([lbl,key,type])=>(
          <div key={key} style={{marginBottom:10}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:4}}>{lbl}</div>
            <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} type={type} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
          </div>
        ))}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#6b7c72",marginBottom:6}}>Startläge</div>
          <div style={{display:"flex",gap:6}}>
            {["optimal","good","warning","critical"].map(s=>(
              <button key={s} onClick={()=>setForm(f=>({...f,status:s}))} style={{flex:1,background:form.status===s?`${sColor(s)}22`:"rgba(255,255,255,0.04)",border:`1px solid ${form.status===s?sColor(s):"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"7px 0",fontSize:11,color:form.status===s?sColor(s):"#6b7c72",cursor:"pointer"}}>{sLabel(s)}</button>
            ))}
          </div>
        </div>
        <Btn variant="primary" style={{width:"100%"}} onClick={()=>{
          if(!form.name)return toast_("Ange växtnamn","error");
          addPlantFn({...form,tasks:[],sensorId:null,wateringLog:[],growthLog:[{date:"V1",height:10}],harvestLog:[],totalHarvest:0,notes:""});
          setModal(null);
        }}>+ Lägg till planta</Btn>
      </Modal>
    );
  }

  if(!isLoggedIn) return (
    <AuthScreen onAuth={(a)=>{ setAuth(a); setDemoMode(false); }} onSkip={()=>{ setDemoMode(true); setPlants(DEMO_PLANTS); }}/>
  );

  const criticals=plants.filter(p=>p.status==="critical"||p.status==="warning");
  const tabs=[{id:"dashboard",icon:"⊞",label:"Hem"},{id:"plants",icon:"🌱",label:"Växter"},{id:"camera",icon:"📷",label:"Kamera"},{id:"diagnose",icon:"🔬",label:"Diagnos"},{id:"chat",icon:"✦",label:"AI"},{id:"schedule",icon:"◷",label:"Schema"}];

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#0a0f0d",minHeight:"100vh",color:"#e8f0eb",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",top:-80,left:"50%",transform:"translateX(-50%)",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,222,128,0.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?"rgba(74,222,128,0.15)":toast.type==="error"?"rgba(248,113,113,0.15)":"rgba(255,255,255,0.1)",border:`1px solid ${toast.type==="success"?"rgba(74,222,128,0.3)":toast.type==="error"?"rgba(248,113,113,0.3)":"rgba(255,255,255,0.15)"}`,borderRadius:20,padding:"10px 20px",fontSize:14,zIndex:2000,color:"#e8f0eb",backdropFilter:"blur(10px)",whiteSpace:"nowrap",maxWidth:"90%"}}>{toast.msg}</div>}

      {modal?.type==="addPlant"&&<AddPlantModal/>}
      {modal?.type==="camera"&&<CameraAnalysis plants={plants} onAddPlant={addPlantFn} onClose={()=>setModal(null)}/>}
      {modal?.type==="harvest"&&<HarvestModal plant={modal.plant} onSave={(log)=>addHarvestLog(modal.plant.id,log)} onClose={()=>setModal(null)}/>}
      {modal?.type==="growth"&&<GrowthModal plant={modal.plant} onSave={(log)=>addGrowthLog(modal.plant.id,log)} onClose={()=>setModal(null)}/>}

      {/* Header */}
      <div style={{padding:"20px 20px 0",position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#4ade80",letterSpacing:2,textTransform:"uppercase",fontWeight:600}}>{new Date().toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"long"})}</div>
            <div style={{fontSize:20,fontWeight:700,letterSpacing:-0.5,marginTop:2}}>
              {{dashboard:"Greenhouse AI",plants:"Mina växter",camera:"Kamera & AI",diagnose:"AI-diagnostik",chat:"Odlingsassistent",schedule:"Odlingsschema"}[tab]}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {demoMode&&<div style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#fbbf24"}}>DEMO</div>}
            {auth&&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#4ade80"}}>☁️ Inloggad</div>}
            {criticals.length>0&&<div style={{background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:20,padding:"4px 10px",fontSize:12,color:"#f87171",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:"#f87171",display:"inline-block"}}/>{criticals.length}</div>}
            {auth&&<button onClick={async()=>{if(SUPABASE_READY)await sb.signOut(auth.token);setAuth(null);setDemoMode(false);}} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#6b7c72",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:14}}>⏏</button>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 110px",position:"relative",zIndex:1}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
              {[{l:"Växter",v:plants.length,i:"🌱",c:"#4ade80"},{l:"Optimala",v:plants.filter(p=>p.status==="optimal").length,i:"✓",c:"#4ade80"},{l:"Varningar",v:criticals.length,i:"⚠",c:"#fbbf24"}].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"14px 12px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{s.i}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#6b7c72"}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Total harvest summary */}
            <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.12)",borderRadius:16,padding:16,marginBottom:18}}>
              <div style={{fontSize:12,color:"#4ade80",fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Säsongens skörd</div>
              <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4}}>
                {plants.filter(p=>(p.totalHarvest||0)>0||(p.harvestLog||[]).length>0).map(p=>(
                  <div key={p.id} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"10px 14px",minWidth:90,flexShrink:0,textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{p.emoji}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>{p.totalHarvest||0}g</div>
                    <div style={{fontSize:11,color:"#6b7c72"}}>{(p.harvestLog||[]).length} skördar</div>
                  </div>
                ))}
                {plants.filter(p=>(p.totalHarvest||0)>0).length===0&&(
                  <div style={{fontSize:13,color:"#6b7c72",padding:"8px 0"}}>Inga skördar registrerade än. Tryck 🌾 på en planta för att logga.</div>
                )}
              </div>
            </div>

            {criticals.map(p=>(
              <div key={p.id} style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,cursor:"pointer"}} onClick={()=>{setSelPlant(p.id);setTab("plants");}}>{p.emoji}</span>
                <div style={{flex:1,cursor:"pointer"}} onClick={()=>{setSelPlant(p.id);setTab("plants");}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.name} — {p.alert||"Behöver uppmärksamhet"}</div>
                  <div style={{fontSize:12,color:"#f87171",marginTop:2}}>{(p.tasks||[])[0]}</div>
                </div>
                <Btn onClick={e=>{e.stopPropagation();waterPlant(p.id);}} style={{padding:"6px 12px",fontSize:12}}>💧</Btn>
              </div>
            ))}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:12,color:"#4ade80",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>Alla plantor</div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setModal({type:"camera",plants,onAddPlant:addPlantFn})} style={{padding:"6px 12px",fontSize:12}}>📷 Fota</Btn>
                <Btn variant="primary" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setModal({type:"addPlant"})}>+ Ny</Btn>
              </div>
            </div>

            {plants.map(p=>(
              <div key={p.id} onClick={()=>{setSelPlant(p.id);setTab("plants");}} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderLeft:`3px solid ${sColor(p.status)}`,borderRadius:16,padding:16,marginBottom:12,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{p.emoji}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:16}}>{p.name}</div>
                      <div style={{fontSize:12,color:"#6b7c72"}}>{p.variety} · {p.location}</div>
                    </div>
                  </div>
                  <Radial value={p.health} color={sColor(p.status)}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {(p.growthLog||[]).length>0&&<div style={{fontSize:12,color:"#4ade80"}}>📏 {p.growthLog[p.growthLog.length-1].height}cm</div>}
                  {(p.totalHarvest||0)>0&&<div style={{fontSize:12,color:"#fbbf24"}}>🌾 {p.totalHarvest}g</div>}
                  {(p.wateringLog||[]).length>0&&<div style={{fontSize:12,color:"#60a5fa"}}>💧 {(p.wateringLog||[]).length}x</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PLANTS ── */}
        {tab==="plants"&&(
          selPlant
            ? <PlantDetail plantId={selPlant}/>
            : (
              <div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:14}}>
                  <Btn onClick={()=>setModal({type:"camera",plants,onAddPlant:addPlantFn})} style={{padding:"8px 14px",fontSize:13}}>📷 Fotoanalys</Btn>
                  <Btn variant="primary" onClick={()=>setModal({type:"addPlant"})}>+ Ny planta</Btn>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {plants.map(p=>(
                    <div key={p.id} onClick={()=>setSelPlant(p.id)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:16,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:0,right:0,width:60,height:60,borderRadius:"0 18px 0 60px",background:`${sColor(p.status)}11`}}/>
                      <div style={{fontSize:28,marginBottom:6}}>{p.emoji}</div>
                      <div style={{fontWeight:700,fontSize:15}}>{p.name}</div>
                      <div style={{fontSize:12,color:"#6b7c72",marginBottom:8}}>{p.variety}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:20,fontWeight:700,color:sColor(p.status)}}>{p.health}%</div>
                        <div style={{width:8,height:8,borderRadius:"50%",background:sColor(p.status)}}/>
                      </div>
                      {(p.totalHarvest||0)>0&&<div style={{fontSize:11,color:"#fbbf24",marginTop:4}}>🌾 {p.totalHarvest}g skördat</div>}
                      {p.alert&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ {p.alert}</div>}
                    </div>
                  ))}
                  <div onClick={()=>setModal({type:"addPlant"})} style={{background:"rgba(74,222,128,0.04)",border:"1px dashed rgba(74,222,128,0.2)",borderRadius:18,padding:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:140}}>
                    <div style={{fontSize:28,color:"#4ade80"}}>+</div>
                    <div style={{fontSize:13,color:"#4ade80"}}>Ny planta</div>
                  </div>
                </div>
              </div>
            )
        )}

        {/* ── CAMERA TAB ── */}
        {tab==="camera"&&(
          <div>
            <div style={{background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:20,padding:20,marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:12}}>📷</div>
              <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>AI-kameraanalys</div>
              <div style={{fontSize:14,color:"#6b7c72",lineHeight:1.6,marginBottom:20}}>Fota en växt — Claude Vision identifierar automatiskt vilken växt det är, analyserar hälsan och ger rekommendationer.</div>
              <Btn variant="primary" style={{width:"100%",padding:"14px",fontSize:15}} onClick={()=>setModal({type:"camera",plants,onAddPlant:addPlantFn})}>
                📷 Öppna kamera
              </Btn>
            </div>

            <div style={{fontSize:12,color:"#4ade80",fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>AI kan identifiera & analysera</div>
            {[["🔍 Växtidentifiering","Identifierar automatiskt art och sort från foto"],["🦠 Sjukdomar & skadedjur","Bladlöss, spinnkvalster, mjöldagg, botritis"],["🌿 Näringsbrist","Klorosis, järnbrist, kvävebrist"],["💧 Vattenstress","Under- och övervattning"],["☀️ Miljöstress","Solskador, frostskador, vindskador"],["🌱 Tillväxtstadium","Bedömer plantans ålder och stadium"]].map(([title,desc])=>(
              <div key={title} style={{display:"flex",gap:12,marginBottom:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{title}</div>
                  <div style={{fontSize:12,color:"#6b7c72",marginTop:2}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DIAGNOSE ── */}
        {tab==="diagnose"&&(
          <DiagnoseTab onOpenCamera={()=>setModal({type:"camera",plants,onAddPlant:addPlantFn})} onOpenChat={(q)=>{setTab("chat");setChatInput(q);}}/>
        )}

        {/* ── CHAT ── */}
        {tab==="chat"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)"}}>
            <div style={{flex:1,overflowY:"auto",paddingBottom:16}}>
              {messages.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
                  {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a22,#2d5a35)",border:"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginRight:8,flexShrink:0,marginTop:4}}>🌿</div>}
                  <div style={{maxWidth:"75%",background:m.role==="user"?"#4ade80":"rgba(255,255,255,0.06)",color:m.role==="user"?"#0a0f0d":"#e8f0eb",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"12px 14px",fontSize:14,lineHeight:1.5,border:m.role==="assistant"?"1px solid rgba(255,255,255,0.08)":"none"}}>{m.text}</div>
                </div>
              ))}
              {isTyping&&<div style={{display:"flex",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a22,#2d5a35)",border:"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🌿</div><div style={{background:"rgba(255,255,255,0.06)",borderRadius:"18px 18px 18px 4px",padding:"12px 16px",border:"1px solid rgba(255,255,255,0.08)"}}><div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",opacity:0.6,animation:`bounce 1.4s ${i*0.2}s infinite`}}/>)}</div></div></div>}
              <div ref={chatEndRef}/>
            </div>
            <div style={{paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                {["Analysera alla plantor","När ska jag skörda?","Tips mot bladlöss","Gödsling den här veckan"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#aaa",cursor:"pointer"}}>{q}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Fråga om dina växter…" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"12px 14px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
                <Btn variant="primary" onClick={sendChat} style={{width:46,padding:0,fontSize:18,textAlign:"center"}}>↑</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab==="schedule"&&(
          <ScheduleTab plants={plants} waterPlant={waterPlant}/>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(10,15,13,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.07)",padding:"8px 4px 16px",display:"flex",justifyContent:"space-around",zIndex:100}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=="plants")setSelPlant(null);}} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"6px 6px",borderRadius:12,position:"relative",flex:1}}>
            <div style={{fontSize:16,filter:tab===t.id?"none":"grayscale(1) opacity(0.4)",transition:"filter 0.2s"}}>{t.icon}</div>
            <div style={{fontSize:9,color:tab===t.id?"#4ade80":"#6b7c72",fontWeight:tab===t.id?700:400}}>{t.label}</div>
            {tab===t.id&&<div style={{position:"absolute",bottom:0,width:4,height:4,borderRadius:"50%",background:"#4ade80"}}/>}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:0;}
        input::placeholder,textarea::placeholder{color:#4a5c52;}
        textarea,select{font-family:inherit;}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSE TAB
// ─────────────────────────────────────────────────────────────────────────────
function DiagnoseTab({ onOpenCamera, onOpenChat }) {
  const DIAG_MAP={"gula blad":{title:"Näringsbrist eller övervattning",confidence:78,severity:"medium",causes:["Kvävebrist (N)","Övervattning","Naturligt åldrande"],actions:["Minska bevattning","Tillsätt kväverik gödning","Ta bort gula blad"],icon:"🟡"},"vita prickar":{title:"Spinnkvalster eller mjöldagg",confidence:85,severity:"high",causes:["Spinnkvalster","Mjöldagg","Låg luftfuktighet"],actions:["Behandla med neem-olja","Öka luftfuktigheten","Isolera plantan"],icon:"⚠️"},"vissnar":{title:"Vattenstress",confidence:82,severity:"high",causes:["Undervattning","Rotröta","Extremvärme"],actions:["Vattna omedelbart","Kontrollera dränering","Placera i skugga"],icon:"💧"},"bladlöss":{title:"Bladlusangrepp",confidence:91,severity:"high",causes:["Bladlöss","Myror","Svag planta"],actions:["Tvätta med vatten","Neem-olja","Nyttoinsekter"],icon:"🐛"},"röta":{title:"Svampsjukdom",confidence:74,severity:"high",causes:["Hög luftfuktighet","Skadad växtvävnad","Dålig ventilation"],actions:["Ta bort angripna delar","Svampmedel","Förbättra luftning"],icon:"🍂"}};
  const [input,setInput]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);

  async function run() {
    if(!input.trim()) return;
    setLoading(true); setResult(null);
    await new Promise(r=>setTimeout(r,1400));
    const key=Object.keys(DIAG_MAP).find(k=>input.toLowerCase().includes(k));
    setResult(DIAG_MAP[key]||{title:"Stress — trolig vattenbrist",confidence:71,severity:"low",causes:["Undervattning","Hög temperatur","För mycket sol"],actions:["Kontrollera jordfukt","Vattna grundligt","Skugga tillfälligt"],icon:"💧"});
    setLoading(false);
  }

  return (
    <div>
      <Btn variant="primary" style={{width:"100%",padding:"14px",fontSize:15,marginBottom:16}} onClick={onOpenCamera}>
        📷 Fota växt för AI-analys
      </Btn>
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:18,marginBottom:16}}>
        <div style={{fontSize:14,color:"#6b7c72",marginBottom:12}}>Eller beskriv symptom med text:</div>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder="T.ex. 'gula blad'" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"12px 14px",color:"#e8f0eb",fontSize:14,outline:"none"}}/>
          <Btn variant="primary" onClick={run} style={{padding:"0 18px",fontSize:18}}>→</Btn>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
          {["Gula blad","Vita prickar","Vissnar","Röta","Bladlöss"].map(s=>(
            <button key={s} onClick={()=>setInput(s.toLowerCase())} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"5px 12px",fontSize:12,color:"#aaa",cursor:"pointer"}}>{s}</button>
          ))}
        </div>
      </div>
      {loading&&<div style={{textAlign:"center",padding:24}}><div style={{fontSize:28,marginBottom:8}}>🔬</div><div style={{color:"#4ade80"}}>Analyserar…</div></div>}
      {result&&!loading&&(
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:20}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:14}}>
            <div style={{fontSize:28}}>{result.icon}</div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{result.title}</div>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                <div style={{background:"rgba(74,222,128,0.1)",borderRadius:20,padding:"2px 10px",fontSize:12,color:"#4ade80"}}>Säkerhet: {result.confidence}%</div>
                <div style={{background:result.severity==="high"?"rgba(248,113,113,0.1)":result.severity==="medium"?"rgba(251,191,36,0.1)":"rgba(74,222,128,0.1)",borderRadius:20,padding:"2px 10px",fontSize:12,color:result.severity==="high"?"#f87171":result.severity==="medium"?"#fbbf24":"#4ade80"}}>{result.severity==="high"?"Hög":result.severity==="medium"?"Medel":"Låg"}</div>
              </div>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Möjliga orsaker</div>
            {result.causes.map(c=><div key={c} style={{display:"flex",gap:8,marginBottom:5,fontSize:13}}><span style={{color:"#fbbf24"}}>·</span>{c}</div>)}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#6b7c72",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Åtgärder</div>
            {result.actions.map((a,i)=><div key={a} style={{display:"flex",gap:10,marginBottom:6,fontSize:13,background:"rgba(74,222,128,0.05)",borderRadius:10,padding:"8px 12px"}}><span style={{color:"#4ade80",fontWeight:700}}>{i+1}.</span>{a}</div>)}
          </div>
          <Btn variant="primary" style={{width:"100%"}} onClick={()=>onOpenChat(`Hjälp mig med: ${result.title}`)}>Fråga AI-assistenten →</Btn>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE TAB
// ─────────────────────────────────────────────────────────────────────────────
function ScheduleTab({ plants, waterPlant }) {
  const [done,setDone]=useState({});
  const dayTasks=[
    [{plant:"Basilika",emoji:"🌿",task:"Vattna omedelbart",priority:"critical",pid:4},{plant:"Paprika",emoji:"🫑",task:"Vattna",priority:"high",pid:2},{plant:"Tomat",emoji:"🍅",task:"Tjuva sidoskott",priority:"medium",pid:1},{plant:"Gurka",emoji:"🥒",task:"Binda rankor",priority:"low",pid:3}],
    [{plant:"Tomat",emoji:"🍅",task:"Kontrollera blomklasar",priority:"medium",pid:1},{plant:"Paprika",emoji:"🫑",task:"Kontrollera bladlöss",priority:"medium",pid:2}],
    [{plant:"Tomat",emoji:"🍅",task:"Gödsla Kalimagnesia",priority:"medium",pid:1},{plant:"Gurka",emoji:"🥒",task:"Vattna",priority:"high",pid:3}],
  ];
  const pc={critical:"#f87171",high:"#fbbf24",medium:"#4ade80",low:"#6b7c72"};

  function exportJSON() {
    const data=JSON.stringify({plants,exportedAt:new Date().toISOString()},null,2);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`greenhouse-${todayISO()}.json`; a.click();
  }
  function exportCSV() {
    const rows=["Planta,Sort,Status,Hälsa,Vatten,Total skörd,Senaste mätning",...plants.map(p=>`${p.name},${p.variety||""},${p.status},${p.health}%,${p.water||0}%,${p.totalHarvest||0}g,${p.growthLog?.slice(-1)[0]?.height||"-"}cm`)].join("\n");
    const blob=new Blob([rows],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`greenhouse-plants-${todayISO()}.csv`; a.click();
  }

  return (
    <div>
      {["Idag","Imorgon","Övermorgon"].map((day,di)=>(
        <div key={day} style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:di===0?"#4ade80":"#6b7c72",marginBottom:10,textTransform:"uppercase",letterSpacing:1.5}}>{day}</div>
          {dayTasks[di].map((t,i)=>{
            const key=`s-${di}-${i}`,isDone=done[key];
            return (
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderLeft:`3px solid ${pc[t.priority]}`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:isDone?0.5:1}}>
                <span style={{fontSize:20}}>{t.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:500,textDecoration:isDone?"line-through":"none"}}>{t.task}</div>
                  <div style={{fontSize:12,color:"#6b7c72",marginTop:2}}>{t.plant}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {t.task.toLowerCase().includes("vattna")&&!isDone&&(
                    <Btn style={{padding:"4px 10px",fontSize:11}} onClick={()=>{const p=plants.find(x=>x.id===t.pid);if(p)waterPlant(p.id);const u={...done,[key]:true};setDone(u);}}>💧</Btn>
                  )}
                  <button onClick={()=>setDone(d=>({...d,[key]:!d[key]}))} style={{width:24,height:24,borderRadius:7,border:`1.5px solid ${isDone?"#4ade80":pc[t.priority]}`,background:isDone?"rgba(74,222,128,0.2)":"transparent",cursor:"pointer",fontSize:13,color:"#4ade80",display:"flex",alignItems:"center",justifyContent:"center"}}>{isDone?"✓":""}</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14,marginTop:8}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>💾 Exportera data</div>
        <div style={{display:"flex",gap:8}}>
          <Btn style={{flex:1,textAlign:"center",fontSize:12,padding:"10px"}} onClick={exportJSON}>📥 JSON-backup</Btn>
          <Btn style={{flex:1,textAlign:"center",fontSize:12,padding:"10px"}} onClick={exportCSV}>📊 CSV (Excel)</Btn>
        </div>
        <div style={{fontSize:12,color:"#6b7c72",marginTop:10,lineHeight:1.5}}>JSON innehåller all data inklusive skördelogg och tillväxtkurvor. CSV öppnas direkt i Excel/Numbers.</div>
      </div>
    </div>
  );
}

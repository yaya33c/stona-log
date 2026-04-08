import { useState, useEffect, useCallback } from "react";

const SK = "stona-log-v4";
const TARGET = 3_000_000;

const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);
const yen     = n => `${Math.round(n).toLocaleString()}`;

function weekRange() {
  const now=new Date(), day=now.getDay();
  const mon=new Date(now); mon.setDate(now.getDate()-(day===0?6:day-1)); mon.setHours(0,0,0,0);
  const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
  return [mon,sun];
}
function inWeek(d) { const [m,s]=weekRange(); const t=new Date(d); return t>=m&&t<=s; }
function calcStreak(sessions) {
  const days=[...new Set(sessions.map(s=>isoDay(s.date)))].sort().reverse();
  if(!days.length) return 0;
  let streak=0, cur=new Date(); cur.setHours(0,0,0,0);
  for(const day of days){const d=new Date(day),diff=Math.round((cur-d)/86400000);if(diff>1)break;streak++;cur=d;}
  return streak;
}

const INITIAL={posts:[],sessions:[],books:[],places:[],goal:{examDate:"",targetHours:400},jobs:[],workers:[],workRecords:[]};

const Inp=({value,onChange,placeholder,type="text",style={}})=>(
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",...style}}/>
);
const Card=({children,style={}})=>(
  <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"16px",...style}}>{children}</div>
);
const Btn=({onClick,children,variant="primary",style={}})=>(
  <button onClick={onClick} style={{padding:"10px 16px",borderRadius:9,fontSize:13,cursor:"pointer",fontFamily:"inherit",
    background:variant==="primary"?"#2E2B27":variant==="ghost"?"transparent":"#F4F2EE",
    color:variant==="primary"?"#F7F6F3":variant==="ghost"?"#BDB9B1":"#6E6A63",
    border:variant==="ghost"?"1px solid #E8E4DC":"none",...style}}>{children}</button>
);
const Label=({children})=>(<div style={{fontSize:11,color:"#C0BAB0",letterSpacing:"0.1em",marginBottom:8}}>{children}</div>);

function SimpleLineChart({data}) {
  if(!data||data.length===0) return null;
  const W=320, H=120, PL=8, PR=8, PT=8, PB=24;
  const vals=[...data.map(d=>d.billing),...data.map(d=>d.profit)];
  const maxV=Math.max(...vals,1);
  const minV=Math.min(...vals,0);
  const range=maxV-minV||1;
  const xStep=(W-PL-PR)/(data.length-1||1);
  const yScale=v=>PT+(H-PT-PB)*(1-(v-minV)/range);
  const pts=(arr)=>arr.map((d,i)=>[PL+i*xStep, yScale(d)]);
  const toPath=points=>points.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const billingPts=pts(data.map(d=>d.billing));
  const profitPts=pts(data.map(d=>d.profit));
  return(
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:H}}>
      {[0,0.5,1].map((t,i)=>{
        const y=PT+(H-PT-PB)*t;
        const v=maxV-(maxV-minV)*t;
        return(<g key={i}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#F0EDE7" strokeWidth="1"/><text x={PL} y={y-3} fontSize="8" fill="#C8C3BA">{v>=10000?(v/10000).toFixed(0)+"万":"0"}</text></g>);
      })}
      <path d={toPath(billingPts)} fill="none" stroke="#8A99B0" strokeWidth="2" strokeLinejoin="round"/>
      <path d={toPath(profitPts)} fill="none" stroke="#7CA37A" strokeWidth="2" strokeLinejoin="round"/>
      {billingPts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#8A99B0"/>))}
      {profitPts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#7CA37A"/>))}
      {data.map((d,i)=>(<text key={i} x={PL+i*xStep} y={H-6} textAnchor="middle" fontSize="9" fill="#C8C3BA">{d.label}</text>))}
    </svg>
  );
}

function StudyCalendar({sessions}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // 曜日を月曜始まりに
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // 日ごとの学習分数マップ
  const dayMap = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    if(d.getFullYear()===year && d.getMonth()===month) {
      const key = d.getDate();
      dayMap[key] = (dayMap[key]||0) + s.minutes;
    }
  });

  const maxMin = Math.max(...Object.values(dayMap), 1);
  const getColor = (min) => {
    if(!min) return "#F0EDE7";
    const ratio = min/maxMin;
    if(ratio > 0.75) return "#4A8A62";
    if(ratio > 0.5)  return "#6AAE7C";
    if(ratio > 0.25) return "#8DC99A";
    return "#B8E0C0";
  };

  const totalH = sessions.reduce((s,ss)=>s+ss.minutes,0)/60;
  const studiedDays = new Set(sessions.map(s=>{const d=new Date(s.date);return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();})).size;

  const weeks = ["月","火","水","木","金","土","日"];
  const cells = [];
  for(let i=0;i<startOffset;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  const todayDate = now.getDate();

  return(
    <div>
      <div style={{display:"flex",gap:16,marginBottom:14}}>
        <div style={{flex:1,textAlign:"center",background:"rgba(74,138,98,0.08)",borderRadius:10,padding:"10px 6px"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#4A8A62"}}>{studiedDays}<span style={{fontSize:12,fontWeight:400,color:"#C0BAB0"}}>日</span></div>
          <div style={{fontSize:11,color:"#C0BAB0"}}>今月の記録</div>
        </div>
        <div style={{flex:1,textAlign:"center",background:"rgba(138,153,176,0.08)",borderRadius:10,padding:"10px 6px"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#8A99B0"}}>{totalH.toFixed(1)}<span style={{fontSize:12,fontWeight:400,color:"#C0BAB0"}}>h</span></div>
          <div style={{fontSize:11,color:"#C0BAB0"}}>今月の学習</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {weeks.map(w=>(<div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0",paddingBottom:2}}>{w}</div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={"e"+i}/>;
          const min = dayMap[d]||0;
          const isToday = d===todayDate;
          return(
            <div key={d} title={min?d+"日 "+Math.floor(min/60)+"h"+( min%60?""+min%60+"m":""):""}
              style={{aspectRatio:"1",borderRadius:4,background:getColor(min),display:"flex",alignItems:"center",justifyContent:"center",
                outline:isToday?"2px solid #2E2B27":"none",outlineOffset:1,position:"relative"}}>
              <span style={{fontSize:8,color:min?"#2E5A3A":"#C0BAB0",fontWeight:min?600:400}}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,justifyContent:"flex-end"}}>
        <span style={{fontSize:9,color:"#C0BAB0"}}>少</span>
        {["#F0EDE7","#B8E0C0","#8DC99A","#6AAE7C","#4A8A62"].map((c,i)=>(<div key={i} style={{width:10,height:10,borderRadius:2,background:c}}/>))}
        <span style={{fontSize:9,color:"#C0BAB0"}}>多</span>
      </div>
    </div>
  );
}

export default function App() {
  const [data,setData]=useState(INITIAL);
  const [tab,setTab]=useState("log");
  const [mode,setMode]=useState("hobby");
  const [text,setText]=useState("");
  const [place,setPlace]=useState("");
  const [sMin,setSMin]=useState("");
  const [sNote,setSNote]=useState("");
  const [bookQuery,setBookQuery]=useState("");
  const [bookResults,setBookResults]=useState([]);
  const [bookLoading,setBookLoading]=useState(false);
  const [selBook,setSelBook]=useState(null);
  const [bookMemo,setBookMemo]=useState("");
  const [placeName,setPlaceName]=useState("");
  const [placeResults,setPlaceResults]=useState([]);
  const [placeLoading,setPlaceLoading]=useState(false);
  const [selPlace,setSelPlace]=useState(null);
  const [placeMemo,setPlaceMemo]=useState("");
  const [editG,setEditG]=useState(false);
  const [gDate,setGDate]=useState("");
  const [gH,setGH]=useState(400);
  const [aiResult,setAiResult]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [apiKey,setApiKey]=useState("");
  const [apiKeyInput,setApiKeyInput]=useState("");
  const [placeFilter,setPlaceFilter]=useState("all");
  const [costSubTab,setCostSubTab]=useState("records");
  const [costMonth,setCostMonth]=useState(mKey(new Date()));
  const [showJobForm,setShowJobForm]=useState(false);
  const [editJob,setEditJob]=useState(null);
  const [jName,setJName]=useState("");
  const [jClient,setJClient]=useState("");
  const [jBilling,setJBilling]=useState("");
  const [showWorkerForm,setShowWorkerForm]=useState(false);
  const [editWorker,setEditWorker]=useState(null);
  const [wName,setWName]=useState("");
  const [wRate,setWRate]=useState("");
  const [showRecordForm,setShowRecordForm]=useState(false);
  const [editRecord,setEditRecord]=useState(null);
  const [rJobId,setRJobId]=useState("");
  const [rWorkerId,setRWorkerId]=useState("");
  const [rDate,setRDate]=useState(isoDay(new Date()));
  const [rDays,setRDays]=useState("1");
  const [rRate,setRRate]=useState("");
  const [rCost,setRCost]=useState("0");
  const [rExpense,setRExpense]=useState("0");
  const [rNote,setRNote]=useState("");

  useEffect(()=>{
    try{const raw=localStorage.getItem(SK);if(raw)setData(JSON.parse(raw));}catch{}
    try{const k=localStorage.getItem("stona-api-key");if(k)setApiKey(k);}catch{}
  },[]);

  const save=useCallback((next)=>{
    setData(next);
    try{localStorage.setItem(SK,JSON.stringify(next));}catch{}
  },[]);

  const saveApiKey=()=>{
    setApiKey(apiKeyInput);
    try{localStorage.setItem("stona-api-key",apiKeyInput);}catch{}
    setShowSettings(false);
  };

  const mk=mKey(new Date());
  const totalH=data.sessions.reduce((s,ss)=>s+ss.minutes,0)/60;
  const {examDate,targetHours}=data.goal;
  const dl=examDate?Math.ceil((new Date(examDate)-new Date())/86400000):null;
  const wkNeed=dl>0?(Math.max(0,targetHours-totalH)/(dl/7)).toFixed(1):null;
  const sPct=Math.min(100,(totalH/targetHours)*100);
  const streak=calcStreak(data.sessions);
  const [wMon,wSun]=weekRange();
  const wkStudyH=data.sessions.filter(s=>inWeek(s.date)).reduce((s,ss)=>s+ss.minutes,0)/60;
  const wkRecords=[...data.posts,...data.books,...data.places].filter(x=>inWeek(x.date)).length;

  const monthRecords=data.workRecords.filter(r=>mKey(r.date)===mk);
  const monthLabor=monthRecords.reduce((s,r)=>s+r.days*r.rate,0);
  const monthCost=monthRecords.reduce((s,r)=>s+(r.cost||0),0);
  const monthExpense=monthRecords.reduce((s,r)=>s+(r.expense||0),0);
  const monthBilling=data.jobs.filter(j=>mKey(j.createdAt)===mk).reduce((s,j)=>s+(j.billing||0),0);
  const monthProfit=monthBilling-monthLabor-monthCost-monthExpense;
  const profitPct=Math.min(100,Math.max(0,(monthProfit/TARGET)*100));

  // 月次推移データ（直近6ヶ月）
  const chartData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const mk2=mKey(d);
      const label=(d.getMonth()+1)+"月";
      const recs=data.workRecords.filter(r=>mKey(r.date)===mk2);
      const billing=data.jobs.filter(j=>mKey(j.createdAt)===mk2).reduce((s,j)=>s+(j.billing||0),0);
      const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
      const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
      const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
      const profit=billing-labor-cost-expense;
      months.push({label,billing,profit});
    }
    return months;
  })();

  const months=["all",...new Set(data.workRecords.map(r=>mKey(r.date)).concat(data.jobs.map(j=>mKey(j.createdAt))))].filter((v,i,a)=>a.indexOf(v)===i).sort().reverse();
  const filteredRecords=costMonth==="all"?data.workRecords:data.workRecords.filter(r=>mKey(r.date)===costMonth);

  const timeline=[
    ...data.posts.map(p=>({...p,_t:"post"})),
    ...data.sessions.map(s=>({...s,_t:"sess"})),
    ...data.books.map(b=>({...b,_t:"book"})),
    ...data.places.map(p=>({...p,_t:"place"})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const postLog=()=>{
    if(mode==="hobby"){if(!text.trim())return;save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:"hobby",place:place.trim(),text:text.trim()},...data.posts]});setText("");setPlace("");}
    else if(mode==="work"){if(!text.trim())return;save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:"work",text:text.trim()},...data.posts]});setText("");}
    else if(mode==="study"){if(!sMin)return;save({...data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes:parseInt(sMin,10),note:sNote.trim()},...data.sessions]});setSMin("");setSNote("");}
  };

  const searchBooks=async(retry=0)=>{
    if(!bookQuery.trim())return;
    setBookLoading(true);setBookResults([]);
    try{
      const res=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(bookQuery)}&maxResults=15&orderBy=relevance`);
      if(!res.ok)throw new Error("HTTP "+res.status);
      const json=await res.json();
      const books=(json.items||[]).map(i=>({id:"gb-"+i.id,title:i.volumeInfo.title||"",authors:(i.volumeInfo.authors||[]).join(", "),thumbnail:(i.volumeInfo.imageLinks?.thumbnail||i.volumeInfo.imageLinks?.smallThumbnail||"").replace("http:","https:"),isbn:(i.volumeInfo.industryIdentifiers||[]).find(x=>x.type==="ISBN_13")?.identifier||""}));
      if(books.length===0&&retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}
      const enriched=await Promise.all(books.map(async b=>{if(b.thumbnail||!b.isbn)return b;try{const r=await fetch(`https://api.openbd.jp/v1/get?isbn=${b.isbn}`);const j=await r.json();return{...b,thumbnail:j?.[0]?.summary?.cover||""};}catch{return b;}}));
      setBookResults(enriched.filter(b=>b.title).slice(0,12));
      if(enriched.length===0)alert("見つかりませんでした。");
    }catch(e){if(retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}alert("検索エラー: "+e.message);}
    setBookLoading(false);
  };
  const addBook=()=>{if(!selBook)return;save({...data,books:[{id:Date.now(),date:new Date().toISOString(),...selBook,memo:bookMemo.trim()},...data.books]});setSelBook(null);setBookQuery("");setBookResults([]);setBookMemo("");};

  const searchPlace=async()=>{
    if(!placeName.trim())return;
    setPlaceLoading(true);setPlaceResults([]);
    const fp=async()=>{try{const res=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&lang=ja&limit=8`);const json=await res.json();return(json.features||[]).map(f=>{const p=f.properties;const parts=[p.name,p.city||p.town||p.village,p.county,p.state].filter(Boolean);const area=[p.state||p.county,p.city||p.town||p.village].filter(Boolean).join(" ");return{name:p.name||parts[0]||"",fullName:parts.join(", "),area,lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]};}).filter(r=>r.name);}catch{return[];}};
    const fn=async()=>{try{const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=5&accept-language=ja&addressdetails=1`);const json=await res.json();return json.map(p=>{const a=p.address||{};const area=[a.state||a.prefecture,a.city||a.town||a.village||a.suburb].filter(Boolean).join(" ");return{name:p.display_name.split(",")[0],fullName:p.display_name,area,lat:parseFloat(p.lat),lon:parseFloat(p.lon)};});}catch{return[];}};
    const [ph,no]=await Promise.all([fp(),fn()]);
    const seen=new Set();
    const merged=[...ph,...no].filter(r=>{const key=r.name.trim().toLowerCase();if(seen.has(key)||!r.name)return false;seen.add(key);return true;});
    setPlaceResults(merged.slice(0,10));
    if(merged.length===0)alert("見つかりませんでした。");
    setPlaceLoading(false);
  };
  const addPlace=()=>{if(!selPlace)return;save({...data,places:[{id:Date.now(),date:new Date().toISOString(),...selPlace,memo:placeMemo.trim()},...data.places]});setSelPlace(null);setPlaceName("");setPlaceResults([]);setPlaceMemo("");};

  const getJob=id=>data.jobs.find(j=>j.id===id)||{name:"不明",client:""};
  const getWorker=id=>data.workers.find(w=>w.id===id)||{name:"不明",rate:0};

  const saveJob=()=>{
    if(!jName.trim())return;
    const j={id:editJob?.id||Date.now(),createdAt:editJob?.createdAt||new Date().toISOString(),name:jName.trim(),client:jClient.trim(),billing:parseInt(jBilling)||0};
    save({...data,jobs:editJob?data.jobs.map(x=>x.id===editJob.id?j:x):[j,...data.jobs]});
    setJName("");setJClient("");setJBilling("");setShowJobForm(false);setEditJob(null);
  };
  const delJob=id=>save({...data,jobs:data.jobs.filter(j=>j.id!==id),workRecords:data.workRecords.filter(r=>r.jobId!==id)});

  const saveWorker=()=>{
    if(!wName.trim())return;
    const w={id:editWorker?.id||Date.now(),name:wName.trim(),rate:parseInt(wRate)||0};
    save({...data,workers:editWorker?data.workers.map(x=>x.id===editWorker.id?w:x):[w,...data.workers]});
    setWName("");setWRate("");setShowWorkerForm(false);setEditWorker(null);
  };
  const delWorker=id=>save({...data,workers:data.workers.filter(w=>w.id!==id)});

  const saveRecord=()=>{
    if(!rJobId||!rWorkerId||!rDays)return;
    const worker=data.workers.find(w=>w.id===parseInt(rWorkerId));
    const rate=parseInt(rRate)||(worker?.rate||0);
    const r={id:editRecord?.id||Date.now(),date:rDate,jobId:parseInt(rJobId),workerId:parseInt(rWorkerId),days:parseFloat(rDays),rate,cost:parseInt(rCost)||0,expense:parseInt(rExpense)||0,note:rNote.trim()};
    save({...data,workRecords:editRecord?data.workRecords.map(x=>x.id===editRecord.id?r:x):[r,...data.workRecords]});
    setRDays("1");setRRate("");setRCost("0");setRExpense("0");setRNote("");setShowRecordForm(false);setEditRecord(null);
  };
  const delRecord=id=>save({...data,workRecords:data.workRecords.filter(r=>r.id!==id)});
  const startEditRecord=r=>{setEditRecord(r);setRJobId(String(r.jobId));setRWorkerId(String(r.workerId));setRDate(r.date);setRDays(String(r.days));setRRate(String(r.rate));setRCost(String(r.cost||0));setRExpense(String(r.expense||0));setRNote(r.note||"");setShowRecordForm(true);};

  const saveGoal=()=>{save({...data,goal:{examDate:gDate,targetHours:parseInt(gH,10)||400}});setEditG(false);};
  const delPost=id=>save({...data,posts:data.posts.filter(p=>p.id!==id)});
  const delSess=id=>save({...data,sessions:data.sessions.filter(s=>s.id!==id)});
  const delBook=id=>save({...data,books:data.books.filter(b=>b.id!==id)});
  const delPlace=id=>save({...data,places:data.places.filter(p=>p.id!==id)});

  const runAI=async()=>{
    if(!apiKey){setAiResult("設定からAnthropicのAPIキーを入力してください。");return;}
    const memos=data.posts.filter(p=>p.mode==="work").map(p=>`[${fmt(p.date)}] ${p.text}`).join("\n");
    if(!memos.trim()){setAiResult("仕事メモがまだありません。");return;}
    setAiLoading(true);setAiResult("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"あなたは建設業の一人親方STONAの経営参謀です。仕事メモから分析して簡潔な日本語で返してください。\n\n【見えてきた課題】\n- 2〜3点\n\n【次のアクション】\n- 2〜3点\n\n【営業・案件のヒント】\n- 1〜2点",messages:[{role:"user",content:"仕事メモ：\n\n"+memos}]})});
      const json=await res.json();
      setAiResult(json.content?.[0]?.text||"分析できませんでした。");
    }catch(e){setAiResult("エラー: "+e.message);}
    setAiLoading(false);
  };

  const ModeBtn=({k,l})=>(<button onClick={()=>setMode(k)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:mode===k?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:mode===k?"#2E2B27":"transparent",color:mode===k?"#F7F6F3":"#A09790",transition:"all 0.15s"}}>{l}</button>);

  const css="*{box-sizing:border-box;margin:0;padding:0}input,textarea,select{font-family:inherit;outline:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E2DDD5;border-radius:2px}.fade{animation:fi 0.2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1}}.row:hover .x{opacity:1!important}textarea{resize:none}button{cursor:pointer;font-family:inherit}.hover-bg:hover{background:#F4F2EE!important}";

  const clientSummary=(()=>{
    const map={};
    filteredRecords.forEach(r=>{
      const j=getJob(r.jobId);const client=j.client||"元請け不明";
      if(!map[client])map[client]={client,jobs:{},labor:0,cost:0,expense:0};
      if(!map[client].jobs[r.jobId])map[client].jobs[r.jobId]={job:j,recs:[],labor:0,cost:0,expense:0};
      map[client].jobs[r.jobId].recs.push(r);
      map[client].jobs[r.jobId].labor+=r.days*r.rate;map[client].jobs[r.jobId].cost+=r.cost||0;map[client].jobs[r.jobId].expense+=r.expense||0;
      map[client].labor+=r.days*r.rate;map[client].cost+=r.cost||0;map[client].expense+=r.expense||0;
    });
    return Object.values(map);
  })();

  return(
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN',YuGothic,sans-serif",background:"#F7F6F3",minHeight:"100vh",color:"#2E2B27",maxWidth:460,margin:"0 auto"}}>
      <style>{css}</style>

      {showSettings&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",background:"#fff",borderRadius:"18px 18px 0 0",padding:"24px 20px 40px",maxWidth:460,margin:"0 auto"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>設定</div>
            <div style={{fontSize:12,color:"#C0BAB0",marginBottom:16}}>AI分析のAnthropicキー</div>
            <input type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-..." style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={saveApiKey} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setShowSettings(false)} variant="ghost">キャンセル</Btn></div>
          </div>
        </div>
      )}

      <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"#C8C3BA",marginBottom:1}}>STONA</div>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:"0.02em"}}>Log</div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end",alignItems:"center"}}>
          <div style={{background:monthProfit>=TARGET?"rgba(124,163,122,0.12)":monthProfit<0?"rgba(220,100,80,0.09)":"rgba(196,154,90,0.09)",border:"1px solid "+(monthProfit>=TARGET?"rgba(124,163,122,0.25)":monthProfit<0?"rgba(220,100,80,0.2)":"rgba(196,154,90,0.2)"),borderRadius:20,padding:"4px 10px",fontSize:11,color:monthProfit>=TARGET?"#6A9368":monthProfit<0?"#C05040":"#A87E30"}}>
            ¥{yen(monthProfit)}
          </div>
          {examDate&&<div style={{background:"rgba(138,153,176,0.09)",border:"1px solid rgba(138,153,176,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#6A7E99"}}>{totalH.toFixed(0)}h</div>}
          {streak>0&&<div style={{background:"rgba(220,100,60,0.09)",border:"1px solid rgba(220,100,60,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#C06040"}}>🔥{streak}</div>}
          <button onClick={()=>{setApiKeyInput(apiKey);setShowSettings(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18,padding:"2px 4px",cursor:"pointer"}}>⚙</button>
        </div>
      </div>

      <div style={{display:"flex",padding:"14px 20px 0",gap:14,borderBottom:"1px solid #E8E4DC",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {[["log","記録"],["cost","原価管理"],["goal","目標"],["places","場所"],["ai","AI分析"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?"#2E2B27":"#C0BAB0",borderBottom:tab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:8,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"14px 14px 100px"}}>

        {tab==="log"&&<>
          <Card style={{marginBottom:11}}>
            <div style={{display:"flex",gap:5,marginBottom:13,flexWrap:"wrap"}}>
              {[["hobby","気づき"],["work","仕事"],["study","学習"],["book","読書"],["place","場所"]].map(([k,l])=><ModeBtn key={k} k={k} l={l}/>)}
            </div>
            {mode==="hobby"&&<div className="fade"><Inp value={place} onChange={e=>setPlace(e.target.value)} placeholder="場所（任意）" style={{marginBottom:8}}/><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="気づいたこと、感じたこと…" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/></div>}
            {mode==="work"&&<div className="fade"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="今日の仕事メモ" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/></div>}
            {mode==="study"&&<div className="fade"><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><Inp type="number" value={sMin} onChange={e=>setSMin(e.target.value)} placeholder="学習時間" style={{flex:1}}/><span style={{fontSize:13,color:"#C0BAB0"}}>分</span></div><Inp value={sNote} onChange={e=>setSNote(e.target.value)} placeholder="メモ（任意）"/></div>}
            {mode==="book"&&<div className="fade">
              {!selBook?<>
                <div style={{display:"flex",gap:8,marginBottom:8}}><Inp value={bookQuery} onChange={e=>setBookQuery(e.target.value)} placeholder="書名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchBooks()}/><Btn onClick={()=>searchBooks()} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{bookLoading?"検索中…":"検索"}</Btn></div>
                {bookResults.map(b=>(<div key={b.id} className="hover-bg" onClick={()=>setSelBook(b)} style={{display:"flex",gap:10,padding:"8px",borderRadius:9,cursor:"pointer",background:"transparent",marginBottom:4}}>{b.thumbnail?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📖</div>}<div><div style={{fontSize:13,color:"#2E2B27",marginBottom:2,lineHeight:1.4}}>{b.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{b.authors}</div></div></div>))}
              </>:<>
                <div style={{display:"flex",gap:10,padding:"10px",background:"#F4F2EE",borderRadius:9,marginBottom:10,alignItems:"center"}}>{selBook.thumbnail?<img src={selBook.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#E8E4DC",borderRadius:4,flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27",lineHeight:1.4}}>{selBook.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{selBook.authors}</div></div><button onClick={()=>{setSelBook(null);setBookResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button></div>
                <Inp value={bookMemo} onChange={e=>setBookMemo(e.target.value)} placeholder="一言感想（任意）"/>
              </>}
            </div>}
            {mode==="place"&&<div className="fade">
              {!selPlace?<>
                <div style={{display:"flex",gap:8,marginBottom:8}}><Inp value={placeName} onChange={e=>setPlaceName(e.target.value)} placeholder="場所名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchPlace()}/><Btn onClick={searchPlace} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{placeLoading?"…":"検索"}</Btn></div>
                {placeResults.map((p,i)=>(<div key={i} className="hover-bg" onClick={()=>setSelPlace(p)} style={{padding:"9px 10px",borderRadius:9,cursor:"pointer",background:"transparent",marginBottom:3}}><div style={{fontSize:13,color:"#2E2B27"}}>{p.name}</div><div style={{fontSize:11,color:"#B5AFA6",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.fullName}</div></div>))}
              </>:<>
                <div style={{background:"#F4F2EE",borderRadius:9,marginBottom:10,overflow:"hidden"}}><img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+selPlace.lat+","+selPlace.lon+"&zoom=15&size=420x130&markers="+selPlace.lat+","+selPlace.lon+",red"} alt="map" style={{width:"100%",height:110,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"#2E2B27"}}>{selPlace.name}</span><button onClick={()=>{setSelPlace(null);setPlaceResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button></div></div>
                <Inp value={placeMemo} onChange={e=>setPlaceMemo(e.target.value)} placeholder="どうだった？（任意）"/>
              </>}
            </div>}
            {(mode==="hobby"||mode==="work"||mode==="study")&&<Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
            {mode==="book"&&selBook&&<Btn onClick={addBook} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
            {mode==="place"&&selPlace&&<Btn onClick={addPlace} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
          </Card>
          {timeline.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>最初の記録をつけてみましょう</div>}
          {timeline.map(item=>(
            <div key={item._t+"-"+item.id} className="row fade" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:7,overflow:"hidden"}}>
              {item._t==="place"&&<><img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+item.lat+","+item.lon+"&zoom=15&size=460x110&markers="+item.lat+","+item.lon+",red"} alt="" style={{width:"100%",height:100,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.memo?5:0}}><span style={{fontSize:12,color:"#2E2B27",fontWeight:500}}>📍 {item.name}</span><span style={{fontSize:11,color:"#CCC7BE",marginLeft:"auto"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></>}
              {item._t==="book"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:44,height:60,objectFit:"cover",borderRadius:5,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}/>:<div style={{width:44,height:60,background:"#F0EDE7",borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📖</div>}<div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span><span style={{fontSize:11,color:"#CCC7BE"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delBook(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2,lineHeight:1.4}}>{item.title}</div><div style={{fontSize:11,color:"#B5AFA6",marginBottom:item.memo?4:0}}>{item.authors}</div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></div></div>}
              {item._t==="post"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>{item.mode==="hobby"&&item.place&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.place}</span>}{item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}<button className="x" onClick={()=>delPost(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div><p style={{fontSize:14,lineHeight:1.7,color:"#4A4740",margin:0}}>{item.text}</p></div>}
              {item._t==="sess"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.note?5:0}}><span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span><span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(138,153,176,0.08)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.18)"}}>学習 {item.minutes}分</span><button className="x" onClick={()=>delSess(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div>{item.note&&<p style={{fontSize:13,color:"#9E9890",lineHeight:1.6,margin:0}}>{item.note}</p>}</div>}
            </div>
          ))}
        </>}

        {tab==="cost"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:10}}>
              {[{label:"請求（売上）",val:"¥"+yen(monthBilling),color:"#8A99B0"},{label:"原価",val:"¥"+yen(monthLabor),color:"#C49A5A"},{label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                  <div style={{fontSize:15,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                  <div style={{fontSize:10,color:"#C0BAB0"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden"}}>
              <div style={{height:"100%",width:profitPct+"%",background:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:11,color:"#C8C3BA",marginTop:6,textAlign:"center"}}>目標 ¥3,000,000 まで ¥{yen(Math.max(0,TARGET-monthProfit))}</div>
          </Card>

          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,WebkitOverflowScrolling:"touch",paddingBottom:2}}>
            {months.map(m=>(<button key={m} onClick={()=>setCostMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0,border:costMonth===m?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:costMonth===m?"#2E2B27":"transparent",color:costMonth===m?"#F7F6F3":"#A09790"}}>{m==="all"?"全期間":m.replace("-","年")+"月"}</button>))}
          </div>

          <div style={{display:"flex",gap:16,borderBottom:"1px solid #E8E4DC",marginBottom:12}}>
            {[["records","記録"],["jobs","工事"],["workers","職人"],["summary","集計"]].map(([k,l])=>(
              <button key={k} onClick={()=>setCostSubTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:costSubTab===k?600:400,color:costSubTab===k?"#2E2B27":"#C0BAB0",borderBottom:costSubTab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:6,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>

          {costSubTab==="records"&&<>
            {showRecordForm&&<Card style={{marginBottom:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editRecord?"記録を編集":"記録を追加"}</div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>日付</div><Inp type="date" value={rDate} onChange={e=>setRDate(e.target.value)}/></div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>工事</div>
                <select value={rJobId} onChange={e=>setRJobId(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit"}}>
                  <option value="">選択してください</option>
                  {data.jobs.map(j=><option key={j.id} value={j.id}>{j.name}（{j.client}）</option>)}
                </select>
              </div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>職人</div>
                <select value={rWorkerId} onChange={e=>{setRWorkerId(e.target.value);const w=data.workers.find(x=>x.id===parseInt(e.target.value));if(w&&!rRate)setRRate(String(w.rate));}} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit"}}>
                  <option value="">選択してください</option>
                  {data.workers.map(w=><option key={w.id} value={w.id}>{w.name}（¥{w.rate.toLocaleString()}/日）</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>日数</div><Inp type="number" value={rDays} onChange={e=>setRDays(e.target.value)} placeholder="1"/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>日当（円）</div><Inp type="number" value={rRate} onChange={e=>setRRate(e.target.value)} placeholder="30000"/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>原価</div><Inp type="number" value={rCost} onChange={e=>setRCost(e.target.value)} placeholder="0"/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>経費</div><Inp type="number" value={rExpense} onChange={e=>setRExpense(e.target.value)} placeholder="0"/></div>
              </div>
              <Inp value={rNote} onChange={e=>setRNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:12}}/>
              {rJobId&&rWorkerId&&rDays&&<div style={{fontSize:12,color:"#8A9070",marginBottom:12,textAlign:"center"}}>人工 ¥{yen(parseFloat(rDays||0)*(parseInt(rRate)||(data.workers.find(w=>w.id===parseInt(rWorkerId))?.rate||0)))}</div>}
              <div style={{display:"flex",gap:8}}><Btn onClick={saveRecord} variant="primary" style={{flex:1}}>{editRecord?"更新":"追加"}</Btn><Btn onClick={()=>{setShowRecordForm(false);setEditRecord(null);}} variant="ghost">キャンセル</Btn></div>
            </Card>}
            {!showRecordForm&&<button onClick={()=>{setShowRecordForm(true);setEditRecord(null);setRJobId("");setRWorkerId("");setRDate(isoDay(new Date()));setRDays("1");setRRate("");setRCost("0");setRExpense("0");setRNote("");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 記録を追加</button>}
            {filteredRecords.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
            {[...filteredRecords].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r=>{
              const job=getJob(r.jobId);const worker=getWorker(r.workerId);const labor=r.days*r.rate;
              return(<div key={r.id} className="row" style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>{job.name}</div>
                    <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>{job.client} · {fmt(r.date)}</div>
                    <div style={{fontSize:12,color:"#8A8070"}}>{worker.name} {r.days}日 x ¥{yen(r.rate)} = <span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(labor)}</span></div>
                    {(r.cost>0||r.expense>0)&&<div style={{fontSize:11,color:"#C0BAB0",marginTop:2}}>原価 ¥{yen(r.cost||0)} · 経費 ¥{yen(r.expense||0)}</div>}
                    {r.note&&<div style={{fontSize:12,color:"#9E9890",marginTop:3}}>{r.note}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button onClick={()=>startEditRecord(r)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button className="x" onClick={()=>delRecord(r.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>
                  </div>
                </div>
              </div>);
            })}
          </>}

          {costSubTab==="jobs"&&<>
            {showJobForm&&<Card style={{marginBottom:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editJob?"工事を編集":"工事を追加"}</div>
              <Inp value={jName} onChange={e=>setJName(e.target.value)} placeholder="工事名" style={{marginBottom:8}}/>
              <Inp value={jClient} onChange={e=>setJClient(e.target.value)} placeholder="元請け" style={{marginBottom:8}}/>
              <Inp type="number" value={jBilling} onChange={e=>setJBilling(e.target.value)} placeholder="請求額（円）" style={{marginBottom:12}}/>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveJob} variant="primary" style={{flex:1}}>{editJob?"更新":"追加"}</Btn><Btn onClick={()=>{setShowJobForm(false);setEditJob(null);}} variant="ghost">キャンセル</Btn></div>
            </Card>}
            {!showJobForm&&<button onClick={()=>{setShowJobForm(true);setEditJob(null);setJName("");setJClient("");setJBilling("");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 工事を追加</button>}
            {data.jobs.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>工事がありません</div>}
            {data.jobs.map(j=>{
              const recs=filteredRecords.filter(r=>r.jobId===j.id);
              const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
              const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
              const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
              const days=recs.reduce((s,r)=>s+r.days,0);
              return(<div key={j.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",background:"rgba(196,154,90,0.06)",borderBottom:recs.length>0?"1px solid #F0EDE7":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{j.name}</div><div style={{fontSize:11,color:"#C0BAB0"}}>元請：{j.client}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#C49A5A"}}>¥{yen(labor+cost+expense)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>総{days}日</div></div>
                    <button onClick={()=>{setEditJob(j);setJName(j.name);setJClient(j.client);setJBilling(String(j.billing||0));setShowJobForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delJob(j.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {recs.length>0&&<div style={{padding:"8px 14px"}}>
                  {[...new Set(recs.map(r=>r.workerId))].map(wid=>{
                    const wrecs=recs.filter(r=>r.workerId===wid);
                    const wdays=wrecs.reduce((s,r)=>s+r.days,0);
                    const wtotal=wrecs.reduce((s,r)=>s+r.days*r.rate,0);
                    const w=getWorker(wid);
                    return(<div key={wid} style={{padding:"5px 0",borderBottom:"1px solid #F5F3EF",fontSize:12,display:"flex",justifyContent:"space-between",color:"#4A4740"}}>
                      <span>{w.name} {wdays}日 x ¥{yen(wrecs[0].rate)}</span><span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(wtotal)}</span>
                    </div>);
                  })}
                  {j.billing>0&&<div style={{padding:"5px 0",fontSize:12,display:"flex",justifyContent:"space-between",color:"#8A99B0"}}><span>請求額</span><span style={{fontWeight:600}}>¥{yen(j.billing)}</span></div>}
                </div>}
              </div>);
            })}
          </>}

          {costSubTab==="workers"&&<>
            {showWorkerForm&&<Card style={{marginBottom:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editWorker?"職人を編集":"職人を追加"}</div>
              <Inp value={wName} onChange={e=>setWName(e.target.value)} placeholder="名前" style={{marginBottom:8}}/>
              <Inp type="number" value={wRate} onChange={e=>setWRate(e.target.value)} placeholder="基本日当（円）" style={{marginBottom:12}}/>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveWorker} variant="primary" style={{flex:1}}>{editWorker?"更新":"追加"}</Btn><Btn onClick={()=>{setShowWorkerForm(false);setEditWorker(null);}} variant="ghost">キャンセル</Btn></div>
            </Card>}
            {!showWorkerForm&&<button onClick={()=>{setShowWorkerForm(true);setEditWorker(null);setWName("");setWRate("");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 職人を追加</button>}
            {data.workers.map(w=>{
              const recs=filteredRecords.filter(r=>r.workerId===w.id);
              const total=recs.reduce((s,r)=>s+r.days*r.rate,0);
              const days=recs.reduce((s,r)=>s+r.days,0);
              return(<div key={w.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",background:"rgba(138,153,176,0.06)",borderBottom:recs.length>0?"1px solid #F0EDE7":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{w.name}</div><div style={{fontSize:11,color:"#C0BAB0"}}>基本日当 ¥{yen(w.rate)}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#8A99B0"}}>¥{yen(total)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>{days}人工</div></div>
                    <button onClick={()=>{setEditWorker(w);setWName(w.name);setWRate(String(w.rate));setShowWorkerForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delWorker(w.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {recs.length>0&&<div style={{padding:"8px 14px"}}>
                  {[...new Set(recs.map(r=>r.jobId))].map(jid=>{
                    const jrecs=recs.filter(r=>r.jobId===jid);
                    const jdays=jrecs.reduce((s,r)=>s+r.days,0);
                    const jtotal=jrecs.reduce((s,r)=>s+r.days*r.rate,0);
                    const job=getJob(jid);
                    return(<div key={jid} style={{padding:"5px 0",borderBottom:"1px solid #F5F3EF",fontSize:12,display:"flex",justifyContent:"space-between",color:"#4A4740"}}>
                      <span>{job.name} {jdays}日</span><span style={{color:"#8A99B0",fontWeight:600}}>¥{yen(jtotal)}</span>
                    </div>);
                  })}
                </div>}
              </div>);
            })}
          </>}

          {costSubTab==="summary"&&<>
            {clientSummary.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
            {clientSummary.map((c,ci)=>(
              <div key={ci} style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>元請：{c.client}</div>
                {Object.values(c.jobs).map((jd,ji)=>(
                  <Card key={ji} style={{marginBottom:8,padding:"12px 14px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#2E2B27",marginBottom:8}}>{jd.job.name}</div>
                    {jd.recs.map((r,ri)=>{const w=getWorker(r.workerId);return(<div key={ri} style={{fontSize:12,color:"#6A6058",marginBottom:3}}>{w.name} {r.days}日 x ¥{yen(r.rate)} = <span style={{color:"#C49A5A"}}>¥{yen(r.days*r.rate)}</span></div>);})}
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F0EDE7",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                      {[{l:"原価",v:jd.labor,c:"#C49A5A"},{l:"原価",v:jd.cost,c:"#9E9890"},{l:"経費",v:jd.expense,c:"#9E9890"}].map((s,i)=>(<div key={i} style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:s.c}}>¥{yen(s.v)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div></div>))}
                    </div>
                  </Card>
                ))}
                <div style={{textAlign:"right",fontSize:12,color:"#8A8070",padding:"4px 4px"}}>{c.client} 小計：<span style={{fontWeight:700,color:"#C49A5A"}}>¥{yen(c.labor+c.cost+c.expense)}</span></div>
              </div>
            ))}
            {filteredRecords.length>0&&<Card style={{background:"rgba(196,154,90,0.08)",border:"1px solid rgba(196,154,90,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"#8A7050"}}>{costMonth==="all"?"全期間":costMonth.replace("-","年")+"月"} 合計</span>
                <span style={{fontSize:20,fontWeight:700,color:"#C49A5A"}}>¥{yen(filteredRecords.reduce((s,r)=>s+r.days*r.rate+(r.cost||0)+(r.expense||0),0))}</span>
              </div>
            </Card>}
          </>}
        </>}

        {tab==="goal"&&<>
          <Label>今週のサマリー</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
              {[{label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"},{label:"学習",val:wkStudyH.toFixed(1)+"h",color:"#8A99B0"},{label:"記録",val:wkRecords+"件",color:"#7CA37A"}].map((s,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}><div style={{fontSize:18,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div></div>))}
            </div>
          </Card>

          <Label>今月の粗利・推移</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
              <span style={{fontSize:26,fontWeight:700,color:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#2E2B27"}}>¥{yen(monthProfit)}</span>
              <span style={{fontSize:12,color:"#C0BAB0"}}>/ ¥3,000,000</span>
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:profitPct+"%",background:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:14}}>
              {[{l:"売上",v:monthBilling},{l:"原価",v:monthLabor},{l:"原価+経費",v:monthCost+monthExpense}].map((s,i)=>(<div key={i} style={{textAlign:"center",padding:"4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}><div style={{fontSize:12,color:"#8A8070"}}>¥{yen(s.v)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div></div>))}
            </div>
            <div style={{borderTop:"1px solid #F0EDE7",paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"flex-end",gap:14,marginBottom:8,paddingRight:4}}>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#8A99B0"}}><div style={{width:12,height:2,background:"#8A99B0",borderRadius:1}}/>売上</div>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7CA37A"}}><div style={{width:12,height:2,background:"#7CA37A",borderRadius:1}}/>粗利</div>
              </div>
              <SimpleLineChart data={chartData}/>
            </div>
          </Card>

          <Label>一級施工管理技士</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #F0EDE7"}}>
              <div style={{fontSize:32}}>🔥</div>
              <div><div style={{fontSize:22,fontWeight:700,color:"#C06040"}}>{streak}<span style={{fontSize:13,fontWeight:400,color:"#C0BAB0"}}> 日連続</span></div><div style={{fontSize:12,color:"#C8C3BA"}}>累計 {totalH.toFixed(1)}h</div></div>
            </div>
            <StudyCalendar sessions={data.sessions}/>
            <div style={{height:14}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:22,fontWeight:700,color:"#8A99B0"}}>{totalH.toFixed(1)}</span><span style={{fontSize:13,color:"#C0BAB0"}}>h / {targetHours}h</span></div>
              {!editG&&<button onClick={()=>{setGDate(examDate);setGH(targetHours);setEditG(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>設定</button>}
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:sPct+"%",background:"#8A99B0",borderRadius:6,transition:"width 0.5s"}}/></div>
            {!editG?wkNeed?<div style={{fontSize:12,color:"#A0998F"}}>試験まで <span style={{color:"#2E2B27",fontWeight:600}}>{dl}日</span> · 週あたり <span style={{color:"#8A99B0",fontWeight:600}}>{wkNeed}h</span> 必要</div>:<div style={{fontSize:12,color:"#C8C3BA"}}>試験日を設定してください</div>
            :<div className="fade">
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>試験日</div><Inp type="date" value={gDate} onChange={e=>setGDate(e.target.value)}/></div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>目標時間（h）</div><Inp type="number" value={gH} onChange={e=>setGH(e.target.value)}/></div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveGoal} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setEditG(false)} variant="ghost">キャンセル</Btn></div>
            </div>}
          </Card>
        </>}

        {tab==="places"&&<>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
            {["all",...new Set(data.places.map(p=>p.area||"その他").filter(Boolean))].map(a=>(<button key={a} onClick={()=>setPlaceFilter(a)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",border:placeFilter===a?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:placeFilter===a?"#2E2B27":"transparent",color:placeFilter===a?"#F7F6F3":"#A09790",flexShrink:0}}>{a==="all"?"すべて("+data.places.length+")":a}</button>))}
          </div>
          {data.places.length>0&&<Card style={{marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>{[{label:"合計",val:data.places.length+"件",color:"#7CA37A"},{label:"エリア",val:new Set(data.places.map(p=>p.area||"?")).size+"箇所",color:"#8A99B0"},{label:"今月",val:data.places.filter(p=>mKey(p.date)===mk).length+"件",color:"#C49A5A"}].map((s,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}><div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div></div>))}</div></Card>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>場所の記録がまだありません</div>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(item=>(<div key={item.id} className="row" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:8,overflow:"hidden"}}><img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+item.lat+","+item.lon+"&zoom=14&size=460x100&markers="+item.lat+","+item.lon+",red"} alt="" style={{width:"100%",height:90,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:item.memo?5:0}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>📍 {item.name}</div>{item.area&&<div style={{fontSize:11,color:"#C0BAB0"}}>{item.area}</div>}</div><span style={{fontSize:11,color:"#CCC7BE",flexShrink:0}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></div>))}
        </>}

        {tab==="ai"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:14}}>仕事メモを分析して、課題・次のアクション・営業ヒントを提案します。</div>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:12}}>仕事メモ {data.posts.filter(p=>p.mode==="work").length}件 が対象</div>
            {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
            <Btn onClick={runAI} variant="primary" style={{width:"100%",opacity:aiLoading?0.6:1}}>{aiLoading?"分析中…":"AIに分析してもらう"}</Btn>
          </Card>
          {aiResult&&<Card className="fade"><div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>分析結果</div><div style={{fontSize:13,color:"#4A4740",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiResult}</div></Card>}
          {data.posts.filter(p=>p.mode==="work").length>0&&<>
            <div style={{fontSize:11,color:"#C8C3BA",letterSpacing:"0.08em",marginTop:16,marginBottom:10}}>仕事メモ一覧</div>
            {data.posts.filter(p=>p.mode==="work").map(p=>(<div key={p.id} style={{padding:"10px 0",borderBottom:"1px solid #F0EDE7"}}><div style={{fontSize:11,color:"#C8C3BA",marginBottom:3}}>{fmtFull(p.date)}</div><div style={{fontSize:13,color:"#4A4740",lineHeight:1.6}}>{p.text}</div></div>))}
          </>}
        </>}
      </div>
    </div>
  );
}

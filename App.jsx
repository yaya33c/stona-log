import { useState, useEffect, useCallback, useRef } from "react";

const SK = "stona-log-v5";
const TARGET = 3_000_000;
const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);
const yen     = n => Math.round(n).toLocaleString();

function weekRange() {
  const now=new Date(),day=now.getDay();
  const mon=new Date(now); mon.setDate(now.getDate()-(day===0?6:day-1)); mon.setHours(0,0,0,0);
  const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
  return [mon,sun];
}
function inWeek(d){const[m,s]=weekRange();const t=new Date(d);return t>=m&&t<=s;}
function calcStreak(sessions){
  const days=[...new Set(sessions.map(s=>isoDay(s.date)))].sort().reverse();
  if(!days.length)return 0;
  let streak=0,cur=new Date();cur.setHours(0,0,0,0);
  for(const day of days){const d=new Date(day),diff=Math.round((cur-d)/86400000);if(diff>1)break;streak++;cur=d;}
  return streak;
}

// Study calendar heatmap
function StudyCalendar({sessions}){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const startOffset=firstDay===0?6:firstDay-1;
  const dayMap={};
  sessions.forEach(s=>{
    const d=new Date(s.date);
    if(d.getFullYear()===year&&d.getMonth()===month){
      const key=d.getDate();
      dayMap[key]=(dayMap[key]||0)+s.minutes;
    }
  });
  const getColor=min=>{
    if(!min||min<=5)return "#F0EDE7";
    if(min<=30)return "#C8E6C9";
    if(min<=60)return "#81C784";
    if(min<=120)return "#4CAF50";
    return "#2E7D32";
  };
  const monthSessions=sessions.filter(s=>{const d=new Date(s.date);return d.getFullYear()===year&&d.getMonth()===month;});
  const monthH=monthSessions.reduce((s,ss)=>s+ss.minutes,0)/60;
  const studiedDays=Object.keys(dayMap).length;
  const cells=[];
  for(let i=0;i<startOffset;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const todayD=now.getDate();
  const weeks=["月","火","水","木","金","土","日"];
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <div style={{flex:1,textAlign:"center",background:"rgba(74,138,98,0.08)",borderRadius:9,padding:"8px 4px"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#4A8A62"}}>{studiedDays}<span style={{fontSize:11,color:"#C0BAB0"}}>日</span></div>
          <div style={{fontSize:10,color:"#C0BAB0"}}>今月の記録</div>
        </div>
        <div style={{flex:1,textAlign:"center",background:"rgba(138,153,176,0.08)",borderRadius:9,padding:"8px 4px"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#8A99B0"}}>{monthH.toFixed(1)}<span style={{fontSize:11,color:"#C0BAB0"}}>h</span></div>
          <div style={{fontSize:10,color:"#C0BAB0"}}>今月の学習</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {weeks.map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const min=dayMap[d]||0;
          const isToday=d===todayD;
          return (<div key={d} title={min?d+"日 "+Math.floor(min/60)+"h"+(min%60?""+min%60+"m":""):d+"日"} style={{aspectRatio:"1",borderRadius:3,background:getColor(min),display:"flex",alignItems:"center",justifyContent:"center",outline:isToday?"2px solid #2E2B27":"none",outlineOffset:1}}>
            <span style={{fontSize:7,color:min>60?"#fff":"#9E9890",fontWeight:min?600:400}}>{d}</span>
          </div>);
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:6,justifyContent:"flex-end"}}>
        <span style={{fontSize:9,color:"#C0BAB0"}}>5分以下</span>
        {["#F0EDE7","#C8E6C9","#81C784","#4CAF50","#2E7D32"].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:c}}/>)}
        <span style={{fontSize:9,color:"#C0BAB0"}}>2h+</span>
      </div>
    </div>
  );
}

// Simple SVG line chart
function LineChart({data}){
  if(!data||data.length<2)return <div style={{textAlign:"center",padding:"20px 0",color:"#CCC7BE",fontSize:12}}>データがありません</div>;
  const W=300,H=100,PL=12,PR=8,PT=8,PB=20;
  const vals=[...data.map(d=>d.billing),...data.map(d=>d.profit),0];
  const maxV=Math.max(...vals,1),minV=Math.min(...vals,0),range=maxV-minV||1;
  const xStep=(W-PL-PR)/(data.length-1||1);
  const yScale=v=>PT+(H-PT-PB)*(1-(v-minV)/range);
  const toPath=arr=>arr.map((d,i)=>(i===0?"M":"L")+(PL+i*xStep).toFixed(1)+","+yScale(d).toFixed(1)).join(" ");
  return(
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:H}}>
      <line x1={PL} y1={yScale(0)} x2={W-PR} y2={yScale(0)} stroke="#E8E4DC" strokeWidth="1" strokeDasharray="2,2"/>
      <path d={toPath(data.map(d=>d.billing))} fill="none" stroke="#8A99B0" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d={toPath(data.map(d=>d.profit))} fill="none" stroke="#7CA37A" strokeWidth="1.5" strokeLinejoin="round"/>
      {data.map((d,i)=><circle key={i} cx={PL+i*xStep} cy={yScale(d.billing)} r="2.5" fill="#8A99B0"/>)}
      {data.map((d,i)=><circle key={i} cx={PL+i*xStep} cy={yScale(d.profit)} r="2.5" fill="#7CA37A"/>)}
      {data.map((d,i)=><text key={i} x={PL+i*xStep} y={H-4} textAnchor="middle" fontSize="8" fill="#C8C3BA">{d.label}</text>)}
    </svg>
  );
}

const INITIAL={
  posts:[],sessions:[],books:[],places:[],
  goal:{examDate:"",targetHours:400},
  jobs:[],workers:[],workRecords:[],
  forecast:[],
  quizProgress:[],
};

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

function DiaryMiniCal({timeline,diaryDate,setDiaryDate,setDiaryAI}){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const startOffset=firstDay===0?6:firstDay-1;
  const recordedDays=new Set(timeline.map(x=>isoDay(x.date)));
  const cells=[];
  for(let i=0;i<startOffset;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const todayD=now.getDate();
  return(
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const dayStr=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
          const hasRecord=recordedDays.has(dayStr);
          const isSelected=diaryDate===dayStr;
          const isToday=d===todayD;
          return <div key={d} onClick={()=>{if(hasRecord){setDiaryDate(dayStr);setDiaryAI("");}}} style={{aspectRatio:"1",borderRadius:4,background:isSelected?"#2E2B27":hasRecord?"rgba(138,153,176,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:hasRecord?"pointer":"default",outline:isToday?"2px solid #E8E4DC":"none",outlineOffset:1}}>
            <span style={{fontSize:9,color:isSelected?"#fff":hasRecord?"#6A7E99":"#C0BAB0",fontWeight:hasRecord?600:400}}>{d}</span>
          </div>;
        })}
      </div>
    </div>
  );
}

export default function App(){
  const [data,setData]=useState(INITIAL);
  const [tab,setTab]=useState("log");

  // log
  const [mode,setMode]=useState("hobby");
  const [text,setText]=useState("");
  const [place,setPlace]=useState("");
  const [sMin,setSMin]=useState("");
  const [sNote,setSNote]=useState("");

  // book
  const [bookQuery,setBookQuery]=useState("");
  const [bookResults,setBookResults]=useState([]);
  const [bookLoading,setBookLoading]=useState(false);
  const [selBook,setSelBook]=useState(null);
  const [bookMemo,setBookMemo]=useState("");
  const [imgUrl,setImgUrl]=useState("");
  const [extraImgUrls,setExtraImgUrls]=useState([]);

  // place search
  const [placeName,setPlaceName]=useState("");
  const [placeResults,setPlaceResults]=useState([]);
  const [placeLoading,setPlaceLoading]=useState(false);
  const [selPlace,setSelPlace]=useState(null);
  const [placeMemo,setPlaceMemo]=useState("");
  const [placeFilter,setPlaceFilter]=useState("all");

  // goal
  const [editG,setEditG]=useState(false);
  const [gDate,setGDate]=useState("");
  const [gH,setGH]=useState(400);

  // forecast
  const [showFC,setShowFC]=useState(false);
  const [fcMonth,setFcMonth]=useState("");
  const [fcName,setFcName]=useState("");
  const [fcBilling,setFcBilling]=useState("");
  const [fcProfit,setFcProfit]=useState("");
  const [editFC,setEditFC]=useState(null);

  // quiz progress
  const [quizFrom,setQuizFrom]=useState("");
  const [quizTo,setQuizTo]=useState("");
  const QUIZ_TOTAL=540;

  // study timer
  const [timerRunning,setTimerRunning]=useState(false);
  const [timerSec,setTimerSec]=useState(0);
  const [timerNote,setTimerNote]=useState("");
  const timerRef=useRef(null);

  // diary
  const [diaryDate,setDiaryDate]=useState(isoDay(new Date()));
  const [diaryAI,setDiaryAI]=useState("");
  const [diaryLoading,setDiaryLoading]=useState(false);

  // AI
  const [aiResult,setAiResult]=useState("");
  const [aiTree,setAiTree]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [apiKey,setApiKey]=useState("");
  const [apiKeyInput,setApiKeyInput]=useState("");

  // cost tab
  const [costSubTab,setCostSubTab]=useState("records");
  const [costMonth,setCostMonth]=useState(mKey(new Date()));
  // cost tab - enhanced
  const [showJobForm,setShowJobForm]=useState(false);
  const [calPickerOpen,setCalPickerOpen]=useState(false);
  const [selectedDates,setSelectedDates]=useState([]);
  const [calMonth,setCalMonth]=useState(new Date());
  const [editJob,setEditJob]=useState(null);
  const [jName,setJName]=useState("");
  const [jClient,setJClient]=useState("");
  const [jBilling,setJBilling]=useState("");
  const [jStatus,setJStatus]=useState("進行中");
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
    try{const r=localStorage.getItem(SK);if(r)setData(JSON.parse(r));}catch{}
    try{const k=localStorage.getItem("stona-api-key");if(k)setApiKey(k);}catch{}
  },[]);

  const save=useCallback(next=>{setData(next);try{localStorage.setItem(SK,JSON.stringify(next));}catch{};},[]);
  const saveApiKey=()=>{setApiKey(apiKeyInput);try{localStorage.setItem("stona-api-key",apiKeyInput);}catch{};setShowSettings(false);};

  // timer
  useEffect(()=>{
    if(timerRunning){timerRef.current=setInterval(()=>setTimerSec(s=>s+1),1000);}
    else{clearInterval(timerRef.current);}
    return()=>clearInterval(timerRef.current);
  },[timerRunning]);

  const stopTimer=()=>{
    setTimerRunning(false);
    const minutes=Math.round(timerSec/60);
    if(minutes>0){
      const session={id:Date.now(),date:new Date().toISOString(),minutes,note:timerNote.trim()||"タイマー記録"};
      save({...data,sessions:[session,...data.sessions]});
    }
    setTimerSec(0);setTimerNote("");
  };

  // computed
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

  // 過去6ヶ月グラフ
  const chartData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
      const mk2=mKey(d);
      const label=(d.getMonth()+1)+"月";
      const recs=data.workRecords.filter(r=>mKey(r.date)===mk2);
      const billing=data.jobs.filter(j=>mKey(j.createdAt)===mk2).reduce((s,j)=>s+(j.billing||0),0);
      const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
      const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
      const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
      months.push({label,billing,profit:billing-labor-cost-expense});
    }
    return months;
  })();

  // 予実: 来月以降6ヶ月forecast
  const forecastMonths=(()=>{
    const months=[];
    for(let i=1;i<=6;i++){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+i);
      months.push(mKey(d));
    }
    return months;
  })();

  // quiz
  const quizDone=(data.quizProgress||[]).reduce((s,q)=>s+(q.to-q.from+1),0);
  const quizPct=Math.min(100,(quizDone/QUIZ_TOTAL)*100);

  // cost filtered
  const filteredRecords=costMonth==="all"?data.workRecords:data.workRecords.filter(r=>mKey(r.date)===costMonth);
  const allMonths=["all",...new Set([...data.workRecords.map(r=>mKey(r.date)),...data.jobs.map(j=>mKey(j.createdAt))].filter(Boolean))].sort().reverse();

  const getJob=id=>data.jobs.find(j=>j.id===id)||{name:"不明",client:""};
  const getWorker=id=>data.workers.find(w=>w.id===id)||{name:"不明",rate:0};

  const timeline=[
    ...data.posts.map(p=>({...p,_t:"post"})),
    ...data.sessions.map(s=>({...s,_t:"sess"})),
    ...data.books.map(b=>({...b,_t:"book"})),
    ...data.places.map(p=>({...p,_t:"place"})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  // diary data
  const diaryItems=timeline.filter(x=>isoDay(x.date)===diaryDate);

  // actions
  const postLog=()=>{
    if(mode==="hobby"){if(!text.trim())return;const images=[...extraImgUrls,imgUrl].filter(Boolean);save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:"hobby",place:place.trim(),text:text.trim(),images},...data.posts]});setText("");setPlace("");setImgUrl("");setExtraImgUrls([]);}
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
    }catch(e){if(retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}alert("エラー: "+e.message);}
    setBookLoading(false);
  };
  const addBook=()=>{if(!selBook)return;save({...data,books:[{id:Date.now(),date:new Date().toISOString(),...selBook,memo:bookMemo.trim()},...data.books]});setSelBook(null);setBookQuery("");setBookResults([]);setBookMemo("");};

  const searchPlace=async()=>{
    if(!placeName.trim())return;
    setPlaceLoading(true);setPlaceResults([]);
    const fp=async()=>{try{const res=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&lang=ja&limit=8`);const json=await res.json();return(json.features||[]).map(f=>{const p=f.properties;const parts=[p.name,p.city||p.town||p.village,p.county,p.state].filter(Boolean);return{name:p.name||parts[0]||"",fullName:parts.join(", "),area:[p.state||p.county,p.city||p.town||p.village].filter(Boolean).join(" "),lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]};}).filter(r=>r.name);}catch{return[];}};
    const fn=async()=>{try{const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=5&accept-language=ja&addressdetails=1`);const json=await res.json();return json.map(p=>{const a=p.address||{};return{name:p.display_name.split(",")[0],fullName:p.display_name,area:[a.state||a.prefecture,a.city||a.town||a.village||a.suburb].filter(Boolean).join(" "),lat:parseFloat(p.lat),lon:parseFloat(p.lon)};});}catch{return[];}};
    const[ph,no]=await Promise.all([fp(),fn()]);
    const seen=new Set();
    setPlaceResults([...ph,...no].filter(r=>{const k=r.name.trim().toLowerCase();if(seen.has(k)||!r.name)return false;seen.add(k);return true;}).slice(0,10));
    setPlaceLoading(false);
  };
  const addPlace=()=>{if(!selPlace)return;save({...data,places:[{id:Date.now(),date:new Date().toISOString(),...selPlace,memo:placeMemo.trim()},...data.places]});setSelPlace(null);setPlaceName("");setPlaceResults([]);setPlaceMemo("");};

  // cost actions
  const saveJob=()=>{
    if(!jName.trim())return;
    const j={id:editJob?.id||Date.now(),createdAt:editJob?.createdAt||new Date().toISOString(),name:jName.trim(),client:jClient.trim(),billing:parseInt(jBilling)||0,status:jStatus};
    save({...data,jobs:editJob?data.jobs.map(x=>x.id===editJob.id?j:x):[j,...data.jobs]});
    setJName("");setJClient("");setJBilling("");setJStatus("進行中");setShowJobForm(false);setEditJob(null);
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
    if(!jName.trim()||!rWorkerId||selectedDates.length===0)return;
    const workerIds=(rWorkerId||"").split(",").filter(Boolean).map(Number);
    const rate=parseInt(rRate)||0;
    const days=selectedDates.length;
    const expPerDay=parseInt(rExpense)||0;

    // 案件の自動作成・更新
    let jobs=[...data.jobs];
    let jobId=parseInt(rJobId)||0;
    const existingJob=jobs.find(j=>j.name===jName);
    if(existingJob){
      jobId=existingJob.id;
      // 請求額が変更されていれば更新
      if(jBilling&&parseInt(jBilling)!==existingJob.billing){
        jobs=jobs.map(j=>j.id===existingJob.id?{...j,billing:parseInt(jBilling)||j.billing,client:jClient||j.client}:j);
      }
    } else {
      // 新規案件作成
      jobId=Date.now();
      const newJob={id:jobId,createdAt:new Date().toISOString(),name:jName.trim(),client:jClient.trim(),billing:parseInt(jBilling)||0,status:"進行中"};
      jobs=[newJob,...jobs];
    }

    // 職人ごとにレコード作成
    const newRecords=workerIds.map((wid,i)=>({
      id:Date.now()+i+1,
      dates:selectedDates,
      date:selectedDates[0],
      jobId,
      workerId:wid,
      days,
      rate,
      cost:i===0?(parseInt(rCost)||0):0,
      expense:expPerDay*days,
      note:rNote.trim(),
    }));
    const updatedRecords=editRecord
      ?data.workRecords.map(x=>x.id===editRecord.id?newRecords[0]:x)
      :[...newRecords,...data.workRecords];
    save({...data,jobs,workRecords:updatedRecords});
    setRRate("");setRCost("0");setRExpense("0");setRNote("");setSelectedDates([]);setRJobId("");setRWorkerId("");setJName("");setJClient("");setJBilling("");setShowRecordForm(false);setEditRecord(null);
  };
  const delRecord=id=>save({...data,workRecords:data.workRecords.filter(r=>r.id!==id)});
  const startEditRecord=r=>{setEditRecord(r);setRJobId(String(r.jobId));setRWorkerId(String(r.workerId));setSelectedDates(r.dates||[r.date]);setRRate(String(r.rate));setRCost(String(r.cost||0));setRExpense(r.days>0?String(Math.round((r.expense||0)/r.days)):"0");setRNote(r.note||"");setShowRecordForm(true);};

  // forecast
  const saveForecast=()=>{
    if(!fcMonth||!fcName.trim())return;
    const f={id:editFC?.id||Date.now(),month:fcMonth,name:fcName.trim(),billing:parseInt(fcBilling)||0,profit:parseInt(fcProfit)||0};
    save({...data,forecast:editFC?data.forecast.map(x=>x.id===editFC.id?f:x):[f,...data.forecast]});
    setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");setShowFC(false);setEditFC(null);
  };
  const delForecast=id=>save({...data,forecast:data.forecast.filter(f=>f.id!==id)});

  // quiz
  const addQuiz=()=>{
    const from=parseInt(quizFrom),to=parseInt(quizTo);
    if(!from||!to||from>to||from<1||to>QUIZ_TOTAL)return;
    save({...data,quizProgress:[...(data.quizProgress||[]),{id:Date.now(),from,to,date:isoDay(new Date())}]});
    setQuizFrom("");setQuizTo("");
  };

  const saveGoal=()=>{save({...data,goal:{examDate:gDate,targetHours:parseInt(gH,10)||400}});setEditG(false);};
  const delPost=id=>save({...data,posts:data.posts.filter(p=>p.id!==id)});
  const delSess=id=>save({...data,sessions:data.sessions.filter(s=>s.id!==id)});
  const delBook=id=>save({...data,books:data.books.filter(b=>b.id!==id)});
  const delPlace=id=>save({...data,places:data.places.filter(p=>p.id!==id)});

  // AI memo analysis
  const buildAllLogs=()=>{
    const lines=[];
    data.posts.filter(p=>p.mode==="hobby").forEach(p=>lines.push("[気づき] "+p.text));
    data.posts.filter(p=>p.mode==="work").forEach(p=>lines.push("[仕事] "+p.text));
    data.books.forEach(b=>lines.push("[読書] "+b.title+(b.memo?" - "+b.memo:"")));
    return lines.join("\n");
  };

  const runAI=async()=>{
    if(!apiKey){setAiTree("");setAiResult("設定からAPIキーを入力してください。");return;}
    const logs=buildAllLogs();
    if(!logs.trim()){setAiTree("記録がまだありません。");return;}
    setAiLoading(true);setAiTree("");setAiResult("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,
        system:`あなたはSTONA（建設業一人親方・浩一）の記録を分析するアシスタントです。
全記録からキーワード・テーマを抽出し、SVGのロジックツリーを生成してください。

ルール：
- 中央ノード「STONA」から主要テーマ（3〜5個）を枝分かれ
- 各テーマから具体的キーワード（2〜3個）を展開
- 登場頻度が高いテーマほどノードを大きく（fontSize・rx）
- カラーは落ち着いたオフホワイト系（背景#F4F2EE、枠線#C0BAB0、テキスト#2E2B27）
- SVGサイズ: viewBox="0 0 360 500"
- 必ずSVGタグのみを返す（説明文不要）`,
        messages:[{role:"user",content:"記録：\n\n"+logs}]})});
      const json=await res.json();
      const txt=json.content?.[0]?.text||"";
      const svgMatch=txt.match(/<svg[\s\S]*<\/svg>/i);
      setAiTree(svgMatch?svgMatch[0]:"<p style='color:#C0BAB0;font-size:13px'>SVGの生成に失敗しました</p>");
    }catch(e){setAiTree("<p style='color:#E07070;font-size:13px'>エラー: "+e.message+"</p>");}
    setAiLoading(false);
  };

  const runAIText=async()=>{
    if(!apiKey){setAiResult("設定からAPIキーを入力してください。");return;}
    const logs=buildAllLogs();
    if(!logs.trim()){setAiResult("記録がまだありません。");return;}
    setAiLoading(true);setAiResult("");setAiTree("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
        system:"あなたは建設業の一人親方STONAの経営参謀です。気づき・仕事・読書の全記録から分析して簡潔な日本語で返してください。\n\n【見えてきたテーマ・傾向】\n- 2〜3点\n\n【仕事への示唆】\n- 2〜3点\n\n【次のアクション提案】\n- 1〜2点",
        messages:[{role:"user",content:"全記録：\n\n"+logs}]})});
      const json=await res.json();
      setAiResult(json.content?.[0]?.text||"分析できませんでした。");
    }catch(e){setAiResult("エラー: "+e.message);}
    setAiLoading(false);
  };

  // Diary AI
  const runDiaryAI=async()=>{
    if(!apiKey){setDiaryAI("設定からAPIキーを入力してください。");return;}
    if(diaryItems.length===0){setDiaryAI("この日の記録がありません。");return;}
    setDiaryLoading(true);setDiaryAI("");
    const summary=diaryItems.map(x=>{
      if(x._t==="post")return `[${x.mode==="work"?"仕事":"気づき"}] ${x.text}`;
      if(x._t==="sess")return `[学習] ${x.minutes}分 ${x.note||""}`;
      if(x._t==="book")return `[読書] ${x.title} ${x.memo||""}`;
      if(x._t==="place")return `[場所] ${x.name} ${x.memo||""}`;
      return "";
    }).join("\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:"あなたはSTONA（一人親方・浩一）の日々の記録を読んで、その日を振り返る一文を書くアシスタントです。\n箇条書きや分析ではなく、その日の空気感や気づきを引き出すような、短い詩的な一文（2〜3文）を日本語で書いてください。説明的にならず、その人の内側に語りかけるように。",messages:[{role:"user",content:`${diaryDate}の記録：\n\n${summary}`}]})});
      const json=await res.json();
      setDiaryAI(json.content?.[0]?.text||"");
    }catch(e){setDiaryAI("エラー: "+e.message);}
    setDiaryLoading(false);
  };

  const ModeBtn=({k,l})=>(<button onClick={()=>setMode(k)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:mode===k?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:mode===k?"#2E2B27":"transparent",color:mode===k?"#F7F6F3":"#A09790",transition:"all 0.15s"}}>{l}</button>);

  // client summary for cost
  // unique clients and workers from history
  const clientHistory=[...new Set(data.jobs.map(j=>j.client).filter(Boolean))];
  const workerHistory=data.workers.map(w=>w.name);

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

  const timerDisp=`${String(Math.floor(timerSec/3600)).padStart(2,"0")}:${String(Math.floor((timerSec%3600)/60)).padStart(2,"0")}:${String(timerSec%60).padStart(2,"0")}`;

  const css="*{box-sizing:border-box;margin:0;padding:0}input,textarea,select{font-family:inherit;outline:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E2DDD5;border-radius:2px}.fade{animation:fi 0.2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1}}.row:hover .x{opacity:1!important}textarea{resize:none}button{cursor:pointer;font-family:inherit}.hover-bg:hover{background:#F4F2EE!important}";

  return(
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN',YuGothic,sans-serif",background:"#F7F6F3",minHeight:"100vh",color:"#2E2B27",maxWidth:460,margin:"0 auto"}}>
      <style>{css}</style>

      {/* Settings modal */}
      {showSettings&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",background:"#fff",borderRadius:"18px 18px 0 0",padding:"24px 20px 40px",maxWidth:460,margin:"0 auto"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>設定</div>
            <div style={{fontSize:12,color:"#C0BAB0",marginBottom:16}}>AI機能のAnthropicキー</div>
            <input type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-..." style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={saveApiKey} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setShowSettings(false)} variant="ghost">キャンセル</Btn></div>
          </div>
        </div>
      )}

      {/* Header */}
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

      {/* Tabs */}
      <div style={{display:"flex",padding:"14px 20px 0",gap:14,borderBottom:"1px solid #E8E4DC",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {[["log","記録"],["diary","日記"],["cost","原価管理"],["goal","目標"],["places","場所"],["ai","AI分析"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?"#2E2B27":"#C0BAB0",borderBottom:tab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:8,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"14px 14px 100px"}}>

        {/* ── LOG TAB ── */}
        {tab==="log"&&<>
          <Card style={{marginBottom:11}}>
            <div style={{display:"flex",gap:5,marginBottom:13,flexWrap:"wrap"}}>
              {[["hobby","気づき"],["work","仕事"],["study","学習"],["book","読書"],["place","場所"]].map(([k,l])=><ModeBtn key={k} k={k} l={l}/>)}
            </div>
            {mode==="hobby"&&<div className="fade">
              <Inp value={place} onChange={e=>setPlace(e.target.value)} placeholder="場所（任意）" style={{marginBottom:8}}/>
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="気づいたこと、感じたこと…" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65,marginBottom:8}}/>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Inp value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="画像URL（iCloud/Drive共有リンク）" style={{flex:1,fontSize:12}}/>
                {imgUrl&&<button onClick={()=>setExtraImgUrls(u=>[...u,imgUrl])||setImgUrl("")} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#6E6A63",cursor:"pointer",whiteSpace:"nowrap"}}>追加</button>}
              </div>
              {[imgUrl,...extraImgUrls].filter(Boolean).length>0&&<div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                {[...extraImgUrls,imgUrl].filter(Boolean).map((u,i)=><div key={i} style={{position:"relative"}}><img src={u} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #E8E4DC"}} onError={e=>{e.target.style.opacity=0.3;}}/><button onClick={()=>{if(i<extraImgUrls.length)setExtraImgUrls(a=>a.filter((_,j)=>j!==i));else setImgUrl("");}} style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#E07070",border:"none",color:"#fff",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>)}
              </div>}
            </div>}
            {mode==="work"&&<div className="fade"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="今日の仕事メモ" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/></div>}
            {mode==="study"&&<div className="fade">
              {/* Timer */}
              <div style={{background:"#F4F2EE",borderRadius:10,padding:"12px",marginBottom:10,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:700,color:"#2E2B27",letterSpacing:"0.1em",marginBottom:8,fontVariantNumeric:"tabular-nums"}}>{timerDisp}</div>
                <Inp value={timerNote} onChange={e=>setTimerNote(e.target.value)} placeholder="学習内容（任意）" style={{marginBottom:8}}/>
                <div style={{display:"flex",gap:8}}>
                  {!timerRunning
                    ?<Btn onClick={()=>setTimerRunning(true)} variant="primary" style={{flex:1}}>▶ 開始</Btn>
                    :<><Btn onClick={()=>setTimerRunning(false)} variant="secondary" style={{flex:1}}>⏸ 一時停止</Btn><Btn onClick={stopTimer} style={{flex:1,background:"rgba(124,163,122,0.15)",border:"1px solid rgba(124,163,122,0.3)",color:"#6A9368"}}>⏹ 終了・記録</Btn></>
                  }
                  {!timerRunning&&timerSec>0&&<Btn onClick={()=>setTimerSec(0)} variant="ghost">リセット</Btn>}
                </div>
              </div>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>または手動入力</div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><Inp type="number" value={sMin} onChange={e=>setSMin(e.target.value)} placeholder="学習時間" style={{flex:1}}/><span style={{fontSize:13,color:"#C0BAB0"}}>分</span></div>
              <Inp value={sNote} onChange={e=>setSNote(e.target.value)} placeholder="メモ（任意）"/>
            </div>}
            {mode==="book"&&<div className="fade">
              {!selBook?<>
                <div style={{display:"flex",gap:8,marginBottom:8}}><Inp value={bookQuery} onChange={e=>setBookQuery(e.target.value)} placeholder="書名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchBooks()}/><Btn onClick={()=>searchBooks()} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{bookLoading?"検索中…":"検索"}</Btn></div>
                {bookResults.map(b=>(<div key={b.id} className="hover-bg" onClick={()=>setSelBook(b)} style={{display:"flex",gap:10,padding:"8px",borderRadius:9,cursor:"pointer",background:"transparent",marginBottom:4}}>{b.thumbnail?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}<div><div style={{fontSize:13,color:"#2E2B27",lineHeight:1.4}}>{b.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{b.authors}</div></div></div>))}
              </>:<>
                <div style={{display:"flex",gap:10,padding:"10px",background:"#F4F2EE",borderRadius:9,marginBottom:10,alignItems:"center"}}>{selBook.thumbnail?<img src={selBook.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#E8E4DC",borderRadius:4,flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27"}}>{selBook.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{selBook.authors}</div></div><button onClick={()=>{setSelBook(null);setBookResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button></div>
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
            {(mode==="hobby"||mode==="work")&&<Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
            {mode==="study"&&<Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:8}}>手動で記録する</Btn>}
            {mode==="book"&&selBook&&<Btn onClick={addBook} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
            {mode==="place"&&selPlace&&<Btn onClick={addPlace} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
          </Card>

          {timeline.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>最初の記録をつけてみましょう</div>}
          {timeline.map(item=>(
            <div key={item._t+"-"+item.id} className="row fade" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:7,overflow:"hidden"}}>
              {item._t==="place"&&<><img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+item.lat+","+item.lon+"&zoom=15&size=460x110&markers="+item.lat+","+item.lon+",red"} alt="" style={{width:"100%",height:100,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.memo?5:0}}><span style={{fontSize:12,color:"#2E2B27",fontWeight:500}}>📍 {item.name}</span><span style={{fontSize:11,color:"#CCC7BE",marginLeft:"auto"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></>}
              {item._t==="book"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:44,height:60,objectFit:"cover",borderRadius:5,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}/>:<div style={{width:44,height:60,background:"#F0EDE7",borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}<div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span><span style={{fontSize:11,color:"#CCC7BE"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delBook(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",lineHeight:1.4}}>{item.title}</div><div style={{fontSize:11,color:"#B5AFA6",marginBottom:item.memo?4:0}}>{item.authors}</div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></div></div>}
              {item._t==="post"&&<div style={{padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
                {item.mode==="hobby"&&item.place&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.place}</span>}
                {item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}
                {item.images&&item.images.length>0&&<div style={{marginLeft:"auto",position:"relative",width:32,height:32,cursor:"pointer"}} onClick={()=>window.open(item.images[0],"_blank")}>
                  {item.images.slice(0,2).map((u,i)=><img key={i} src={u} alt="" style={{position:"absolute",top:i*3+"px",left:i*3+"px",width:28,height:28,objectFit:"cover",borderRadius:5,border:"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}} onError={e=>{e.target.style.display="none";}}/>)}
                  {item.images.length>1&&<div style={{position:"absolute",bottom:-4,right:-6,background:"#8A99B0",color:"#fff",borderRadius:8,fontSize:8,padding:"1px 4px"}}>{item.images.length}</div>}
                </div>}
                {!item.images&&<button className="x" onClick={()=>delPost(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>}
                {item.images&&<button className="x" onClick={()=>delPost(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>}
              </div>
              <p style={{fontSize:14,lineHeight:1.7,color:"#4A4740",margin:0}}>{item.text}</p>
            </div>}
              {item._t==="sess"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.note?5:0}}><span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span><span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(138,153,176,0.08)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.18)"}}>学習 {item.minutes}分</span><button className="x" onClick={()=>delSess(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div>{item.note&&<p style={{fontSize:13,color:"#9E9890",lineHeight:1.6,margin:0}}>{item.note}</p>}</div>}
            </div>
          ))}
        </>}

        {/* ── DIARY TAB ── */}
        {tab==="diary"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>{const d=new Date(diaryDate);d.setDate(d.getDate()-1);setDiaryDate(isoDay(d));setDiaryAI("");}} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#6E6A63"}}>‹</button>
              <input type="date" value={diaryDate} onChange={e=>{setDiaryDate(e.target.value);setDiaryAI("");}} style={{flex:1,background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"8px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none",textAlign:"center"}}/>
              <button onClick={()=>{const d=new Date(diaryDate);d.setDate(d.getDate()+1);setDiaryDate(isoDay(d));setDiaryAI("");}} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#6E6A63"}}>›</button>
            </div>
            {diaryItems.length===0
              ?<div style={{textAlign:"center",padding:"24px 0",color:"#CCC7BE",fontSize:13}}>この日の記録はありません</div>
              :<>
                {diaryItems.map(item=>(
                  <div key={item._t+"-"+item.id} style={{padding:"10px 0",borderBottom:"1px solid #F0EDE7"}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
                      {item._t==="post"&&item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}
                      {item._t==="post"&&item.mode==="hobby"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(139,168,138,0.08)",color:"#6A9368",border:"1px solid rgba(139,168,138,0.18)"}}>気づき</span>}
                      {item._t==="sess"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(138,153,176,0.08)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.18)"}}>学習 {item.minutes}分</span>}
                      {item._t==="book"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span>}
                      {item._t==="place"&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.name}</span>}
                    </div>
                    {item._t==="post"&&<p style={{fontSize:14,color:"#4A4740",lineHeight:1.7,margin:0}}>{item.text}</p>}
                    {item._t==="sess"&&item.note&&<p style={{fontSize:13,color:"#9E9890",lineHeight:1.6,margin:0}}>{item.note}</p>}
                    {item._t==="book"&&<><div style={{fontSize:13,fontWeight:500,color:"#2E2B27"}}>{item.title}</div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:"2px 0 0"}}>{item.memo}</p>}</>}
                    {item._t==="place"&&item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
                  </div>
                ))}
                <div style={{marginTop:14}}>
                  {diaryAI
                    ?<div style={{background:"rgba(46,43,39,0.03)",borderRadius:10,padding:"12px 14px",borderLeft:"3px solid #E8E4DC"}}>
                      <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6,letterSpacing:"0.08em"}}>この日を振り返ると</div>
                      <p style={{fontSize:14,color:"#4A4740",lineHeight:1.8,margin:0,fontStyle:"italic"}}>{diaryAI}</p>
                    </div>
                    :<Btn onClick={runDiaryAI} variant="ghost" style={{width:"100%",marginTop:4,opacity:diaryLoading?0.6:1}}>{diaryLoading?"生成中…":"✦ この日を振り返る"}</Btn>
                  }
                </div>
              </>
            }
          </Card>

          {/* 月カレンダーで記録のある日を一覧 */}
          <Label>過去の記録</Label>
          <DiaryMiniCal timeline={timeline} diaryDate={diaryDate} setDiaryDate={setDiaryDate} setDiaryAI={setDiaryAI}/>
        </>}

        {/* ── 原価管理 TAB ── */}
        {tab==="cost"&&<>
          {/* 月次サマリー */}
          <Card style={{marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:10}}>
              {[
                {label:"請求（売上）",val:"¥"+yen(monthBilling),color:"#8A99B0"},
                {label:"原価合計",val:"¥"+yen(monthLabor+monthCost+monthExpense),color:"#C49A5A"},
                {label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"}
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                  <div style={{fontSize:14,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                  <div style={{fontSize:10,color:"#C0BAB0"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden"}}>
              <div style={{height:"100%",width:profitPct+"%",background:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:11,color:"#C8C3BA",marginTop:6,textAlign:"center"}}>目標 ¥3,000,000 まで ¥{yen(Math.max(0,TARGET-monthProfit))}</div>
          </Card>

          {/* 月フィルター */}
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,WebkitOverflowScrolling:"touch",paddingBottom:2}}>
            {allMonths.map(m=>(
              <button key={m} onClick={()=>setCostMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0,border:costMonth===m?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:costMonth===m?"#2E2B27":"transparent",color:costMonth===m?"#F7F6F3":"#A09790"}}>
                {m==="all"?"全期間":m.replace("-","年")+"月"}
              </button>
            ))}
          </div>

          {/* サブタブ */}
          <div style={{display:"flex",gap:16,borderBottom:"1px solid #E8E4DC",marginBottom:12}}>
            {[["records","記録"],["jobs","工事"],["workers","職人"],["summary","集計"]].map(([k,l])=>(
              <button key={k} onClick={()=>setCostSubTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:costSubTab===k?600:400,color:costSubTab===k?"#2E2B27":"#C0BAB0",borderBottom:costSubTab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:6,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>

          {/* ── 記録 ── */}
          {costSubTab==="records"&&<>
            {showRecordForm&&<Card style={{marginBottom:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>{editRecord?"記録を編集":"記録を追加"}</div>

              {/* ① 元請け */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>① 元請け</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {clientHistory.map(c=>(
                    <button key={c} onClick={()=>setJClient(c)} style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:jClient===c?"1.5px solid #2E2B27":"1px solid #E2DDD5",background:jClient===c?"#2E2B27":"transparent",color:jClient===c?"#F7F6F3":"#6E6A63"}}>{c}</button>
                  ))}
                  <button onClick={()=>setJClient("")} style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:"1.5px dashed #DDD8D0",background:"transparent",color:"#C0BAB0"}}>＋ 新規</button>
                </div>
                {(jClient===""||!clientHistory.includes(jClient))&&<Inp value={jClient} onChange={e=>setJClient(e.target.value)} placeholder="元請け名を入力"/>}
              </div>

              {/* ② 案件 */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>② 案件（工事）</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {[...new Set(data.jobs.map(j=>j.name))].map(n=>(
                    <button key={n} onClick={()=>{
                      setJName(n);
                      const job=data.jobs.find(j=>j.name===n);
                      if(job){setRJobId(String(job.id));if(job.client&&!jClient)setJClient(job.client);}
                    }} style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:jName===n?"1.5px solid #2E2B27":"1px solid #E2DDD5",background:jName===n?"#2E2B27":"transparent",color:jName===n?"#F7F6F3":"#6E6A63"}}>{n}</button>
                  ))}
                  <button onClick={()=>{setJName("");setRJobId("");}} style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:"1.5px dashed #DDD8D0",background:"transparent",color:"#C0BAB0"}}>＋ 新規</button>
                </div>
                {(jName===""||!data.jobs.find(j=>j.name===jName))&&<>
                  <Inp value={jName} onChange={e=>setJName(e.target.value)} placeholder="工事名を入力" style={{marginBottom:6}}/>
                  <Inp type="number" value={jBilling} onChange={e=>setJBilling(e.target.value)} placeholder="請求額（円）—売上として記録"/>
                </>}
                {jName&&data.jobs.find(j=>j.name===jName)&&(()=>{
                  const job=data.jobs.find(j=>j.name===jName);
                  return <div style={{fontSize:11,color:"#8A99B0",marginTop:4}}>請求額 ¥{yen(job.billing||0)}<button onClick={()=>{setJBilling(String(job.billing||0));}} style={{marginLeft:8,fontSize:10,color:"#C49A5A",background:"none",border:"none",cursor:"pointer"}}>変更</button></div>;
                })()}
              </div>

              {/* ③ 作業員 */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>③ 作業員（複数選択可）</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {data.workers.map(w=>{
                    const sel=(rWorkerId||"").split(",").filter(Boolean).includes(String(w.id));
                    return <button key={w.id} onClick={()=>{
                      const ids=(rWorkerId||"").split(",").filter(Boolean);
                      const next=sel?ids.filter(i=>i!==String(w.id)):[...ids,String(w.id)];
                      setRWorkerId(next.join(","));
                      if(next.length===1&&!rRate){const wk=data.workers.find(x=>x.id===parseInt(next[0]));if(wk)setRRate(String(wk.rate));}
                    }} style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:sel?"1.5px solid #2E2B27":"1px solid #E2DDD5",background:sel?"#2E2B27":"transparent",color:sel?"#F7F6F3":"#6E6A63"}}>{w.name}</button>;
                  })}
                </div>
                {/* 新規職人追加 */}
                <div style={{display:"flex",gap:6}}>
                  <Inp value={wName} onChange={e=>setWName(e.target.value)} placeholder="新規職人名" style={{flex:1}}/>
                  <Inp type="number" value={wRate} onChange={e=>setWRate(e.target.value)} placeholder="日当" style={{width:80}}/>
                  <button onClick={()=>{if(!wName.trim())return;saveWorker();}} style={{padding:"6px 10px",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:8,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",color:"#6E6A63",fontFamily:"inherit"}}>追加</button>
                </div>
              </div>

              {/* ④ 稼働日（カレンダー） */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>
                  ④ 稼働日（タップで複数選択）
                  {selectedDates.length>0&&<span style={{marginLeft:8,color:"#C49A5A",fontWeight:600}}>{selectedDates.length}日選択</span>}
                </div>
                <div style={{background:"#F4F2EE",borderRadius:10,padding:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <button onClick={()=>setCalMonth(d=>{const n=new Date(d);n.setMonth(n.getMonth()-1);return n;})} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#6E6A63",padding:"0 4px"}}>‹</button>
                    <span style={{fontSize:12,color:"#4A4740",fontWeight:600}}>{calMonth.getFullYear()}年{calMonth.getMonth()+1}月</span>
                    <button onClick={()=>setCalMonth(d=>{const n=new Date(d);n.setMonth(n.getMonth()+1);return n;})} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#6E6A63",padding:"0 4px"}}>›</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:3}}>
                    {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                    {(()=>{
                      const y=calMonth.getFullYear(),m=calMonth.getMonth();
                      const dim=new Date(y,m+1,0).getDate();
                      const fd=new Date(y,m,1).getDay();
                      const offset=fd===0?6:fd-1;
                      const cells=[];
                      for(let i=0;i<offset;i++)cells.push(null);
                      for(let d=1;d<=dim;d++)cells.push(d);
                      return cells.map((d,i)=>{
                        if(!d)return <div key={"e"+i}/>;
                        const ds=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
                        const sel=selectedDates.includes(ds);
                        const today=ds===isoDay(new Date());
                        return <div key={d} onClick={()=>setSelectedDates(prev=>sel?prev.filter(x=>x!==ds):[...prev,ds].sort())} style={{aspectRatio:"1",borderRadius:4,background:sel?"#2E2B27":today?"rgba(196,154,90,0.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <span style={{fontSize:9,color:sel?"#fff":today?"#C49A5A":"#4A4740",fontWeight:sel||today?600:400}}>{d}</span>
                        </div>;
                      });
                    })()}
                  </div>
                </div>
                {selectedDates.length>0&&<div style={{marginTop:4,fontSize:10,color:"#C0BAB0",lineHeight:1.6}}>
                  {selectedDates.slice(0,6).map(d=>fmt(d)).join(" · ")}{selectedDates.length>6?"…":""}
                </div>}
              </div>

              {/* ⑤ 単価・原価・経費 */}
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>⑤ 単価（円/人/日）</div><Inp type="number" value={rRate} onChange={e=>setRRate(e.target.value)} placeholder="30000"/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>材料費（総額）</div><Inp type="number" value={rCost} onChange={e=>setRCost(e.target.value)} placeholder="0"/></div>
                <div>
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>経費（円/日）</div>
                  <Inp type="number" value={rExpense} onChange={e=>setRExpense(e.target.value)} placeholder="0"/>
                  {rExpense>0&&selectedDates.length>0&&<div style={{fontSize:10,color:"#C0BAB0",marginTop:2}}>合計 ¥{yen(parseInt(rExpense)*selectedDates.length)}</div>}
                </div>
              </div>
              <Inp value={rNote} onChange={e=>setRNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:10}}/>

              {/* プレビュー */}
              {rWorkerId&&selectedDates.length>0&&rRate&&(()=>{
                const workers=(rWorkerId||"").split(",").filter(Boolean);
                const days=selectedDates.length;
                const rate=parseInt(rRate)||0;
                const labor=workers.length*days*rate;
                const cost=parseInt(rCost)||0;
                const expTotal=(parseInt(rExpense)||0)*days;
                const subtotal=labor+cost+expTotal;
                const job=data.jobs.find(j=>j.name===jName);
                const billing=job?.billing||(parseInt(jBilling)||0);
                return <div style={{background:"#F4F2EE",borderRadius:9,padding:"12px",marginBottom:12}}>
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>合計プレビュー</div>
                  <div style={{fontSize:12,color:"#6A6058",marginBottom:3}}>
                    人工 {workers.length}人 × {days}日 × ¥{yen(rate)} = <span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(labor)}</span>
                  </div>
                  {cost>0&&<div style={{fontSize:12,color:"#6A6058",marginBottom:3}}>材料費 ¥{yen(cost)}</div>}
                  {expTotal>0&&<div style={{fontSize:12,color:"#6A6058",marginBottom:3}}>経費 ¥{yen(parseInt(rExpense))} × {days}日 = ¥{yen(expTotal)}</div>}
                  <div style={{borderTop:"1px solid #E8E4DC",marginTop:8,paddingTop:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:"#8A8070"}}>原価合計</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#C49A5A"}}>¥{yen(subtotal)}</span>
                    </div>
                    {billing>0&&<>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,color:"#8A8070"}}>請求額</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#8A99B0"}}>¥{yen(billing)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",paddingTop:4,borderTop:"1px dashed #E8E4DC"}}>
                        <span style={{fontSize:12,color:"#8A8070"}}>粗利</span>
                        <span style={{fontSize:13,fontWeight:700,color:billing-subtotal>=0?"#7CA37A":"#E07070"}}>¥{yen(billing-subtotal)}</span>
                      </div>
                    </>}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#C0BAB0"}}>
                      <span>税抜 ¥{yen(subtotal)}</span>
                      <span>税込 ¥{yen(Math.round(subtotal*1.1))}</span>
                    </div>
                  </div>
                </div>;
              })()}

              <div style={{display:"flex",gap:8}}>
                <Btn onClick={saveRecord} variant="primary" style={{flex:1}}>{editRecord?"更新":"記録する"}</Btn>
                <Btn onClick={()=>{setShowRecordForm(false);setEditRecord(null);setSelectedDates([]);setJName("");setJClient("");setJBilling("");}} variant="ghost">キャンセル</Btn>
              </div>
            </Card>}
            {!showRecordForm&&<button onClick={()=>{setShowRecordForm(true);setEditRecord(null);setRJobId("");setRWorkerId("");setSelectedDates([]);setRRate("");setRCost("0");setRExpense("0");setRNote("");setJName("");setJClient("");setJBilling("");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 記録を追加</button>}
            {filteredRecords.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
            {[...filteredRecords].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r=>{
              const job=getJob(r.jobId);const worker=getWorker(r.workerId);const labor=r.days*r.rate;
              const subtotal=labor+(r.cost||0)+(r.expense||0);
              return <div key={r.id} className="row" style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:1}}>{job.name}</div>
                    <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>{job.client} · {r.dates?r.dates.slice(0,3).map(d=>fmt(d)).join(" · ")+(r.dates.length>3?"…":""):fmt(r.date)}</div>
                    <div style={{fontSize:12,color:"#8A8070"}}>{worker.name} {r.days}日 × ¥{yen(r.rate)} = <span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(labor)}</span></div>
                    {(r.cost>0||r.expense>0)&&<div style={{fontSize:11,color:"#C0BAB0",marginTop:2}}>材料費 ¥{yen(r.cost||0)} · 経費 ¥{yen(r.expense||0)}</div>}
                    <div style={{fontSize:11,color:"#9E9890",marginTop:2}}>原価合計 ¥{yen(subtotal)} · 税込 ¥{yen(Math.round(subtotal*1.1))}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>startEditRecord(r)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button className="x" onClick={()=>delRecord(r.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>
                  </div>
                </div>
              </div>;
            })}
          </>}

          {/* ── 工事（案件ごとの集計） ── */}
          {costSubTab==="jobs"&&<>
            {data.jobs.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>工事がありません<br/><span style={{fontSize:11}}>記録から案件を入力すると自動で追加されます</span></div>}
            {data.jobs.map(j=>{
              const recs=filteredRecords.filter(r=>r.jobId===j.id);
              const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
              const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
              const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
              const days=recs.reduce((s,r)=>s+r.days,0);
              const genka=labor+cost+expense;
              const profit=(j.billing||0)-genka;
              const statusColor={"商談中":"#8A99B0","進行中":"#C49A5A","完了":"#7CA37A","中断":"#C0BAB0"}[j.status||"進行中"];
              return <div key={j.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",background:"rgba(196,154,90,0.04)",borderBottom:"1px solid #F0EDE7",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{j.name}</div>
                      <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:statusColor+"22",color:statusColor,border:"1px solid "+statusColor+"44"}}>{j.status||"進行中"}</span>
                    </div>
                    <div style={{fontSize:11,color:"#C0BAB0"}}>元請：{j.client}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button onClick={()=>{setEditJob(j);setJName(j.name);setJClient(j.client);setJBilling(String(j.billing||0));setJStatus(j.status||"進行中");setShowJobForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delJob(j.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                <div style={{padding:"10px 14px"}}>
                  {/* 請求 vs 原価 */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #F0EDE7"}}>
                    {[{l:"請求額",v:j.billing||0,c:"#8A99B0"},{l:"原価",v:genka,c:"#C49A5A"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontSize:13,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                        <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* 職人内訳 */}
                  {recs.length>0&&[...new Set(recs.map(r=>r.workerId))].map(wid=>{
                    const wrecs=recs.filter(r=>r.workerId===wid);
                    const wdays=wrecs.reduce((s,r)=>s+r.days,0);
                    const wtotal=wrecs.reduce((s,r)=>s+r.days*r.rate,0);
                    const allDates=wrecs.flatMap(r=>r.dates||[r.date]);
                    return <div key={wid} style={{fontSize:12,color:"#6A6058",marginBottom:4}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span>{getWorker(wid).name} {wdays}日 × ¥{yen(wrecs[0]?.rate||0)}</span>
                        <span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(wtotal)}</span>
                      </div>
                      <div style={{fontSize:10,color:"#C0BAB0",marginTop:1}}>{allDates.slice(0,5).map(d=>fmt(d)).join(" · ")}{allDates.length>5?"…":""}</div>
                    </div>;
                  })}
                  {(cost>0||expense>0)&&<div style={{fontSize:11,color:"#C0BAB0",marginTop:4}}>材料費 ¥{yen(cost)} · 経費 ¥{yen(expense)}</div>}
                  <div style={{fontSize:11,color:"#9E9890",marginTop:6,paddingTop:6,borderTop:"1px dashed #F0EDE7"}}>
                    原価合計 ¥{yen(genka)} · 税込 ¥{yen(Math.round(genka*1.1))} · 総{days}日
                  </div>
                </div>
              </div>;
            })}
            {showJobForm&&<Card style={{marginTop:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>請求額を更新</div>
              <Inp value={jName} onChange={e=>setJName(e.target.value)} placeholder="工事名" style={{marginBottom:8}}/>
              <Inp value={jClient} onChange={e=>setJClient(e.target.value)} placeholder="元請け" style={{marginBottom:8}}/>
              <Inp type="number" value={jBilling} onChange={e=>setJBilling(e.target.value)} placeholder="請求額（円）" style={{marginBottom:8}}/>
              <select value={jStatus} onChange={e=>setJStatus(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:12}}>
                {["商談中","進行中","完了","中断"].map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveJob} variant="primary" style={{flex:1}}>更新</Btn><Btn onClick={()=>setShowJobForm(false)} variant="ghost">キャンセル</Btn></div>
            </Card>}
          </>}

          {/* ── 職人（職人ごとの集計） ── */}
          {costSubTab==="workers"&&<>
            {data.workers.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>職人がいません<br/><span style={{fontSize:11}}>記録から職人を追加すると自動で登録されます</span></div>}
            {data.workers.map(w=>{
              const recs=filteredRecords.filter(r=>r.workerId===w.id);
              const total=recs.reduce((s,r)=>s+r.days*r.rate,0);
              const days=recs.reduce((s,r)=>s+r.days,0);
              return <div key={w.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",background:"rgba(138,153,176,0.05)",borderBottom:recs.length>0?"1px solid #F0EDE7":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{w.name}</div>
                    <div style={{fontSize:11,color:"#C0BAB0"}}>基本日当 ¥{yen(w.rate)} · {days}人工</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#8A99B0"}}>¥{yen(total)}</div>
                    <button onClick={()=>{setEditWorker(w);setWName(w.name);setWRate(String(w.rate));setShowWorkerForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delWorker(w.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {recs.length>0&&<div style={{padding:"8px 14px"}}>
                  {[...new Set(recs.map(r=>r.jobId))].map(jid=>{
                    const jrecs=recs.filter(r=>r.jobId===jid);
                    return <div key={jid} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #F5F3EF",fontSize:12,color:"#4A4740"}}>
                      <span>{getJob(jid).name} {jrecs.reduce((s,r)=>s+r.days,0)}日</span>
                      <span style={{color:"#8A99B0",fontWeight:600}}>¥{yen(jrecs.reduce((s,r)=>s+r.days*r.rate,0))}</span>
                    </div>;
                  })}
                </div>}
              </div>;
            })}
            {showWorkerForm&&<Card style={{marginTop:12}} className="fade">
              <Inp value={wName} onChange={e=>setWName(e.target.value)} placeholder="名前" style={{marginBottom:8}}/>
              <Inp type="number" value={wRate} onChange={e=>setWRate(e.target.value)} placeholder="基本日当（円）" style={{marginBottom:12}}/>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveWorker} variant="primary" style={{flex:1}}>{editWorker?"更新":"追加"}</Btn><Btn onClick={()=>{setShowWorkerForm(false);setEditWorker(null);}} variant="ghost">キャンセル</Btn></div>
            </Card>}
          </>}

          {/* ── 集計（元請けごと） ── */}
          {costSubTab==="summary"&&<>
            {clientSummary.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
            {/* 合計請求額 */}
            {clientSummary.length>0&&(()=>{
              const totalBilling=data.jobs.filter(j=>{
                const recs=filteredRecords.filter(r=>r.jobId===j.id);
                return recs.length>0;
              }).reduce((s,j)=>s+(j.billing||0),0);
              const totalGenka=filteredRecords.reduce((s,r)=>s+r.days*r.rate+(r.cost||0)+(r.expense||0),0);
              const totalProfit=totalBilling-totalGenka;
              return <Card style={{marginBottom:16,background:"rgba(46,43,39,0.03)"}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>
                  {costMonth==="all"?"全期間":costMonth.replace("-","年")+"月"} 合計
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {[{l:"合計請求",v:totalBilling,c:"#8A99B0"},{l:"合計原価",v:totalGenka,c:"#C49A5A"},{l:"合計粗利",v:totalProfit,c:totalProfit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                      <div style={{fontSize:18,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                      <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </Card>;
            })()}
            {clientSummary.map((c,ci)=>(
              <div key={ci} style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>元請：{c.client}</div>
                {Object.values(c.jobs).map((jd,ji)=>{
                  const billing=jd.job.billing||0;
                  const genka=jd.labor+jd.cost+jd.expense;
                  const profit=billing-genka;
                  return <Card key={ji} style={{marginBottom:8,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{jd.job.name}</div>
                      {billing>0&&<span style={{fontSize:11,color:"#8A99B0"}}>請求 ¥{yen(billing)}</span>}
                    </div>
                    {jd.recs.map((r,ri)=>{
                      const w=getWorker(r.workerId);
                      const allDates=r.dates||[r.date];
                      return <div key={ri} style={{fontSize:12,color:"#6A6058",marginBottom:4}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span>{w.name} {r.days}日 × ¥{yen(r.rate)}</span>
                          <span style={{color:"#C49A5A"}}>¥{yen(r.days*r.rate)}</span>
                        </div>
                        <div style={{fontSize:10,color:"#C0BAB0"}}>{allDates.slice(0,5).map(d=>fmt(d)).join(" · ")}{allDates.length>5?"…":""}</div>
                      </div>;
                    })}
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F0EDE7",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                      {[{l:"人工",v:jd.labor,c:"#C49A5A"},{l:"材料",v:jd.cost,c:"#9E9890"},{l:"経費",v:jd.expense,c:"#9E9890"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                        <div key={i} style={{textAlign:"center"}}>
                          <div style={{fontSize:11,fontWeight:600,color:s.c}}>¥{yen(s.v)}</div>
                          <div style={{fontSize:9,color:"#C0BAB0"}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </Card>;
                })}
                {(()=>{
                  const clientBilling=Object.values(c.jobs).reduce((s,jd)=>s+(jd.job.billing||0),0);
                  const clientGenka=c.labor+c.cost+c.expense;
                  return <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8A8070",padding:"4px 4px"}}>
                    <span>{c.client} 小計</span>
                    <span>請求 ¥{yen(clientBilling)} / 粗利 <span style={{fontWeight:700,color:clientBilling-clientGenka>=0?"#7CA37A":"#E07070"}}>¥{yen(clientBilling-clientGenka)}</span></span>
                  </div>;
                })()}
              </div>
            ))}
          </>}
        </>}

        {/* ── 目標 TAB ── */}
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
              <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#8A99B0"}}><div style={{width:10,height:2,background:"#8A99B0",borderRadius:1}}/>売上</div>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7CA37A"}}><div style={{width:10,height:2,background:"#7CA37A",borderRadius:1}}/>粗利</div>
              </div>
              <LineChart data={chartData}/>
            </div>
          </Card>

          {/* Forecast */}
          <Label>来月以降の売上予定（6ヶ月）</Label>
          <Card style={{marginBottom:12}}>
            {showFC&&<div className="fade" style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #F0EDE7"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{editFC?"予定を編集":"予定を追加"}</div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>月</div>
                <select value={fcMonth} onChange={e=>setFcMonth(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit"}}>
                  <option value="">選択してください</option>
                  {forecastMonths.map(m=><option key={m} value={m}>{m.replace("-","年")}月</option>)}
                </select>
              </div>
              <Inp value={fcName} onChange={e=>setFcName(e.target.value)} placeholder="案件名" style={{marginBottom:8}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>売上予定（円）</div><Inp type="number" value={fcBilling} onChange={e=>setFcBilling(e.target.value)} placeholder="0"/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>粗利予定（円）</div><Inp type="number" value={fcProfit} onChange={e=>setFcProfit(e.target.value)} placeholder="0"/></div>
              </div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveForecast} variant="primary" style={{flex:1}}>{editFC?"更新":"追加"}</Btn><Btn onClick={()=>{setShowFC(false);setEditFC(null);}} variant="ghost">キャンセル</Btn></div>
            </div>}
            {!showFC&&<button onClick={()=>{setShowFC(true);setEditFC(null);setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");}} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 予定を追加</button>}
            {forecastMonths.map(m=>{
              const items=(data.forecast||[]).filter(f=>f.month===m);
              const totalB=items.reduce((s,f)=>s+f.billing,0);
              const totalP=items.reduce((s,f)=>s+f.profit,0);
              if(items.length===0)return null;
              return(<div key={m} style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>{m.replace("-","年")}月</div>
                {items.map(f=>(<div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #F5F3EF"}}>
                  <div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27"}}>{f.name}</div><div style={{fontSize:11,color:"#C0BAB0"}}>売上 ¥{yen(f.billing)} / 粗利 ¥{yen(f.profit)}</div></div>
                  <button onClick={()=>{setEditFC(f);setFcMonth(f.month);setFcName(f.name);setFcBilling(String(f.billing));setFcProfit(String(f.profit));setShowFC(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                  <button onClick={()=>delForecast(f.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:16,cursor:"pointer"}}>x</button>
                </div>))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8A8070",padding:"6px 0"}}>
                  <span>小計</span><span>売上 ¥{yen(totalB)} / 粗利 ¥{yen(totalP)}</span>
                </div>
              </div>);
            })}
            {(data.forecast||[]).length>0&&<div style={{paddingTop:10,borderTop:"1px solid #F0EDE7"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,color:"#2E2B27"}}>
                <span>6ヶ月合計（予定）</span>
                <span>¥{yen((data.forecast||[]).reduce((s,f)=>s+f.profit,0))}</span>
              </div>
              <div style={{fontSize:11,color:"#C0BAB0",textAlign:"right",marginTop:2}}>粗利合計</div>
            </div>}
          </Card>

          {/* Study */}
          <Label>一級施工管理技士</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #F0EDE7"}}>
              <div style={{fontSize:32}}>🔥</div>
              <div><div style={{fontSize:22,fontWeight:700,color:"#C06040"}}>{streak}<span style={{fontSize:13,fontWeight:400,color:"#C0BAB0"}}> 日連続</span></div><div style={{fontSize:12,color:"#C8C3BA"}}>累計 {totalH.toFixed(1)}h</div></div>
            </div>
            <StudyCalendar sessions={data.sessions}/>
            <div style={{height:12}}/>
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

          {/* Quiz progress */}
          <Label>過去問進捗（全540問）</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
              <span style={{fontSize:22,fontWeight:700,color:"#8A99B0"}}>{quizDone}</span>
              <span style={{fontSize:12,color:"#C0BAB0"}}>/ {QUIZ_TOTAL}問</span>
              <span style={{fontSize:12,color:"#7CA37A",marginLeft:"auto"}}>{quizPct.toFixed(1)}%</span>
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:8,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:quizPct+"%",background:"linear-gradient(90deg,#8A99B0,#7CA37A)",borderRadius:6,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>学習範囲を追加</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>開始問番号</div><Inp type="number" value={quizFrom} onChange={e=>setQuizFrom(e.target.value)} placeholder="1"/></div>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>終了問番号</div><Inp type="number" value={quizTo} onChange={e=>setQuizTo(e.target.value)} placeholder="30"/></div>
            </div>
            <Btn onClick={addQuiz} variant="primary" style={{width:"100%"}}>追加</Btn>
            {(data.quizProgress||[]).length>0&&<div style={{marginTop:12}}>
              {[...(data.quizProgress||[])].reverse().map(q=>(<div key={q.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F0EDE7",fontSize:12}}>
                <span style={{color:"#4A4740"}}>{q.from}〜{q.to}問目 ({q.to-q.from+1}問)</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:"#C0BAB0"}}>{q.date}</span>
                  <button onClick={()=>save({...data,quizProgress:(data.quizProgress||[]).filter(x=>x.id!==q.id)})} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
                </div>
              </div>))}
            </div>}
          </Card>
        </>}

        {/* ── PLACES TAB ── */}
        {tab==="places"&&<>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
            {["all",...new Set(data.places.map(p=>p.area||"その他").filter(Boolean))].map(a=>(<button key={a} onClick={()=>setPlaceFilter(a)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",border:placeFilter===a?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:placeFilter===a?"#2E2B27":"transparent",color:placeFilter===a?"#F7F6F3":"#A09790",flexShrink:0}}>{a==="all"?"すべて("+data.places.length+")":a}</button>))}
          </div>
          {data.places.length>0&&<Card style={{marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>{[{label:"合計",val:data.places.length+"件",color:"#7CA37A"},{label:"エリア",val:new Set(data.places.map(p=>p.area||"?")).size+"箇所",color:"#8A99B0"},{label:"今月",val:data.places.filter(p=>mKey(p.date)===mk).length+"件",color:"#C49A5A"}].map((s,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}><div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div></div>))}</div></Card>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>場所の記録がまだありません</div>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(item=>(<div key={item.id} className="row" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:8,overflow:"hidden"}}><img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+item.lat+","+item.lon+"&zoom=14&size=460x100&markers="+item.lat+","+item.lon+",red"} alt="" style={{width:"100%",height:90,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:item.memo?5:0}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>📍 {item.name}</div>{item.area&&<div style={{fontSize:11,color:"#C0BAB0"}}>{item.area}</div>}</div><span style={{fontSize:11,color:"#CCC7BE",flexShrink:0}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></div>))}
        </>}

        {/* ── AI TAB ── */}
        {tab==="ai"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:8}}>全ての記録（気づき・仕事・読書）からキーワードとテーマを抽出し、ロジックツリーで可視化します。</div>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:12}}>
              気づき {data.posts.filter(p=>p.mode==="hobby").length}件 · 仕事 {data.posts.filter(p=>p.mode==="work").length}件 · 読書 {data.books.length}件 が対象
            </div>
            {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={runAI} variant="primary" style={{flex:1,opacity:aiLoading?0.6:1}}>{aiLoading?"分析中…":"ロジックツリーを生成"}</Btn>
              <Btn onClick={runAIText} variant="secondary" style={{flex:1,opacity:aiLoading?0.6:1}}>{aiLoading?"…":"テキスト分析"}</Btn>
            </div>
          </Card>
          {aiTree&&<Card className="fade" style={{padding:"12px",overflowX:"auto"}}>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8,letterSpacing:"0.08em"}}>ロジックツリー</div>
            <div dangerouslySetInnerHTML={{__html:aiTree}}/>
          </Card>}
          {aiResult&&<Card className="fade">
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>テキスト分析</div>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiResult}</div>
          </Card>}
        </>}
      </div>
    </div>
  );
}

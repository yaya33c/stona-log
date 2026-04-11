import { useState, useEffect, useCallback, useRef } from "react";

// ③ データ永続化 - このキーは絶対に変更しない
const SK = "stona-log-data";
const SK_OLD = ["stona-log-v5","stona-log-v4","stona-log-v3"];
const TARGET = 3_000_000;

const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);
const yen     = n => Math.round(n||0).toLocaleString();
const parseNum = s => parseInt(String(s||"0").replace(/,/g,""))||0;

function weekRange(){
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

// ② カンマ付き数値入力
function NumInp({value,onChange,placeholder,style={}}){
  const raw = String(value||"").replace(/,/g,"");
  const display = raw&&!isNaN(raw) ? Number(raw).toLocaleString() : raw;
  return <input type="text" inputMode="numeric" value={display} placeholder={placeholder}
    onChange={e=>{const v=e.target.value.replace(/,/g,""); if(v===""||/^\d+$/.test(v)) onChange({target:{value:v}});}}
    style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none",...style}}/>;
}

function StudyCalendar({sessions}){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const startOffset=firstDay===0?6:firstDay-1;
  const dayMap={};
  sessions.forEach(s=>{
    const d=new Date(s.date);
    if(d.getFullYear()===year&&d.getMonth()===month){dayMap[d.getDate()]=(dayMap[d.getDate()]||0)+s.minutes;}
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
        {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const min=dayMap[d]||0;
          const isToday=d===todayD;
          return <div key={d} title={min?`${d}日 ${Math.floor(min/60)}h${min%60?min%60+"m":""}`:""} style={{aspectRatio:"1",borderRadius:3,background:getColor(min),display:"flex",alignItems:"center",justifyContent:"center",outline:isToday?"2px solid #2E2B27":"none",outlineOffset:1}}>
            <span style={{fontSize:7,color:min>60?"#fff":"#9E9890",fontWeight:min?600:400}}>{d}</span>
          </div>;
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

function LineChart({data}){
  if(!data||data.length<2)return <div style={{textAlign:"center",padding:"20px 0",color:"#CCC7BE",fontSize:12}}>データなし</div>;
  const W=320,H=130,PL=8,PR=8,PT=22,PB=18;
  const vals=[...data.map(d=>d.billing),...data.map(d=>d.profit),0];
  const maxV=Math.max(...vals,1),minV=Math.min(...vals,0),range=maxV-minV||1;
  const xStep=(W-PL-PR)/(data.length-1||1);
  const yScale=v=>PT+(H-PT-PB)*(1-(v-minV)/range);
  const toPath=arr=>arr.map((d,i)=>(i===0?"M":"L")+(PL+i*xStep).toFixed(1)+","+yScale(d).toFixed(1)).join(" ");
  const fmtM=v=>v>=10000?Math.round(v/10000)+"万":v>0?Math.round(v/1000)+"千":"0";
  return(
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:H}}>
      <line x1={PL} y1={yScale(0)} x2={W-PR} y2={yScale(0)} stroke="#E8E4DC" strokeWidth="1" strokeDasharray="2,2"/>
      <path d={toPath(data.map(d=>d.billing))} fill="none" stroke="#8A99B0" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d={toPath(data.map(d=>d.profit))} fill="none" stroke="#7CA37A" strokeWidth="1.5" strokeLinejoin="round"/>
      {data.map((d,i)=>{
        const bx=(PL+i*xStep).toFixed(1), by=yScale(d.billing).toFixed(1);
        const px=(PL+i*xStep).toFixed(1), py=yScale(d.profit).toFixed(1);
        return <g key={i}>
          <circle cx={bx} cy={by} r="3" fill="#8A99B0"/>
          {d.billing>0&&<text x={bx} y={Number(by)-5} textAnchor="middle" fontSize="7" fill="#8A99B0">{fmtM(d.billing)}</text>}
          <circle cx={px} cy={py} r="3" fill="#7CA37A"/>
          {d.profit!==0&&<text x={px} y={Number(py)-5} textAnchor="middle" fontSize="7" fill="#7CA37A">{fmtM(d.profit)}</text>}
          <text x={bx} y={H-2} textAnchor="middle" fontSize="8" fill="#C8C3BA">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}
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
          const dayStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
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

const INITIAL={
  posts:[],sessions:[],books:[],places:[],
  goal:{examDate:"",targetHours:400},
  invoices:[],
  forecast:[],quizProgress:[],
};

const Inp=({value,onChange,placeholder,type="text",style={}})=>(
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none",...style}}/>
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
const Label=({children})=><div style={{fontSize:11,color:"#C0BAB0",letterSpacing:"0.1em",marginBottom:8}}>{children}</div>;

// ① 元請け・案件選択コンポーネント（作業員と同じ仕様）
function HistorySelector({label,value,onChange,history,placeholder}){
  const [showInput,setShowInput]=useState(!history.includes(value)&&value==="");
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
        {history.map(h=>(
          <button key={h} onClick={()=>{onChange(h);setShowInput(false);}}
            style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",
              border:value===h?"1.5px solid #2E2B27":"1px solid #E2DDD5",
              background:value===h?"#2E2B27":"transparent",
              color:value===h?"#F7F6F3":"#6E6A63"}}>{h}</button>
        ))}
        <button onClick={()=>{onChange("");setShowInput(true);}}
          style={{padding:"5px 12px",fontSize:12,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:"1.5px dashed #DDD8D0",background:"transparent",color:"#C0BAB0"}}>
          ＋ 新規
        </button>
      </div>
      {(showInput||(!history.includes(value)&&value!==""))&&(
        <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",background:"#F4F2EE",border:`1px solid ${value?"#2E2B27":"#E8E4DC"}`,borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none"}}/>
      )}
      {value&&history.includes(value)&&(
        <div style={{fontSize:11,color:"#7CA37A",marginTop:3}}>✓ {value}</div>
      )}
    </div>
  );
}

// カレンダー（複数日選択）
function MultiDatePicker({selectedDates,onChange}){
  const [calMonth,setCalMonth]=useState(new Date());
  const y=calMonth.getFullYear(),m=calMonth.getMonth();
  const dim=new Date(y,m+1,0).getDate();
  const fd=new Date(y,m,1).getDay();
  const offset=fd===0?6:fd-1;
  const cells=[];
  for(let i=0;i<offset;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);
  const today=isoDay(new Date());
  return(
    <div style={{background:"#F4F2EE",borderRadius:10,padding:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button onClick={()=>setCalMonth(d=>{const n=new Date(d);n.setMonth(n.getMonth()-1);return n;})} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#6E6A63",padding:"0 4px"}}>‹</button>
        <span style={{fontSize:12,color:"#4A4740",fontWeight:600}}>{y}年{m+1}月</span>
        <button onClick={()=>setCalMonth(d=>{const n=new Date(d);n.setMonth(n.getMonth()+1);return n;})} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#6E6A63",padding:"0 4px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:3}}>
        {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const sel=selectedDates.includes(ds);
          const isToday=ds===today;
          return <div key={d} onClick={()=>onChange(sel?selectedDates.filter(x=>x!==ds):[...selectedDates,ds].sort())}
            style={{aspectRatio:"1",borderRadius:4,background:sel?"#2E2B27":isToday?"rgba(196,154,90,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <span style={{fontSize:9,color:sel?"#fff":isToday?"#C49A5A":"#4A4740",fontWeight:sel||isToday?600:400}}>{d}</span>
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
  const [imgUrl,setImgUrl]=useState("");
  const [extraImgUrls,setExtraImgUrls]=useState([]);

  // book
  const [bookQuery,setBookQuery]=useState("");
  const [bookResults,setBookResults]=useState([]);
  const [bookLoading,setBookLoading]=useState(false);
  const [selBook,setSelBook]=useState(null);
  const [bookMemo,setBookMemo]=useState("");

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

  // quiz
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

  // ① 原価管理 - invoice system
  const [costSubTab,setCostSubTab]=useState("records");
  const [costMonth,setCostMonth]=useState(mKey(new Date()));
  const [showInvForm,setShowInvForm]=useState(false);
  const [editInv,setEditInv]=useState(null);
  const [invClient,setInvClient]=useState("");
  const [invJob,setInvJob]=useState("");
  const [invDate,setInvDate]=useState(mKey(new Date()));
  const [invLines,setInvLines]=useState([{id:1,name:"",qty:"1",unit:"日",price:"",cost:""}]);

  // ③ データ読み込み（マイグレーション付き）
  useEffect(()=>{
    try{
      let raw=localStorage.getItem(SK);
      // 旧キーからマイグレーション
      if(!raw){
        for(const k of SK_OLD){
          raw=localStorage.getItem(k);
          if(raw){localStorage.setItem(SK,raw);break;}
        }
      }
      if(raw){
        const p=JSON.parse(raw);
        setData({...INITIAL,...p,invoices:p.invoices||[]});
      }
    }catch(e){}
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
    if(minutes>0){save({...data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes,note:timerNote.trim()||"タイマー記録"},...data.sessions]});}
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
  const wkStudyH=data.sessions.filter(s=>inWeek(s.date)).reduce((s,ss)=>s+ss.minutes,0)/60;
  const wkRecords=[...data.posts,...data.books,...data.places].filter(x=>inWeek(x.date)).length;

  const invList=data.invoices||[];
  const filteredInv=costMonth==="all"?invList:invList.filter(x=>x.month===costMonth);
  const allMonths=["all",...[...new Set(invList.map(x=>x.month))].sort().reverse()];

  // ① 元請け・案件の履歴（入力済みから自動収集）
  const clientHistory=[...new Set(invList.map(x=>x.client).filter(Boolean))];
  const jobHistory=[...new Set(invList.map(x=>x.job).filter(Boolean))];

  // 月次集計
  const mkInv=invList.filter(x=>x.month===mk);
  const monthBilling=mkInv.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.price||0),0),0);
  const monthGenka=mkInv.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.cost||0),0),0);
  const monthProfit=monthBilling-monthGenka;
  const profitPct=Math.min(100,Math.max(0,(monthProfit/TARGET)*100));

  const chartData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
      const mk2=mKey(d);
      const recs=invList.filter(x=>x.month===mk2);
      const billing=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.price||0),0),0);
      const genka=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.cost||0),0),0);
      months.push({label:(d.getMonth()+1)+"月",billing,profit:billing-genka});
    }
    return months;
  })();

  const forecastMonths=(()=>{const months=[];for(let i=1;i<=6;i++){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+i);months.push(mKey(d));}return months;})();
  const quizDone=(data.quizProgress||[]).reduce((s,q)=>s+(q.to-q.from+1),0);
  const quizPct=Math.min(100,(quizDone/QUIZ_TOTAL)*100);

  const timeline=[
    ...data.posts.map(p=>({...p,_t:"post"})),
    ...data.sessions.map(s=>({...s,_t:"sess"})),
    ...data.books.map(b=>({...b,_t:"book"})),
    ...data.places.map(p=>({...p,_t:"place"})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const diaryItems=timeline.filter(x=>isoDay(x.date)===diaryDate);

  // log actions
  const postLog=()=>{
    if(mode==="hobby"){
      if(!text.trim())return;
      const images=[...extraImgUrls,imgUrl].filter(Boolean);
      save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:"hobby",place:place.trim(),text:text.trim(),images},...data.posts]});
      setText("");setPlace("");setImgUrl("");setExtraImgUrls([]);
    } else if(mode==="work"){
      if(!text.trim())return;
      save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:"work",text:text.trim()},...data.posts]});
      setText("");
    } else if(mode==="study"){
      if(!sMin)return;
      save({...data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes:parseInt(sMin,10),note:sNote.trim()},...data.sessions]});
      setSMin("");setSNote("");
    }
  };

  const searchBooks=async(retry=0)=>{
    if(!bookQuery.trim())return;
    setBookLoading(true);setBookResults([]);
    try{
      const res=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(bookQuery)}&maxResults=15`);
      if(!res.ok)throw new Error("HTTP "+res.status);
      const json=await res.json();
      const books=(json.items||[]).map(i=>({id:"gb-"+i.id,title:i.volumeInfo.title||"",authors:(i.volumeInfo.authors||[]).join(", "),thumbnail:(i.volumeInfo.imageLinks?.thumbnail||"").replace("http:","https:"),isbn:(i.volumeInfo.industryIdentifiers||[]).find(x=>x.type==="ISBN_13")?.identifier||""}));
      if(books.length===0&&retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}
      setBookResults(books.filter(b=>b.title).slice(0,12));
    }catch(e){if(retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}}
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

  // ① invoice CRUD - シンプルで確実な実装
  const resetInvForm=()=>{
    setInvClient("");setInvJob("");setInvDate(mKey(new Date()));
    setInvLines([{id:Date.now(),name:"",qty:"1",unit:"日",price:"",cost:""}]);
    setEditInv(null);setShowInvForm(false);
  };
  const addLine=()=>setInvLines(l=>[...l,{id:Date.now(),name:"",qty:"1",unit:"日",price:"",cost:""}]);
  const updLine=(id,f,v)=>setInvLines(l=>l.map(x=>x.id===id?{...x,[f]:v}:x));
  const delLine=id=>setInvLines(l=>l.filter(x=>x.id!==id));

  const saveInv=()=>{
    // バリデーション
    if(!invClient.trim()){alert("元請けを入力してください");return;}
    if(!invJob.trim()){alert("案件名を入力してください");return;}
    const validLines=invLines.filter(l=>l.name.trim()&&l.price!=="");
    if(validLines.length===0){alert("明細を1行以上入力してください");return;}

    const inv={
      id:editInv?.id||Date.now(),
      month:invDate,
      client:invClient.trim(),
      job:invJob.trim(),
      lines:validLines.map(l=>({
        id:l.id,
        name:l.name.trim(),
        qty:Number(l.qty)||1,
        unit:l.unit||"日",
        price:parseNum(l.price),
        cost:parseNum(l.cost||"0"),
      })),
    };
    const updated=editInv
      ?(invList.map(x=>x.id===editInv.id?inv:x))
      :[inv,...invList];
    save({...data,invoices:updated});
    resetInvForm();
  };
  const delInv=id=>save({...data,invoices:invList.filter(x=>x.id!==id)});
  const startEditInv=inv=>{
    setEditInv(inv);setInvClient(inv.client);setInvJob(inv.job);setInvDate(inv.month);
    setInvLines(inv.lines.map(l=>({...l,price:String(l.price),cost:String(l.cost||"")})));
    setShowInvForm(true);
  };

  // forecast / quiz
  const saveGoal=()=>{save({...data,goal:{examDate:gDate,targetHours:parseInt(gH,10)||400}});setEditG(false);};
  const saveForecast=()=>{
    if(!fcMonth||!fcName.trim())return;
    const f={id:editFC?.id||Date.now(),month:fcMonth,name:fcName.trim(),billing:parseNum(fcBilling),profit:parseNum(fcProfit)};
    save({...data,forecast:editFC?(data.forecast||[]).map(x=>x.id===editFC.id?f:x):[f,...(data.forecast||[])]});
    setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");setShowFC(false);setEditFC(null);
  };
  const delForecast=id=>save({...data,forecast:(data.forecast||[]).filter(f=>f.id!==id)});
  const addQuiz=()=>{
    const from=parseInt(quizFrom),to=parseInt(quizTo);
    if(!from||!to||from>to||from<1||to>QUIZ_TOTAL)return;
    save({...data,quizProgress:[...(data.quizProgress||[]),{id:Date.now(),from,to,date:isoDay(new Date())}]});
    setQuizFrom("");setQuizTo("");
  };

  const delPost=id=>save({...data,posts:data.posts.filter(p=>p.id!==id)});
  const delSess=id=>save({...data,sessions:data.sessions.filter(s=>s.id!==id)});
  const delBook=id=>save({...data,books:data.books.filter(b=>b.id!==id)});
  const delPlace=id=>save({...data,places:data.places.filter(p=>p.id!==id)});

  const buildAllLogs=()=>{
    const lines=[];
    data.posts.filter(p=>p.mode==="hobby").forEach(p=>lines.push("[気づき] "+p.text));
    data.posts.filter(p=>p.mode==="work").forEach(p=>lines.push("[仕事] "+p.text));
    data.books.forEach(b=>lines.push("[読書] "+b.title+(b.memo?" - "+b.memo:"")));
    return lines.join("\n");
  };

  const callClaude=async(system,userMsg,maxTokens=1000)=>{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":apiKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-opus-4-5",max_tokens:maxTokens,system,messages:[{role:"user",content:userMsg}]})
    });
    const json=await res.json();
    if(json.error)throw new Error(json.error.message||JSON.stringify(json.error));
    return json.content?.[0]?.text||"";
  };

  const runAI=async()=>{
    if(!apiKey.trim()){setAiTree("<p style='color:#E07070;font-size:13px'>設定からAPIキーを入力してください。</p>");return;}
    const logs=buildAllLogs();
    if(!logs.trim()){setAiTree("<p style='color:#C0BAB0;font-size:13px'>記録がまだありません。</p>");return;}
    setAiLoading(true);setAiTree("");setAiResult("");
    const sysPrompt="STONAの記録を分析しSVGロジックツリーを生成。中央STONA から主要テーマ3-5個、各テーマから具体キーワード2-3個。配色は背景#F4F2EE枠#C0BAB0テキスト#2E2B27。SVGのみ返す。";
    try{
      const txt=await callClaude(sysPrompt,"記録:\n\n"+logs,2000);
      const si=txt.indexOf("<svg");
      const ei=txt.lastIndexOf("</svg>");
      const svgStr=si>=0&&ei>si?txt.slice(si,ei+6):"";
      setAiTree(svgStr||"<p style='color:#C0BAB0;font-size:13px;text-align:center'>SVG生成失敗。もう一度お試しください。</p>");
    }catch(e){setAiTree("<p style='color:#E07070;font-size:13px'>エラー: "+e.message+"</p>");}
    setAiLoading(false);
  };

  const runAIText=async()=>{
    if(!apiKey.trim()){setAiResult("設定からAPIキーを入力してください。");return;}
    const logs=buildAllLogs();
    if(!logs.trim()){setAiResult("記録がまだありません。");return;}
    setAiLoading(true);setAiResult("");setAiTree("");
    try{
      const txt=await callClaude(
        "あなたはSTONA（建設業一人親方）の経営参謀です。気づき・仕事・読書の全記録から分析して簡潔な日本語で。\n\n【見えてきたテーマ】\n- 2〜3点\n\n【仕事への示唆】\n- 2〜3点\n\n【次のアクション提案】\n- 1〜2点",
        "全記録:\n\n"+logs
      );
      setAiResult(txt||"分析できませんでした。");
    }catch(e){setAiResult("エラー: "+e.message);}
    setAiLoading(false);
  };

  const runDiaryAI=async()=>{
    if(!apiKey.trim()){setDiaryAI("設定からAPIキーを入力してください。");return;}
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
      const txt=await callClaude(
        "STONAの1日の記録を読んで、その日の空気感を引き出す詩的な2〜3文を日本語で。箇条書き不要、説明的にならず。",
        `${diaryDate}の記録:\n\n${summary}`, 400
      );
      setDiaryAI(txt||"");
    }catch(e){setDiaryAI("エラー: "+e.message);}
    setDiaryLoading(false);
  };

  const ModeBtn=({k,l})=>(
    <button onClick={()=>setMode(k)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:mode===k?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:mode===k?"#2E2B27":"transparent",color:mode===k?"#F7F6F3":"#A09790",transition:"all 0.15s"}}>{l}</button>
  );

  const timerDisp=`${String(Math.floor(timerSec/3600)).padStart(2,"0")}:${String(Math.floor((timerSec%3600)/60)).padStart(2,"0")}:${String(timerSec%60).padStart(2,"0")}`;
  const css="*{box-sizing:border-box;margin:0;padding:0}input,textarea,select{font-family:inherit;outline:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E2DDD5;border-radius:2px}.fade{animation:fi 0.2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1}}.row:hover .x{opacity:1!important}textarea{resize:none}button{cursor:pointer;font-family:inherit}.hbg:hover{background:#F4F2EE!important}";

  return(
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN',YuGothic,sans-serif",background:"#F7F6F3",minHeight:"100vh",color:"#2E2B27",maxWidth:460,margin:"0 auto"}}>
      <style>{css}</style>

      {showSettings&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",background:"#fff",borderRadius:"18px 18px 0 0",padding:"24px 20px 40px",maxWidth:460,margin:"0 auto"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>設定</div>
            <div style={{fontSize:12,color:"#C0BAB0",marginBottom:16}}>AI機能のAnthropicキー</div>
            <input type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-..." style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8,marginTop:8,marginBottom:20}}>
              <Btn onClick={saveApiKey} variant="primary" style={{flex:1}}>保存</Btn>
              <Btn onClick={()=>setShowSettings(false)} variant="ghost">キャンセル</Btn>
            </div>
            <div style={{borderTop:"1px solid #F0EDE7",paddingTop:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>データエクスポート</div>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10}}>AIアナライザーで分析するためにデータをコピー</div>
              <button onClick={()=>{
                try{
                  const raw=localStorage.getItem("stona-log-data");
                  if(!raw){alert("データが見つかりません");return;}
                  if(navigator.clipboard){navigator.clipboard.writeText(raw).then(()=>alert("コピー完了！Claudeのアナライザーに貼り付けてください。")).catch(()=>prompt("全選択してコピーしてください",raw));}
                  else{prompt("全選択してコピーしてください",raw);}
                }catch(e){alert("エラー: "+e.message);}
              }} style={{width:"100%",padding:"12px",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,fontSize:13,color:"#2E2B27",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                データをコピー
              </button>
            </div>
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
          <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?"#2E2B27":"#C0BAB0",borderBottom:tab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:8,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>{l}</button>
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
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                <Inp value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="画像URL（iCloud/Drive共有リンク）" style={{flex:1,fontSize:12}}/>
                {imgUrl.trim()&&<button onClick={()=>{setExtraImgUrls(u=>[...u,imgUrl]);setImgUrl("");}} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#6E6A63",cursor:"pointer",whiteSpace:"nowrap"}}>追加</button>}
              </div>
              {[...extraImgUrls,imgUrl].filter(Boolean).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                {[...extraImgUrls,imgUrl].filter(Boolean).map((u,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={u} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #E8E4DC"}} onError={e=>{e.target.style.opacity="0.3";}}/>
                    <button onClick={()=>{if(i<extraImgUrls.length)setExtraImgUrls(a=>a.filter((_,j)=>j!==i));else setImgUrl("");}} style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#E07070",border:"none",color:"#fff",fontSize:9,cursor:"pointer"}}>x</button>
                  </div>
                ))}
              </div>}
            </div>}

            {mode==="work"&&<div className="fade">
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="今日の仕事メモ" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/>
            </div>}

            {mode==="study"&&<div className="fade">
              <div style={{background:"#F4F2EE",borderRadius:10,padding:"12px",marginBottom:10,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:700,color:"#2E2B27",letterSpacing:"0.1em",marginBottom:8,fontVariantNumeric:"tabular-nums"}}>{timerDisp}</div>
                <Inp value={timerNote} onChange={e=>setTimerNote(e.target.value)} placeholder="学習内容（任意）" style={{marginBottom:8}}/>
                <div style={{display:"flex",gap:8}}>
                  {!timerRunning
                    ?<Btn onClick={()=>setTimerRunning(true)} variant="primary" style={{flex:1}}>▶ 開始</Btn>
                    :<><Btn onClick={()=>setTimerRunning(false)} variant="secondary" style={{flex:1}}>⏸ 停止</Btn><Btn onClick={stopTimer} style={{flex:1,background:"rgba(124,163,122,0.15)",border:"1px solid rgba(124,163,122,0.3)",color:"#6A9368"}}>⏹ 終了・記録</Btn></>
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
                <div style={{display:"flex",gap:8,marginBottom:8}}><Inp value={bookQuery} onChange={e=>setBookQuery(e.target.value)} placeholder="書名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchBooks()}/><Btn onClick={()=>searchBooks()} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{bookLoading?"…":"検索"}</Btn></div>
                {bookResults.map(b=>(<div key={b.id} className="hbg" onClick={()=>setSelBook(b)} style={{display:"flex",gap:10,padding:"8px",borderRadius:9,cursor:"pointer",background:"transparent",marginBottom:4}}>{b.thumbnail?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}<div><div style={{fontSize:13,color:"#2E2B27",lineHeight:1.4}}>{b.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{b.authors}</div></div></div>))}
              </>:<>
                <div style={{display:"flex",gap:10,padding:"10px",background:"#F4F2EE",borderRadius:9,marginBottom:10,alignItems:"center"}}>{selBook.thumbnail?<img src={selBook.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#E8E4DC",borderRadius:4,flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27"}}>{selBook.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{selBook.authors}</div></div><button onClick={()=>{setSelBook(null);setBookResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button></div>
                <Inp value={bookMemo} onChange={e=>setBookMemo(e.target.value)} placeholder="一言感想（任意）"/>
              </>}
            </div>}

            {mode==="place"&&<div className="fade">
              {!selPlace?<>
                <div style={{display:"flex",gap:8,marginBottom:8}}><Inp value={placeName} onChange={e=>setPlaceName(e.target.value)} placeholder="場所名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchPlace()}/><Btn onClick={searchPlace} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{placeLoading?"…":"検索"}</Btn></div>
                {placeResults.map((p,i)=>(<div key={i} className="hbg" onClick={()=>setSelPlace(p)} style={{padding:"9px 10px",borderRadius:9,cursor:"pointer",background:"transparent",marginBottom:3}}><div style={{fontSize:13,color:"#2E2B27"}}>{p.name}</div><div style={{fontSize:11,color:"#B5AFA6",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.fullName}</div></div>))}
              </>:<>
                <div style={{background:"#F4F2EE",borderRadius:9,marginBottom:10,overflow:"hidden"}}><img src={`https://staticmap.openstreetmap.de/staticmap.php?center=${selPlace.lat},${selPlace.lon}&zoom=15&size=420x130&markers=${selPlace.lat},${selPlace.lon},red`} alt="map" style={{width:"100%",height:110,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"#2E2B27"}}>{selPlace.name}</span><button onClick={()=>{setSelPlace(null);setPlaceResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button></div></div>
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
              {item._t==="place"&&<><img src={`https://staticmap.openstreetmap.de/staticmap.php?center=${item.lat},${item.lon}&zoom=15&size=460x110&markers=${item.lat},${item.lon},red`} alt="" style={{width:"100%",height:100,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/><div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.memo?5:0}}><span style={{fontSize:12,color:"#2E2B27",fontWeight:500}}>📍 {item.name}</span><span style={{fontSize:11,color:"#CCC7BE",marginLeft:"auto"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></>}
              {item._t==="book"&&<div style={{padding:"12px 14px"}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:44,height:60,objectFit:"cover",borderRadius:5,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}/>:<div style={{width:44,height:60,background:"#F0EDE7",borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}<div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span><span style={{fontSize:11,color:"#CCC7BE"}}>{fmt(item.date)}</span><button className="x" onClick={()=>delBook(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button></div><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",lineHeight:1.4}}>{item.title}</div><div style={{fontSize:11,color:"#B5AFA6",marginBottom:item.memo?4:0}}>{item.authors}</div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div></div></div>}
              {item._t==="post"&&<div style={{padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
                  {item.mode==="hobby"&&item.place&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.place}</span>}
                  {item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}
                  {item.images&&item.images.length>0&&(
                    <div style={{marginLeft:"auto",position:"relative",width:32,height:32,cursor:"pointer"}} onClick={()=>window.open(item.images[0],"_blank")}>
                      {item.images.slice(0,2).map((u,i)=><img key={i} src={u} alt="" style={{position:"absolute",top:i*3,left:i*3,width:28,height:28,objectFit:"cover",borderRadius:5,border:"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}} onError={e=>{e.target.style.display="none";}}/>)}
                      {item.images.length>1&&<div style={{position:"absolute",bottom:-4,right:-6,background:"#8A99B0",color:"#fff",borderRadius:8,fontSize:8,padding:"1px 4px"}}>{item.images.length}</div>}
                    </div>
                  )}
                  <button className="x" onClick={()=>delPost(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",marginLeft:item.images?.length>0?"0":"auto"}}>x</button>
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
          <Label>過去の記録</Label>
          <DiaryMiniCal timeline={timeline} diaryDate={diaryDate} setDiaryDate={setDiaryDate} setDiaryAI={setDiaryAI}/>
        </>}

        {/* ── 原価管理 TAB ── */}
        {tab==="cost"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",marginBottom:10}}>
              {[
                {label:"売上",val:"¥"+yen(monthBilling),color:"#8A99B0"},
                {label:"原価",val:"¥"+yen(monthGenka),color:"#C49A5A"},
                {label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"},
                {label:"粗利率",val:monthBilling>0?Math.round((monthProfit/monthBilling)*100)+"%":"—",color:"#8A99B0"},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 2px",borderRight:i<3?"1px solid #F0EDE7":"none"}}>
                  <div style={{fontSize:13,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                  <div style={{fontSize:9,color:"#C0BAB0"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden"}}>
              <div style={{height:"100%",width:profitPct+"%",background:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:11,color:"#C8C3BA",marginTop:6,textAlign:"center"}}>目標 ¥3,000,000 まで ¥{yen(Math.max(0,TARGET-monthProfit))}</div>
          </Card>

          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:2}}>
            {allMonths.map(m=>(
              <button key={m} onClick={()=>setCostMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0,border:costMonth===m?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:costMonth===m?"#2E2B27":"transparent",color:costMonth===m?"#F7F6F3":"#A09790"}}>
                {m==="all"?"全期間":m.replace("-","年")+"月"}
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:16,borderBottom:"1px solid #E8E4DC",marginBottom:12}}>
            {[["records","記録"],["jobs","工事別"],["summary","集計"]].map(([k,l])=>(
              <button key={k} onClick={()=>setCostSubTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:costSubTab===k?600:400,color:costSubTab===k?"#2E2B27":"#C0BAB0",borderBottom:costSubTab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:6,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>

          {/* 記録 */}
          {costSubTab==="records"&&<>
            {showInvForm&&<Card style={{marginBottom:12}} className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>{editInv?"記録を編集":"記録を追加"}</div>

              {/* 対象月 */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>対象月</div>
                <input type="month" value={invDate} onChange={e=>setInvDate(e.target.value)}
                  style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none"}}/>
              </div>

              {/* ① 元請け - 作業員と同じボタン選択方式 */}
              <HistorySelector
                label="① 元請け"
                value={invClient}
                onChange={setInvClient}
                history={clientHistory}
                placeholder="元請け名を入力"
              />

              {/* ① 案件 - 作業員と同じボタン選択方式 */}
              <HistorySelector
                label="② 案件（工事）"
                value={invJob}
                onChange={setInvJob}
                history={jobHistory}
                placeholder="工事名を入力"
              />

              {/* ② 明細（見積書スタイル） */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>③ 明細</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 40px 32px 72px 72px 22px",gap:3,marginBottom:4,paddingBottom:4,borderBottom:"1px solid #F0EDE7"}}>
                  {["工事名","数量","単位","単価","原価",""].map((h,i)=>(
                    <div key={i} style={{fontSize:9,color:"#C0BAB0",textAlign:i>=3?"right":"left",paddingLeft:i===0?2:0}}>{h}</div>
                  ))}
                </div>
                {invLines.map((line)=>{
                  const total=Number(line.qty||0)*parseNum(line.price);
                  const genka=Number(line.qty||0)*parseNum(line.cost||"0");
                  const margin=total-genka;
                  return(
                    <div key={line.id} style={{marginBottom:8}}>
                      {/* 請求行 */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 40px 32px 72px 72px 22px",gap:3,marginBottom:2}}>
                        <input value={line.name} onChange={e=>updLine(line.id,"name",e.target.value)} placeholder="作業名"
                          style={{background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:6,padding:"7px 6px",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none"}}/>
                        <input value={line.qty} onChange={e=>updLine(line.id,"qty",e.target.value)} type="number" min="0"
                          style={{background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:6,padding:"7px 3px",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",textAlign:"right"}}/>
                        <select value={line.unit} onChange={e=>updLine(line.id,"unit",e.target.value)}
                          style={{background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:6,padding:"7px 2px",fontSize:11,color:"#2E2B27",fontFamily:"inherit",outline:"none"}}>
                          {["日","人工","式","m","m2","個","本","枚"].map(u=><option key={u}>{u}</option>)}
                        </select>
                        <NumInp value={line.price} onChange={e=>updLine(line.id,"price",e.target.value)} placeholder="単価"
                          style={{padding:"7px 5px",fontSize:12,textAlign:"right"}}/>
                        <div style={{background:"#F0EDE7",borderRadius:6,padding:"7px 5px",fontSize:12,color:"#8A8070",textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                          {total>0?yen(total):"-"}
                        </div>
                        <button onClick={()=>delLine(line.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
                      </div>
                      {/* 原価行 */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 40px 32px 72px 72px 22px",gap:3}}>
                        <div style={{background:"#F8F7F4",borderRadius:5,padding:"5px 6px",fontSize:10,color:"#B0AAA0",display:"flex",alignItems:"center"}}>（原価）</div>
                        <div style={{background:"#F8F7F4",borderRadius:5,padding:"5px 3px",fontSize:10,color:"#B0AAA0",textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end"}}>{line.qty}</div>
                        <div style={{background:"#F8F7F4",borderRadius:5,padding:"5px 2px",fontSize:10,color:"#B0AAA0",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{line.unit}</div>
                        <NumInp value={line.cost||""} onChange={e=>updLine(line.id,"cost",e.target.value)} placeholder="原価"
                          style={{padding:"5px 5px",fontSize:11,textAlign:"right",background:"rgba(196,154,90,0.06)",border:"1px solid rgba(196,154,90,0.2)"}}/>
                        <div style={{background:"#F8F7F4",borderRadius:5,padding:"5px 5px",fontSize:11,color:margin>0?"#7CA37A":margin<0?"#E07070":"#C0BAB0",fontWeight:margin!==0?600:400,textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                          {total>0?yen(margin):"-"}
                        </div>
                        <div/>
                      </div>
                    </div>
                  );
                })}
                <button onClick={addLine} style={{width:"100%",padding:"8px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:12,cursor:"pointer",fontFamily:"inherit",marginTop:2}}>＋ 行を追加</button>
              </div>

              {/* 合計プレビュー */}
              {invLines.some(l=>l.price)&&(()=>{
                const totalB=invLines.reduce((s,l)=>s+Number(l.qty||0)*parseNum(l.price),0);
                const totalC=invLines.reduce((s,l)=>s+Number(l.qty||0)*parseNum(l.cost||"0"),0);
                const profit=totalB-totalC;
                return(
                  <div style={{background:"#F4F2EE",borderRadius:9,padding:"10px 12px",marginBottom:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:6}}>
                      {[{l:"請求合計",v:totalB,c:"#8A99B0"},{l:"原価合計",v:totalC,c:"#C49A5A"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                        <div key={i} style={{textAlign:"center"}}>
                          <div style={{fontSize:13,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                          <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:"#C0BAB0",textAlign:"right"}}>税込（10%）¥{yen(Math.round(totalB*1.1))}</div>
                  </div>
                );
              })()}

              <div style={{display:"flex",gap:8}}>
                <Btn onClick={saveInv} variant="primary" style={{flex:1}}>{editInv?"更新":"保存"}</Btn>
                <Btn onClick={resetInvForm} variant="ghost">キャンセル</Btn>
              </div>
            </Card>}

            {!showInvForm&&<button onClick={()=>setShowInvForm(true)} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 記録を追加</button>}

            {filteredInv.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
            {filteredInv.map(inv=>{
              const totalB=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.price||0),0);
              const totalC=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.cost||0),0);
              const profit=totalB-totalC;
              return(
                <div key={inv.id} className="row" style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",background:"rgba(196,154,90,0.04)",borderBottom:"1px solid #F0EDE7",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{inv.job}</div>
                      <div style={{fontSize:11,color:"#C0BAB0"}}>{inv.client} · {inv.month.replace("-","年")}月</div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#8A99B0"}}>¥{yen(totalB)}</div>
                        <div style={{fontSize:10,color:profit>=0?"#7CA37A":"#E07070"}}>粗利 ¥{yen(profit)}</div>
                      </div>
                      <button onClick={()=>startEditInv(inv)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                      <button className="x" onClick={()=>delInv(inv.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>
                    </div>
                  </div>
                  <div style={{padding:"8px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 36px 28px 56px 56px 56px",gap:4,marginBottom:4}}>
                      {["工事名","数量","単位","単価","合計","粗利"].map((h,i)=>(
                        <div key={i} style={{fontSize:9,color:"#C0BAB0",textAlign:i>=3?"right":"left"}}>{h}</div>
                      ))}
                    </div>
                    {inv.lines.map((l,li)=>{
                      const tot=Number(l.qty||0)*Number(l.price||0);
                      const gen=Number(l.qty||0)*Number(l.cost||0);
                      return(
                        <div key={li} style={{marginBottom:6}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 36px 28px 56px 56px 56px",gap:4}}>
                            <div style={{fontSize:12,color:"#2E2B27"}}>{l.name}</div>
                            <div style={{fontSize:12,color:"#6A6058",textAlign:"right"}}>{l.qty}</div>
                            <div style={{fontSize:11,color:"#9E9890",textAlign:"center"}}>{l.unit}</div>
                            <div style={{fontSize:12,color:"#6A6058",textAlign:"right"}}>{yen(l.price)}</div>
                            <div style={{fontSize:12,color:"#C49A5A",fontWeight:600,textAlign:"right"}}>{yen(tot)}</div>
                            <div style={{fontSize:12,color:tot-gen>0?"#7CA37A":tot-gen<0?"#E07070":"#C0BAB0",textAlign:"right"}}>{yen(tot-gen)}</div>
                          </div>
                          {Number(l.cost)>0&&(
                            <div style={{display:"grid",gridTemplateColumns:"1fr 36px 28px 56px 56px 56px",gap:4,marginTop:1}}>
                              <div style={{fontSize:10,color:"#C0BAB0"}}>（原価）</div>
                              <div style={{fontSize:10,color:"#C0BAB0",textAlign:"right"}}>{l.qty}</div>
                              <div style={{fontSize:10,color:"#C0BAB0",textAlign:"center"}}>{l.unit}</div>
                              <div style={{fontSize:10,color:"#C0BAB0",textAlign:"right"}}>{yen(l.cost)}</div>
                              <div style={{fontSize:10,color:"#C0BAB0",textAlign:"right"}}>{yen(gen)}</div>
                              <div/>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{borderTop:"1px solid #F0EDE7",marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between",fontSize:11}}>
                      <span style={{color:"#8A8070"}}>請求 <span style={{fontWeight:700,color:"#8A99B0"}}>¥{yen(totalB)}</span></span>
                      <span style={{color:"#8A8070"}}>原価 <span style={{color:"#C49A5A"}}>¥{yen(totalC)}</span></span>
                      <span style={{color:"#8A8070"}}>粗利 <span style={{fontWeight:700,color:profit>=0?"#7CA37A":"#E07070"}}>¥{yen(profit)}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>}

          {/* 工事別集計 */}
          {costSubTab==="jobs"&&(()=>{
            const jobMap={};
            filteredInv.forEach(inv=>{
              if(!jobMap[inv.job])jobMap[inv.job]={job:inv.job,client:inv.client,billing:0,genka:0};
              jobMap[inv.job].billing+=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.price||0),0);
              jobMap[inv.job].genka+=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.cost||0),0);
            });
            const jobs=Object.values(jobMap);
            if(jobs.length===0)return <div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>;
            return jobs.map((j,ji)=>{
              const profit=j.billing-j.genka;
              return(
                <Card key={ji} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #F0EDE7"}}>
                    <div><div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{j.job}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{j.client}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#8A99B0"}}>¥{yen(j.billing)}</div><div style={{fontSize:11,color:profit>=0?"#7CA37A":"#E07070"}}>粗利 ¥{yen(profit)}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                    {[{l:"請求",v:j.billing,c:"#8A99B0"},{l:"原価",v:j.genka,c:"#C49A5A"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",borderRight:i<3?"1px solid #F0EDE7":"none"}}>
                        <div style={{fontSize:13,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                        <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            });
          })()}

          {/* 元請け別集計 */}
          {costSubTab==="summary"&&(()=>{
            const clientMap={};
            filteredInv.forEach(inv=>{
              const c=inv.client||"不明";
              if(!clientMap[c])clientMap[c]={client:c,billing:0,genka:0,jobs:{}};
              const b=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.price||0),0);
              const g=inv.lines.reduce((s,l)=>s+Number(l.qty||0)*Number(l.cost||0),0);
              clientMap[c].billing+=b;clientMap[c].genka+=g;
              if(!clientMap[c].jobs[inv.job])clientMap[c].jobs[inv.job]={billing:0,genka:0};
              clientMap[c].jobs[inv.job].billing+=b;clientMap[c].jobs[inv.job].genka+=g;
            });
            const clients=Object.values(clientMap);
            if(clients.length===0)return <div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>;
            const grandB=clients.reduce((s,c)=>s+c.billing,0);
            const grandG=clients.reduce((s,c)=>s+c.genka,0);
            const grandP=grandB-grandG;
            return(<>
              <Card style={{marginBottom:16,background:"rgba(46,43,39,0.03)"}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>{costMonth==="all"?"全期間":costMonth.replace("-","年")+"月"} 合計</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {[{l:"合計請求",v:grandB,c:"#8A99B0"},{l:"合計原価",v:grandG,c:"#C49A5A"},{l:"合計粗利",v:grandP,c:grandP>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                      <div style={{fontSize:16,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                      <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </Card>
              {clients.map((c,ci)=>{
                const cp=c.billing-c.genka;
                return(
                  <div key={ci} style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>元請：{c.client}</div>
                    {Object.entries(c.jobs).map(([jname,jd],ji)=>{
                      const jp=jd.billing-jd.genka;
                      return(
                        <Card key={ji} style={{marginBottom:6,padding:"10px 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{jname}</div>
                            <div style={{fontSize:11,color:jp>=0?"#7CA37A":"#E07070"}}>粗利 ¥{yen(jp)}</div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                            {[{l:"請求",v:jd.billing,c:"#8A99B0"},{l:"原価",v:jd.genka,c:"#C49A5A"},{l:"粗利",v:jp,c:jp>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                              <div key={i} style={{textAlign:"center",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                                <div style={{fontSize:12,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                                <div style={{fontSize:9,color:"#C0BAB0"}}>{s.l}</div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                    <div style={{textAlign:"right",fontSize:12,color:"#8A8070",padding:"2px 4px"}}>
                      {c.client} 小計：<span style={{color:"#8A99B0"}}>¥{yen(c.billing)}</span>　粗利 <span style={{fontWeight:700,color:cp>=0?"#7CA37A":"#E07070"}}>¥{yen(cp)}</span>
                    </div>
                  </div>
                );
              })}
            </>);
          })()}
        </>}

        {/* ── 目標 TAB ── */}
        {tab==="goal"&&<>
          <Label>今週のサマリー</Label>
          <Card style={{marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
              {[{label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"},{label:"学習",val:wkStudyH.toFixed(1)+"h",color:"#8A99B0"},{label:"記録",val:wkRecords+"件",color:"#7CA37A"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div>
                </div>
              ))}
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
              {[{l:"売上",v:monthBilling},{l:"原価",v:monthGenka},{l:"粗利",v:monthProfit}].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                  <div style={{fontSize:12,color:"#8A8070"}}>¥{yen(s.v)}</div>
                  <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid #F0EDE7",paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#8A99B0"}}><div style={{width:10,height:2,background:"#8A99B0",borderRadius:1}}/>売上</div>
                <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7CA37A"}}><div style={{width:10,height:2,background:"#7CA37A",borderRadius:1}}/>粗利</div>
              </div>
              <LineChart data={chartData}/>
            </div>
          </Card>

          <Label>年間サマリー（① - ⑫月）</Label>
          <Card style={{marginBottom:12}}>
            {(()=>{
              const year=new Date().getFullYear();
              const months=Array.from({length:12},(_,i)=>{
                const mk2=`${year}-${String(i+1).padStart(2,"0")}`;
                const recs=invList.filter(x=>x.month===mk2);
                const b=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.price||0),0),0);
                const g=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.cost||0),0),0);
                return {month:i+1,billing:b,genka:g,profit:b-g,rate:b>0?Math.round(((b-g)/b)*100):null};
              });
              const totalB=months.reduce((s,m)=>s+m.billing,0);
              const totalG=months.reduce((s,m)=>s+m.genka,0);
              const totalP=totalB-totalG;
              const totalRate=totalB>0?Math.round((totalP/totalB)*100):null;
              return <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:12,paddingBottom:10,borderBottom:"1px solid #F0EDE7"}}>
                  {[{l:"年間売上",v:totalB,c:"#8A99B0"},{l:"年間原価",v:totalG,c:"#C49A5A"},{l:"年間粗利",v:totalP,c:totalP>=0?"#7CA37A":"#E07070"},{l:"粗利率",v:totalRate!==null?totalRate+"%":"—",c:"#8A99B0",raw:true}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.raw?s.v:"¥"+yen(s.v)}</div>
                      <div style={{fontSize:9,color:"#C0BAB0"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr>{["月","売上","粗利","粗利率"].map(h=><th key={h} style={{textAlign:"right",color:"#C0BAB0",fontWeight:400,padding:"2px 4px",borderBottom:"1px solid #F0EDE7"}}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {months.filter(m=>m.billing>0||m.genka>0).map(m=>(
                        <tr key={m.month}>
                          <td style={{padding:"4px",color:"#6A6058",textAlign:"right"}}>{m.month}月</td>
                          <td style={{padding:"4px",color:"#8A99B0",fontWeight:600,textAlign:"right"}}>¥{yen(m.billing)}</td>
                          <td style={{padding:"4px",color:m.profit>=0?"#7CA37A":"#E07070",fontWeight:600,textAlign:"right"}}>¥{yen(m.profit)}</td>
                          <td style={{padding:"4px",color:"#8A99B0",textAlign:"right"}}>{m.rate!==null?m.rate+"%":"—"}</td>
                        </tr>
                      ))}
                      {months.every(m=>m.billing===0)&&<tr><td colSpan="4" style={{textAlign:"center",color:"#CCC7BE",padding:"16px"}}>記録がありません</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>;
            })()}
          </Card>

          <Label>年間サマリー（{new Date().getFullYear()}年）</Label>
          <Card style={{marginBottom:12}}>
            {(()=>{
              const yr=new Date().getFullYear();
              const months=Array.from({length:12},(_,i)=>{
                const mk2=yr+"-"+String(i+1).padStart(2,"0");
                const recs=invList.filter(x=>x.month===mk2);
                const b=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.price||0),0),0);
                const g=recs.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.cost||0),0),0);
                return{m:i+1,b,g,p:b-g,r:b>0?Math.round(((b-g)/b)*100):null};
              });
              const tb=months.reduce((s,m)=>s+m.b,0);
              const tg=months.reduce((s,m)=>s+m.g,0);
              const tp=tb-tg;
              const tr=tb>0?Math.round((tp/tb)*100):null;
              return <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:10,paddingBottom:10,borderBottom:"1px solid #F0EDE7"}}>
                  {[{l:"年間売上",v:"¥"+yen(tb),c:"#8A99B0"},{l:"年間原価",v:"¥"+yen(tg),c:"#C49A5A"},{l:"年間粗利",v:"¥"+yen(tp),c:tp>=0?"#7CA37A":"#E07070"},{l:"粗利率",v:tr!==null?tr+"%":"—",c:"#8A99B0"}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center",borderRight:i<3?"1px solid #F0EDE7":"none"}}>
                      <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:"#C0BAB0"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 36px",gap:4,marginBottom:4}}>
                    {["月","売上","粗利","率"].map(h=><div key={h} style={{fontSize:9,color:"#C0BAB0",textAlign:"right"}}>{h}</div>)}
                  </div>
                  {months.filter(m=>m.b>0||m.g>0).map(m=>(
                    <div key={m.m} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 36px",gap:4,padding:"4px 0",borderBottom:"1px solid #F8F7F4"}}>
                      <div style={{fontSize:11,color:"#9E9890",textAlign:"right"}}>{m.m}月</div>
                      <div style={{fontSize:11,color:"#8A99B0",fontWeight:600,textAlign:"right"}}>¥{yen(m.b)}</div>
                      <div style={{fontSize:11,color:m.p>=0?"#7CA37A":"#E07070",fontWeight:600,textAlign:"right"}}>¥{yen(m.p)}</div>
                      <div style={{fontSize:11,color:"#8A99B0",textAlign:"right"}}>{m.r!==null?m.r+"%":"—"}</div>
                    </div>
                  ))}
                  {months.every(m=>m.b===0)&&<div style={{textAlign:"center",color:"#CCC7BE",padding:"16px",fontSize:12}}>記録がありません</div>}
                </div>
              </>;
            })()}
          </Card>

          <Label>来月以降の売上予定（6ヶ月）</Label>
          <Card style={{marginBottom:12}}>
            {showFC&&<div className="fade" style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #F0EDE7"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{editFC?"予定を編集":"予定を追加"}</div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>月</div>
                <select value={fcMonth} onChange={e=>setFcMonth(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none"}}>
                  <option value="">選択</option>
                  {forecastMonths.map(m=><option key={m} value={m}>{m.replace("-","年")}月</option>)}
                </select>
              </div>
              <Inp value={fcName} onChange={e=>setFcName(e.target.value)} placeholder="案件名" style={{marginBottom:8}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>売上予定（円）</div><NumInp value={fcBilling} onChange={e=>setFcBilling(e.target.value)} placeholder="0"/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>粗利予定（円）</div><NumInp value={fcProfit} onChange={e=>setFcProfit(e.target.value)} placeholder="0"/></div>
              </div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveForecast} variant="primary" style={{flex:1}}>{editFC?"更新":"追加"}</Btn><Btn onClick={()=>{setShowFC(false);setEditFC(null);}} variant="ghost">キャンセル</Btn></div>
            </div>}
            {!showFC&&<button onClick={()=>{setShowFC(true);setEditFC(null);setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");}} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,marginBottom:(data.forecast||[]).length>0?12:0,cursor:"pointer",fontFamily:"inherit"}}>＋ 予定を追加</button>}
            {forecastMonths.map(m=>{
              const items=(data.forecast||[]).filter(f=>f.month===m);
              if(items.length===0)return null;
              const totalB=items.reduce((s,f)=>s+f.billing,0);
              const totalP=items.reduce((s,f)=>s+f.profit,0);
              return(
                <div key={m} style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>{m.replace("-","年")}月</div>
                  {items.map(f=>(
                    <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #F5F3EF"}}>
                      <div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27"}}>{f.name}</div><div style={{fontSize:11,color:"#C0BAB0"}}>売上 ¥{yen(f.billing)} / 粗利 ¥{yen(f.profit)}</div></div>
                      <button onClick={()=>{setEditFC(f);setFcMonth(f.month);setFcName(f.name);setFcBilling(String(f.billing));setFcProfit(String(f.profit));setShowFC(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                      <button onClick={()=>delForecast(f.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:16,cursor:"pointer"}}>x</button>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#8A8070",padding:"6px 0"}}>
                    <span>小計</span><span>売上 ¥{yen(totalB)} / 粗利 ¥{yen(totalP)}</span>
                  </div>
                </div>
              );
            })}
            {(data.forecast||[]).length>0&&(
              <div style={{paddingTop:10,borderTop:"1px solid #F0EDE7",display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,color:"#2E2B27"}}>
                <span>6ヶ月合計（粗利予定）</span>
                <span>¥{yen((data.forecast||[]).reduce((s,f)=>s+f.profit,0))}</span>
              </div>
            )}
          </Card>

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
            {!editG
              ? wkNeed
                ? <div style={{fontSize:12,color:"#A0998F"}}>試験まで <span style={{color:"#2E2B27",fontWeight:600}}>{dl}日</span> · 週あたり <span style={{color:"#8A99B0",fontWeight:600}}>{wkNeed}h</span> 必要</div>
                : <div style={{fontSize:12,color:"#C8C3BA"}}>試験日を設定してください</div>
              : <div className="fade">
                  <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>試験日</div><Inp type="date" value={gDate} onChange={e=>setGDate(e.target.value)}/></div>
                  <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>目標時間（h）</div><Inp type="number" value={gH} onChange={e=>setGH(e.target.value)}/></div>
                  <div style={{display:"flex",gap:8}}><Btn onClick={saveGoal} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setEditG(false)} variant="ghost">キャンセル</Btn></div>
                </div>
            }
          </Card>

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
              {[...(data.quizProgress||[])].reverse().map(q=>(
                <div key={q.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F0EDE7",fontSize:12}}>
                  <span style={{color:"#4A4740"}}>{q.from}〜{q.to}問目 ({q.to-q.from+1}問)</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:"#C0BAB0"}}>{q.date}</span>
                    <button onClick={()=>save({...data,quizProgress:(data.quizProgress||[]).filter(x=>x.id!==q.id)})} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
                  </div>
                </div>
              ))}
            </div>}
          </Card>
        </>}

        {/* ── 場所 TAB ── */}
        {tab==="places"&&<>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
            {["all",...new Set(data.places.map(p=>p.area||"その他").filter(Boolean))].map(a=>(
              <button key={a} onClick={()=>setPlaceFilter(a)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",border:placeFilter===a?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:placeFilter===a?"#2E2B27":"transparent",color:placeFilter===a?"#F7F6F3":"#A09790",flexShrink:0}}>
                {a==="all"?`すべて(${data.places.length})`:a}
              </button>
            ))}
          </div>
          {data.places.length>0&&<Card style={{marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>{[{label:"合計",val:data.places.length+"件",color:"#7CA37A"},{label:"エリア",val:new Set(data.places.map(p=>p.area||"?")).size+"箇所",color:"#8A99B0"},{label:"今月",val:data.places.filter(p=>mKey(p.date)===mk).length+"件",color:"#C49A5A"}].map((s,i)=>(<div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}><div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div></div>))}</div></Card>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>場所の記録がまだありません</div>}
          {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(item=>(
            <div key={item.id} className="row" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:8,overflow:"hidden"}}>
              <img src={`https://staticmap.openstreetmap.de/staticmap.php?center=${item.lat},${item.lon}&zoom=14&size=460x100&markers=${item.lat},${item.lon},red`} alt="" style={{width:"100%",height:90,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
              <div style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:item.memo?5:0}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>📍 {item.name}</div>{item.area&&<div style={{fontSize:11,color:"#C0BAB0"}}>{item.area}</div>}</div><span style={{fontSize:11,color:"#CCC7BE",flexShrink:0}}>{fmt(item.date)}</span><button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button></div>{item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}</div>
            </div>
          ))}
        </>}

        {/* ── AI分析 TAB ── */}
        {tab==="ai"&&<>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:8}}>全記録（気づき・仕事・読書）からテーマを抽出し、ロジックツリーで可視化します。</div>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:12}}>
              気づき {data.posts.filter(p=>p.mode==="hobby").length}件 · 仕事 {data.posts.filter(p=>p.mode==="work").length}件 · 読書 {data.books.length}件
            </div>
            {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={runAI} variant="primary" style={{flex:1,opacity:aiLoading?0.6:1}}>{aiLoading?"生成中…":"ロジックツリー"}</Btn>
              <Btn onClick={runAIText} variant="secondary" style={{flex:1,opacity:aiLoading?0.6:1,background:"#F4F2EE",color:"#6E6A63",border:"none"}}>{aiLoading?"…":"テキスト分析"}</Btn>
            </div>
          </Card>
          {aiTree&&<Card className="fade" style={{padding:"12px",overflowX:"auto",marginBottom:12}}>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>ロジックツリー</div>
            <div dangerouslySetInnerHTML={{__html:aiTree}}/>
          </Card>}
          {aiResult&&<Card className="fade">
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10}}>テキスト分析</div>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiResult}</div>
          </Card>}
        </>}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";

const SK = "stona-log-v5";
const TARGET = 3_000_000;
const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);
const yen     = n => Math.round(n).toLocaleString();

function calcStreak(sessions){
  const days=[...new Set(sessions.map(s=>isoDay(s.date)))].sort().reverse();
  if(!days.length)return 0;
  let streak=0,cur=new Date();cur.setHours(0,0,0,0);
  for(const day of days){const d=new Date(day),diff=Math.round((cur-d)/86400000);if(diff>1)break;streak++;cur=d;}
  return streak;
}
function weekRange(){
  const now=new Date(),day=now.getDay();
  const mon=new Date(now);mon.setDate(now.getDate()-(day===0?6:day-1));mon.setHours(0,0,0,0);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
  return[mon,sun];
}
function inWeek(d){const[m,s]=weekRange();const t=new Date(d);return t>=m&&t<=s;}

// Study heatmap calendar
function StudyCalendar({sessions}){
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const startOffset=firstDay===0?6:firstDay-1;
  const dayMap={};
  sessions.forEach(s=>{
    const d=new Date(s.date);
    if(d.getFullYear()===year&&d.getMonth()===month){
      const k=d.getDate();dayMap[k]=(dayMap[k]||0)+s.minutes;
    }
  });
  const getColor=min=>{
    if(!min||min<=5)return"#F0EDE7";
    if(min<=30)return"#C8E6C9";
    if(min<=60)return"#81C784";
    if(min<=120)return"#4CAF50";
    return"#2E7D32";
  };
  const mSess=sessions.filter(s=>{const d=new Date(s.date);return d.getFullYear()===year&&d.getMonth()===month;});
  const mH=mSess.reduce((s,ss)=>s+ss.minutes,0)/60;
  const mDays=Object.keys(dayMap).length;
  const cells=[];
  for(let i=0;i<startOffset;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const todayD=now.getDate();
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <div style={{flex:1,textAlign:"center",background:"rgba(74,138,98,0.08)",borderRadius:9,padding:"8px 4px"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#4A8A62"}}>{mDays}<span style={{fontSize:11,color:"#C0BAB0"}}>日</span></div>
          <div style={{fontSize:10,color:"#C0BAB0"}}>今月の記録</div>
        </div>
        <div style={{flex:1,textAlign:"center",background:"rgba(138,153,176,0.08)",borderRadius:9,padding:"8px 4px"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#8A99B0"}}>{mH.toFixed(1)}<span style={{fontSize:11,color:"#C0BAB0"}}>h</span></div>
          <div style={{fontSize:10,color:"#C0BAB0"}}>今月の学習</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const min=dayMap[d]||0,isToday=d===todayD;
          return(
            <div key={d} style={{aspectRatio:"1",borderRadius:3,background:getColor(min),display:"flex",alignItems:"center",justifyContent:"center",outline:isToday?"2px solid #2E2B27":"none",outlineOffset:1}}>
              <span style={{fontSize:7,color:min>60?"#fff":"#9E9890",fontWeight:min?600:400}}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:6,justifyContent:"flex-end"}}>
        <span style={{fontSize:9,color:"#C0BAB0"}}>少</span>
        {["#F0EDE7","#C8E6C9","#81C784","#4CAF50","#2E7D32"].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:c}}/>)}
        <span style={{fontSize:9,color:"#C0BAB0"}}>多</span>
      </div>
    </div>
  );
}

// Line chart
function LineChart({data}){
  if(!data||data.length<2)return <div style={{textAlign:"center",padding:"16px 0",color:"#CCC7BE",fontSize:12}}>データがありません</div>;
  const W=300,H=90,PL=12,PR=8,PT=6,PB=18;
  const vals=[...data.map(d=>d.billing),...data.map(d=>d.profit),0];
  const maxV=Math.max(...vals,1),minV=Math.min(...vals,0),range=maxV-minV||1;
  const xStep=(W-PL-PR)/(data.length-1||1);
  const yS=v=>PT+(H-PT-PB)*(1-(v-minV)/range);
  const toPath=arr=>arr.map((d,i)=>(i===0?"M":"L")+(PL+i*xStep).toFixed(1)+","+yS(d).toFixed(1)).join(" ");
  return(
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:H}}>
      <line x1={PL} y1={yS(0)} x2={W-PR} y2={yS(0)} stroke="#E8E4DC" strokeWidth="1" strokeDasharray="2,2"/>
      <path d={toPath(data.map(d=>d.billing))} fill="none" stroke="#8A99B0" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d={toPath(data.map(d=>d.profit))} fill="none" stroke="#7CA37A" strokeWidth="1.5" strokeLinejoin="round"/>
      {data.map((d,i)=><circle key={"b"+i} cx={PL+i*xStep} cy={yS(d.billing)} r="2.5" fill="#8A99B0"/>)}
      {data.map((d,i)=><circle key={"p"+i} cx={PL+i*xStep} cy={yS(d.profit)} r="2.5" fill="#7CA37A"/>)}
      {data.map((d,i)=><text key={"l"+i} x={PL+i*xStep} y={H-3} textAnchor="middle" fontSize="8" fill="#C8C3BA">{d.label}</text>)}
    </svg>
  );
}

// Diary mini calendar
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
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"14px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {["月","火","水","木","金","土","日"].map(w=><div key={w} style={{textAlign:"center",fontSize:9,color:"#C0BAB0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const dayStr=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
          const has=recordedDays.has(dayStr),isSel=diaryDate===dayStr,isToday=d===todayD;
          return(
            <div key={d} onClick={()=>{if(has){setDiaryDate(dayStr);setDiaryAI("");}}} style={{aspectRatio:"1",borderRadius:4,background:isSel?"#2E2B27":has?"rgba(138,153,176,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:has?"pointer":"default",outline:isToday?"2px solid #E8E4DC":"none",outlineOffset:1}}>
              <span style={{fontSize:9,color:isSel?"#fff":has?"#6A7E99":"#C0BAB0",fontWeight:has?600:400}}>{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL={posts:[],sessions:[],books:[],places:[],goal:{examDate:"",targetHours:400},jobs:[],workers:[],workRecords:[],forecast:[],quizProgress:[],rival:{name:"",target:3000000},whyMemos:[],thoughtMemos:[],quizLog:[]};


const QUIZ_Q=[
  {id:1,q:"コンクリートの養生期間中に最も重要なことは何か？",a:["強度試験の実施","適切な温度と湿度の保持","型枠の早期解体","骨材の品質確認"],c:1},
  {id:2,q:"鉄筋コンクリート構造において、かぶり厚さの主な目的は？",a:["デザインの美観","鉄筋の腐食防止と耐火性確保","コスト削減","施工の容易化"],c:1},
  {id:3,q:"建設工事における「工程管理」の主な目的は？",a:["予算の削減","品質の向上","工期内完成と資源の有効活用","安全の確保"],c:2},
  {id:4,q:"次のうち、品質管理のPDCAサイクルの正しい順序は？",a:["Plan→Check→Do→Act","Do→Plan→Check→Act","Plan→Do→Check→Act","Check→Plan→Do→Act"],c:2},
  {id:5,q:"建設業法における「主任技術者」の配置が必要な工事の請負金額は？",a:["500万円以上","1000万円以上","全ての工事","3500万円以上"],c:2},
  {id:6,q:"コンクリートの「スランプ」が表すものは？",a:["強度","硬化時間","軟らかさ（流動性）","骨材の大きさ"],c:2},
  {id:7,q:"足場の設置が義務付けられる高さは地面から何m以上か？",a:["1.5m","2m","3m","5m"],c:1},
  {id:8,q:"ネットワーク工程表における「クリティカルパス」とは？",a:["最短の作業経路","余裕のない最長の作業経路","最も費用のかかる作業","最初に完了する作業"],c:1},
  {id:9,q:"建設工事の「安全管理」において、KY活動のKYが表すものは？",a:["危険予知","確認要請","緊急予防","管理要点"],c:0},
  {id:10,q:"コンクリートのWCB（水セメント比）が小さいほどどうなる？",a:["強度が低下する","施工性が向上する","強度が向上する","乾燥収縮が大きくなる"],c:2},
  {id:11,q:"建設現場における「5S活動」に含まれないものは？",a:["整理","整頓","清掃","節約"],c:3},
  {id:12,q:"杭基礎の「支持杭」と「摩擦杭」の違いとして正しいのは？",a:["支持杭は摩擦で支える","摩擦杭は硬い地盤まで到達する","支持杭は硬い地盤まで到達する","両者に違いはない"],c:2},
  {id:13,q:"「山留め工法」の主な目的は？",a:["地盤の補強","掘削時の周辺地盤崩壊防止","地下水の排水","基礎の打設"],c:1},
  {id:14,q:"建設工事における「出来形管理」とは何を管理するものか？",a:["作業員の出勤","完成した工事の寸法・形状","工事の出来映えの評価","施工スピード"],c:1},
  {id:15,q:"鉄骨工事において、高力ボルトの締め付け検査方法は？",a:["トルク法のみ","ナット回転法のみ","トルク法またはナット回転法","目視確認のみ"],c:2},
  {id:16,q:"建設業における「一式工事」に含まれるものは？",a:["電気工事","管工事","土木一式工事","塗装工事"],c:2},
  {id:17,q:"工事現場の「作業主任者」の選任が必要な作業は？",a:["高さ1m以上の足場組立","コンクリート打設","型枠支保工の組立","塗装作業"],c:2},
  {id:18,q:"「バーチャート工程表」の特徴として正しいのは？",a:["作業間の関係が明確","全体工期の把握が困難","作成が複雑","作業の遅れの影響がわかりやすい"],c:0},
  {id:19,q:"コンクリートの「中性化」が問題になる主な理由は？",a:["強度低下","鉄筋の腐食促進","ひび割れの発生","色の変化"],c:1},
  {id:20,q:"建設工事の「品質計画」に含まれる内容として適切でないものは？",a:["品質目標の設定","施工方法の明確化","工事利益の配分","検査・試験方法"],c:2},
];

function QuizCard({data,save,apiKey}){
  const today=new Date().toISOString().slice(0,10);
  const todayLog=(data.quizLog||[]).filter(q=>q.date===today);
  const todayIds=new Set(todayLog.map(q=>q.qid));
  const remaining=QUIZ_Q.filter(q=>!todayIds.has(q.id));
  const [current,setCurrent]=React.useState(null);
  const [selected,setSelected]=React.useState(null);
  const [answered,setAnswered]=React.useState(false);

  React.useEffect(()=>{
    if(remaining.length>0&&!current){
      setCurrent(remaining[Math.floor(Math.random()*remaining.length)]);
    }
  },[]);

  if(remaining.length===0&&!current){
    return(
      <div style={{background:"rgba(74,138,98,0.08)",borderRadius:12,padding:"14px",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:18,marginBottom:4}}>🎉</div>
        <div style={{fontSize:13,color:"#4A8A62",fontWeight:600}}>今日の問題は全問完了！</div>
        <div style={{fontSize:11,color:"#C0BAB0",marginTop:2}}>合計 {todayLog.filter(q=>q.correct).length}/{todayLog.length} 正解</div>
      </div>
    );
  }
  if(!current)return null;

  const answer=(idx)=>{
    if(answered)return;
    setSelected(idx);
    setAnswered(true);
    const correct=idx===current.c;
    const newLog=[...(data.quizLog||[]),{id:Date.now(),date:today,qid:current.id,correct}];
    save({...data,quizLog:newLog});
  };

  const next=()=>{
    const next=remaining.filter(q=>q.id!==current.id);
    if(next.length>0){setCurrent(next[Math.floor(Math.random()*next.length)]);}
    else{setCurrent(null);}
    setSelected(null);setAnswered(false);
  };

  const correct=todayLog.filter(q=>q.correct).length;
  const total=todayLog.length;

  return(
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"14px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:11,color:"#C0BAB0",letterSpacing:"0.08em"}}>今日の一問 📝</div>
        {total>0&&<div style={{fontSize:11,color:"#8A99B0"}}>{correct}/{total} 正解</div>}
      </div>
      <div style={{fontSize:14,color:"#2E2B27",lineHeight:1.6,marginBottom:12,fontWeight:500}}>{current.q}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {current.a.map((ans,i)=>{
          let bg="transparent",border="1px solid #E8E4DC",color="#4A4740";
          if(answered){
            if(i===current.c){bg="rgba(124,163,122,0.12)";border="1px solid #7CA37A";color="#4A8A62";}
            else if(i===selected&&selected!==current.c){bg="rgba(220,100,80,0.08)";border="1px solid #E07070";color="#C05040";}
          }
          return(
            <button key={i} onClick={()=>answer(i)} style={{textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:13,cursor:answered?"default":"pointer",fontFamily:"inherit",background:bg,border,color,transition:"all 0.15s"}}>
              {["A","B","C","D"][i]}. {ans}
            </button>
          );
        })}
      </div>
      {answered&&(
        <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:600,color:selected===current.c?"#4A8A62":"#C05040"}}>
            {selected===current.c?"✓ 正解！":"✗ 不正解"}
          </div>
          <button onClick={next} style={{fontSize:12,color:"#8A99B0",background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>次の問題 →</button>
        </div>
      )}
    </div>
  );
}

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

export default function App(){
  const [data,setData]=useState(INITIAL);
  const [tab,setTab]=useState("home");

  // home input
  const [mode,setMode]=useState("hobby");
  const [text,setText]=useState("");
  const [sMin,setSMin]=useState("");
  const [sNote,setSNote]=useState("");
  const [showMore,setShowMore]=useState(false); // 読書・場所など

  // timer
  const [timerRunning,setTimerRunning]=useState(false);
  const [timerSec,setTimerSec]=useState(0);
  const [timerNote,setTimerNote]=useState("");
  const timerRef=useRef(null);

  // sub-screens (モーダル的に使う)
  const [subScreen,setSubScreen]=useState(null); // "diary"|"places"|"ai"|"books"

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

  // diary
  const [diaryDate,setDiaryDate]=useState(isoDay(new Date()));
  const [diaryAI,setDiaryAI]=useState("");
  const [diaryLoading,setDiaryLoading]=useState(false);

  // goal
  const [editG,setEditG]=useState(false);
  const [gDate,setGDate]=useState("");
  const [gH,setGH]=useState(400);
  const [showFC,setShowFC]=useState(false);
  const [fcMonth,setFcMonth]=useState("");
  const [fcName,setFcName]=useState("");
  const [fcBilling,setFcBilling]=useState("");
  const [fcProfit,setFcProfit]=useState("");
  const [editFC,setEditFC]=useState(null);
  const [quizFrom,setQuizFrom]=useState("");
  const [quizTo,setQuizTo]=useState("");
  const QUIZ_TOTAL=540;

  // cost
  const [costSubTab,setCostSubTab]=useState("records");
  const [costMonth,setCostMonth]=useState(mKey(new Date()));
  const [showJobForm,setShowJobForm]=useState(false);
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

  // settings
  const [showSettings,setShowSettings]=useState(false);
  const [apiKey,setApiKey]=useState("");
  const [apiKeyInput,setApiKeyInput]=useState("");

  // ai
  const [aiResult,setAiResult]=useState("");
  const [aiLoading,setAiLoading]=useState(false);

  // ① quiz - useRef for stable reference
  const [quizKey,setQuizKey]=useState(0); // force remount quiz

  // ⑨ rival
  const [showRival,setShowRival]=useState(false);
  const [rivalName,setRivalName]=useState("");
  const [rivalTarget,setRivalTarget]=useState("");

  // ⑯ news
  const [newsResult,setNewsResult]=useState("");
  const [newsLoading,setNewsLoading]=useState(false);
  const [newsDate,setNewsDate]=useState("");

  // ⑱ why memo
  const [showWhy,setShowWhy]=useState(false);
  const [whyEvent,setWhyEvent]=useState("");
  const [why1,setWhy1]=useState("");
  const [why2,setWhy2]=useState("");
  const [why3,setWhy3]=useState("");

  // ㊼ thought experiment
  const [showThought,setShowThought]=useState(false);
  const [thoughtPerspective,setThoughtPerspective]=useState("");
  const [thoughtText,setThoughtText]=useState("");

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
    if(minutes>0)save({...data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes,note:timerNote.trim()||"タイマー記録"},...data.sessions]});
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

  const monthRecords=data.workRecords.filter(r=>mKey(r.date)===mk);
  const monthLabor=monthRecords.reduce((s,r)=>s+r.days*r.rate,0);
  const monthCost=monthRecords.reduce((s,r)=>s+(r.cost||0),0);
  const monthExpense=monthRecords.reduce((s,r)=>s+(r.expense||0),0);
  const monthBilling=data.jobs.filter(j=>mKey(j.createdAt)===mk).reduce((s,j)=>s+(j.billing||0),0);
  const monthProfit=monthBilling-monthLabor-monthCost-monthExpense;
  const profitPct=Math.min(100,Math.max(0,(monthProfit/TARGET)*100));

  const chartData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
      const mk2=mKey(d);
      const recs=data.workRecords.filter(r=>mKey(r.date)===mk2);
      const billing=data.jobs.filter(j=>mKey(j.createdAt)===mk2).reduce((s,j)=>s+(j.billing||0),0);
      const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
      const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
      const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
      months.push({label:(d.getMonth()+1)+"月",billing,profit:billing-labor-cost-expense});
    }
    return months;
  })();

  const forecastMonths=(()=>{
    const months=[];
    for(let i=1;i<=6;i++){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+i);months.push(mKey(d));}
    return months;
  })();

  const quizDone=(data.quizProgress||[]).reduce((s,q)=>s+(q.to-q.from+1),0);
  const quizPct=Math.min(100,(quizDone/QUIZ_TOTAL)*100);

  const filteredRecords=costMonth==="all"?data.workRecords:data.workRecords.filter(r=>mKey(r.date)===costMonth);
  const allMonths=["all",...new Set([...data.workRecords.map(r=>mKey(r.date)),...data.jobs.map(j=>mKey(j.createdAt))].filter(Boolean))].sort().reverse();
  const getJob=id=>data.jobs.find(j=>j.id===id)||{name:"不明",client:""};
  const getWorker=id=>data.workers.find(w=>w.id===id)||{name:"不明",rate:0};

  const todayItems=[
    ...data.posts.map(p=>({...p,_t:"post"})),
    ...data.sessions.map(s=>({...s,_t:"sess"})),
    ...data.books.map(b=>({...b,_t:"book"})),
    ...data.places.map(p=>({...p,_t:"place"})),
  ].filter(x=>isoDay(x.date)===isoDay(new Date())).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const allTimeline=[
    ...data.posts.map(p=>({...p,_t:"post"})),
    ...data.sessions.map(s=>({...s,_t:"sess"})),
    ...data.books.map(b=>({...b,_t:"book"})),
    ...data.places.map(p=>({...p,_t:"place"})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const diaryItems=allTimeline.filter(x=>isoDay(x.date)===diaryDate);

  // actions
  const postLog=()=>{
    if(mode==="hobby"||mode==="work"){
      if(!text.trim())return;
      save({...data,posts:[{id:Date.now(),date:new Date().toISOString(),mode,text:text.trim()},...data.posts]});
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
      const res=await fetch("https://www.googleapis.com/books/v1/volumes?q="+encodeURIComponent(bookQuery)+"&maxResults=15&orderBy=relevance");
      if(!res.ok)throw new Error("HTTP "+res.status);
      const json=await res.json();
      const books=(json.items||[]).map(i=>({id:"gb-"+i.id,title:i.volumeInfo.title||"",authors:(i.volumeInfo.authors||[]).join(", "),thumbnail:(i.volumeInfo.imageLinks?.thumbnail||i.volumeInfo.imageLinks?.smallThumbnail||"").replace("http:","https:"),isbn:(i.volumeInfo.industryIdentifiers||[]).find(x=>x.type==="ISBN_13")?.identifier||""}));
      if(books.length===0&&retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}
      const enriched=await Promise.all(books.map(async b=>{if(b.thumbnail||!b.isbn)return b;try{const r=await fetch("https://api.openbd.jp/v1/get?isbn="+b.isbn);const j=await r.json();return{...b,thumbnail:j?.[0]?.summary?.cover||""};}catch{return b;}}));
      setBookResults(enriched.filter(b=>b.title).slice(0,12));
    }catch(e){if(retry<2){await new Promise(r=>setTimeout(r,1000));setBookLoading(false);return searchBooks(retry+1);}alert("エラー: "+e.message);}
    setBookLoading(false);
  };
  const addBook=()=>{if(!selBook)return;save({...data,books:[{id:Date.now(),date:new Date().toISOString(),...selBook,memo:bookMemo.trim()},...data.books]});setSelBook(null);setBookQuery("");setBookResults([]);setBookMemo("");};

  const searchPlace=async()=>{
    if(!placeName.trim())return;
    setPlaceLoading(true);setPlaceResults([]);
    const fp=async()=>{try{const res=await fetch("https://photon.komoot.io/api/?q="+encodeURIComponent(placeName)+"&lang=ja&limit=8");const json=await res.json();return(json.features||[]).map(f=>{const p=f.properties;const parts=[p.name,p.city||p.town||p.village,p.county,p.state].filter(Boolean);return{name:p.name||parts[0]||"",fullName:parts.join(", "),area:[p.state||p.county,p.city||p.town||p.village].filter(Boolean).join(" "),lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]};}).filter(r=>r.name);}catch{return[];}};
    const fn=async()=>{try{const res=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(placeName)+"&limit=5&accept-language=ja&addressdetails=1");const json=await res.json();return json.map(p=>{const a=p.address||{};return{name:p.display_name.split(",")[0],fullName:p.display_name,area:[a.state||a.prefecture,a.city||a.town||a.village||a.suburb].filter(Boolean).join(" "),lat:parseFloat(p.lat),lon:parseFloat(p.lon)};});}catch{return[];}};
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
    if(!rJobId||!rWorkerId||!rDays)return;
    const worker=data.workers.find(w=>w.id===parseInt(rWorkerId));
    const rate=parseInt(rRate)||(worker?.rate||0);
    const r={id:editRecord?.id||Date.now(),date:rDate,jobId:parseInt(rJobId),workerId:parseInt(rWorkerId),days:parseFloat(rDays),rate,cost:parseInt(rCost)||0,expense:parseInt(rExpense)||0,note:rNote.trim()};
    save({...data,workRecords:editRecord?data.workRecords.map(x=>x.id===editRecord.id?r:x):[r,...data.workRecords]});
    setRDays("1");setRRate("");setRCost("0");setRExpense("0");setRNote("");setShowRecordForm(false);setEditRecord(null);
  };
  const delRecord=id=>save({...data,workRecords:data.workRecords.filter(r=>r.id!==id)});
  const startEditRecord=r=>{setEditRecord(r);setRJobId(String(r.jobId));setRWorkerId(String(r.workerId));setRDate(r.date);setRDays(String(r.days));setRRate(String(r.rate));setRCost(String(r.cost||0));setRExpense(String(r.expense||0));setRNote(r.note||"");setShowRecordForm(true);};
  const saveForecast=()=>{
    if(!fcMonth||!fcName.trim())return;
    const f={id:editFC?.id||Date.now(),month:fcMonth,name:fcName.trim(),billing:parseInt(fcBilling)||0,profit:parseInt(fcProfit)||0};
    save({...data,forecast:editFC?data.forecast.map(x=>x.id===editFC.id?f:x):[f,...data.forecast]});
    setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");setShowFC(false);setEditFC(null);
  };
  const delForecast=id=>save({...data,forecast:data.forecast.filter(f=>f.id!==id)});
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

  const runAI=async()=>{
    if(!apiKey){setAiResult("設定からAPIキーを入力してください。");return;}
    const memos=data.posts.filter(p=>p.mode==="work").map(p=>"["+fmt(p.date)+"] "+p.text).join("\n");
    if(!memos.trim()){setAiResult("仕事メモがまだありません。");return;}
    setAiLoading(true);setAiResult("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"あなたは建設業の一人親方STONAの経営参謀です。仕事メモから分析して簡潔な日本語で返してください。\n\n【見えてきた課題】\n- 2〜3点\n\n【次のアクション】\n- 2〜3点\n\n【営業・案件のヒント】\n- 1〜2点",messages:[{role:"user",content:"仕事メモ：\n\n"+memos}]})});
      const json=await res.json();
      setAiResult(json.content?.[0]?.text||"分析できませんでした。");
    }catch(e){setAiResult("エラー: "+e.message);}
    setAiLoading(false);
  };

  const runDiaryAI=async()=>{
    if(!apiKey){setDiaryAI("設定からAPIキーを入力してください。");return;}
    if(diaryItems.length===0){setDiaryAI("この日の記録がありません。");return;}
    setDiaryLoading(true);setDiaryAI("");
    const summary=diaryItems.map(x=>{
      if(x._t==="post")return"["+(x.mode==="work"?"仕事":"気づき")+"] "+x.text;
      if(x._t==="sess")return"[学習] "+x.minutes+"分 "+(x.note||"");
      if(x._t==="book")return"[読書] "+x.title+" "+(x.memo||"");
      if(x._t==="place")return"[場所] "+x.name+" "+(x.memo||"");
      return"";
    }).join("\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:"あなたはSTONA（一人親方・浩一）の日々の記録を読んで、その日を振り返る一文を書くアシスタントです。箇条書きや分析ではなく、その日の空気感や気づきを引き出すような、短い詩的な一文（2〜3文）を日本語で書いてください。説明的にならず、その人の内側に語りかけるように。",messages:[{role:"user",content:diaryDate+"の記録：\n\n"+summary}]})});
      const json=await res.json();
      setDiaryAI(json.content?.[0]?.text||"");
    }catch(e){setDiaryAI("エラー: "+e.message);}
    setDiaryLoading(false);
  };

  // ⑨ rival actions
  const saveRival=()=>{
    const t=parseInt(rivalTarget)||3000000;
    save({...data,rival:{name:rivalName.trim()||"ライバル",target:t}});
    setShowRival(false);
  };

  // ⑯ news action
  const runNews=async()=>{
    if(!apiKey){setNewsResult("設定からAPIキーを入力してください。");return;}
    setNewsLoading(true);setNewsResult("");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"あなたは建設業専門のニュースアナリストです。建設業界のトピックを簡潔にまとめてください。法改正・規制動向、補助金・助成金情報、業界トレンドの3カテゴリで各2〜3行で回答。情報不明は確認が必要と明記。",messages:[{role:"user",content:"今日は"+new Date().toLocaleDateString("ja-JP")+"です。建設業界の最新動向を教えてください。"}]})});
      const json=await res.json();
      setNewsResult(json.content?.[0]?.text||"情報を取得できませんでした。");
      setNewsDate(new Date().toLocaleDateString("ja-JP"));
    }catch(e){setNewsResult("エラー: "+e.message);}
    setNewsLoading(false);
  };

  // ⑱ why memo action
  const saveWhy=()=>{
    if(!whyEvent.trim())return;
    const w={id:Date.now(),date:isoDay(new Date()),event:whyEvent.trim(),why1:why1.trim(),why2:why2.trim(),why3:why3.trim()};
    save({...data,whyMemos:[w,...(data.whyMemos||[])]});
    setWhyEvent("");setWhy1("");setWhy2("");setWhy3("");setShowWhy(false);
  };

  // ㊼ thought experiment action
  const saveThought=()=>{
    if(!thoughtText.trim())return;
    const t={id:Date.now(),date:isoDay(new Date()),perspective:thoughtPerspective.trim(),text:thoughtText.trim()};
    save({...data,thoughtMemos:[t,...(data.thoughtMemos||[])]});
    setThoughtPerspective("");setThoughtText("");setShowThought(false);
  };

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

  const timerDisp=String(Math.floor(timerSec/3600)).padStart(2,"0")+":"+String(Math.floor((timerSec%3600)/60)).padStart(2,"0")+":"+String(timerSec%60).padStart(2,"0");

  const css="*{box-sizing:border-box;margin:0;padding:0}input,textarea,select{font-family:inherit;outline:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E2DDD5;border-radius:2px}.fade{animation:fi 0.2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1}}.row:hover .x{opacity:1!important}textarea{resize:none}button{cursor:pointer;font-family:inherit}";

  // モードボタン
  const ModeBtn=({k,l,emoji})=>(
    <button onClick={()=>setMode(k)} style={{flex:1,padding:"12px 4px",borderRadius:10,fontFamily:"inherit",fontSize:12,cursor:"pointer",border:"none",background:mode===k?"#2E2B27":"#F4F2EE",color:mode===k?"#F7F6F3":"#9E9890",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <span style={{fontSize:18}}>{emoji}</span>{l}
    </button>
  );

  // ログアイテム表示
  const LogItem=({item})=>(
    <div className="row fade" style={{padding:"10px 0",borderBottom:"1px solid #F0EDE7"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:item.text||item.note||item.memo?4:0}}>
        <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
        {item._t==="post"&&item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}
        {item._t==="post"&&item.mode==="hobby"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(139,168,138,0.08)",color:"#6A9368",border:"1px solid rgba(139,168,138,0.18)"}}>気づき</span>}
        {item._t==="sess"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(138,153,176,0.08)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.18)"}}>学習 {item.minutes}分</span>}
        {item._t==="book"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span>}
        {item._t==="place"&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.name}</span>}
        <button className="x" onClick={()=>{
          if(item._t==="post")delPost(item.id);
          else if(item._t==="sess")delSess(item.id);
          else if(item._t==="book")delBook(item.id);
          else if(item._t==="place")delPlace(item.id);
        }} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:16,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button>
      </div>
      {item._t==="post"&&<p style={{fontSize:14,color:"#4A4740",lineHeight:1.7,margin:0}}>{item.text}</p>}
      {item._t==="sess"&&item.note&&<p style={{fontSize:13,color:"#9E9890",lineHeight:1.6,margin:0}}>{item.note}</p>}
      {item._t==="book"&&<div style={{fontSize:13,fontWeight:500,color:"#2E2B27"}}>{item.title}{item.memo&&<span style={{fontWeight:400,color:"#6A6058"}}> — {item.memo}</span>}</div>}
      {item._t==="place"&&item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
    </div>
  );

  return(
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN',YuGothic,sans-serif",background:"#F7F6F3",minHeight:"100vh",color:"#2E2B27",maxWidth:460,margin:"0 auto"}}>
      <style>{css}</style>

      {/* Settings modal */}
      {showSettings&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
          <div style={{width:"100%",background:"#fff",borderRadius:"18px 18px 0 0",padding:"24px 20px 40px",maxWidth:460,margin:"0 auto"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>設定</div>
            <div style={{fontSize:12,color:"#C0BAB0",marginBottom:16}}>AI機能のAnthropicキー</div>
            <input type="password" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="sk-ant-..." style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={saveApiKey} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setShowSettings(false)} variant="ghost">キャンセル</Btn></div>
          </div>
        </div>
      )}

      {/* Sub-screen overlay */}
      {subScreen&&(
        <div style={{position:"fixed",inset:0,background:"#F7F6F3",zIndex:100,overflowY:"auto",maxWidth:460,margin:"0 auto"}}>
          <div style={{padding:"0 14px 100px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 0 14px",borderBottom:"1px solid #E8E4DC",marginBottom:14}}>
              <button onClick={()=>setSubScreen(null)} style={{background:"none",border:"none",fontSize:20,color:"#6E6A63",cursor:"pointer",padding:"0 4px"}}>‹</button>
              <div style={{fontSize:15,fontWeight:600}}>
                {subScreen==="diary"?"日記":subScreen==="places"?"場所":subScreen==="ai"?"AI分析":"読書を記録"}
              </div>
            </div>

            {/* 日記 */}
            {subScreen==="diary"&&<>
              <Card style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <button onClick={()=>{const d=new Date(diaryDate);d.setDate(d.getDate()-1);setDiaryDate(isoDay(d));setDiaryAI("");}} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#6E6A63"}}>‹</button>
                  <input type="date" value={diaryDate} onChange={e=>{setDiaryDate(e.target.value);setDiaryAI("");}} style={{flex:1,background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"8px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",outline:"none",textAlign:"center"}}/>
                  <button onClick={()=>{const d=new Date(diaryDate);d.setDate(d.getDate()+1);setDiaryDate(isoDay(d));setDiaryAI("");}} style={{background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#6E6A63"}}>›</button>
                </div>
                {diaryItems.length===0
                  ?<div style={{textAlign:"center",padding:"24px 0",color:"#CCC7BE",fontSize:13}}>この日の記録はありません</div>
                  :<>
                    {diaryItems.map(item=><LogItem key={item._t+"-"+item.id} item={item}/>)}
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
              <DiaryMiniCal timeline={allTimeline} diaryDate={diaryDate} setDiaryDate={setDiaryDate} setDiaryAI={setDiaryAI}/>
            </>}

            {/* 場所 */}
            {subScreen==="places"&&<>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
                {["all",...new Set(data.places.map(p=>p.area||"その他").filter(Boolean))].map(a=>(
                  <button key={a} onClick={()=>setPlaceFilter(a)} style={{padding:"5px 13px",fontSize:12,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",border:placeFilter===a?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:placeFilter===a?"#2E2B27":"transparent",color:placeFilter===a?"#F7F6F3":"#A09790",flexShrink:0}}>{a==="all"?"すべて("+data.places.length+")":a}</button>
                ))}
              </div>
              {data.places.length>0&&<Card style={{marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {[{label:"合計",val:data.places.length+"件",color:"#7CA37A"},{label:"エリア",val:new Set(data.places.map(p=>p.area||"?")).size+"箇所",color:"#8A99B0"},{label:"今月",val:data.places.filter(p=>mKey(p.date)===mk).length+"件",color:"#C49A5A"}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                      <div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                      <div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>}
              {(placeFilter==="all"?data.places:data.places.filter(p=>(p.area||"その他")===placeFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(item=>(
                <div key={item.id} className="row" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:8,overflow:"hidden"}}>
                  <img src={"https://staticmap.openstreetmap.de/staticmap.php?center="+item.lat+","+item.lon+"&zoom=14&size=460x90&markers="+item.lat+","+item.lon+",red"} alt="" style={{width:"100%",height:80,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
                  <div style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:item.memo?4:0}}>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"#2E2B27"}}>📍 {item.name}</div>{item.area&&<div style={{fontSize:11,color:"#C0BAB0"}}>{item.area}</div>}</div>
                      <span style={{fontSize:11,color:"#CCC7BE",flexShrink:0}}>{fmt(item.date)}</span>
                      <button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button>
                    </div>
                    {item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
                  </div>
                </div>
              ))}
            </>}

            {/* AI分析 */}
            {subScreen==="ai"&&<>
              <Card style={{marginBottom:12}}>
                <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:14}}>仕事メモを分析して、課題・次のアクション・営業ヒントを提案します。</div>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:12}}>仕事メモ {data.posts.filter(p=>p.mode==="work").length}件 が対象</div>
                {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
                <Btn onClick={runAI} variant="primary" style={{width:"100%",opacity:aiLoading?0.6:1}}>{aiLoading?"分析中…":"AIに分析してもらう"}</Btn>
              </Card>
              {aiResult&&<Card className="fade"><div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>分析結果</div><div style={{fontSize:13,color:"#4A4740",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiResult}</div></Card>}
            </>}

            {/* 読書 */}
            {subScreen==="books"&&<>
              <Card style={{marginBottom:12}}>
                {!selBook?<>
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <Inp value={bookQuery} onChange={e=>setBookQuery(e.target.value)} placeholder="書名で検索" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&searchBooks()}/>
                    <Btn onClick={()=>searchBooks()} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{bookLoading?"検索中…":"検索"}</Btn>
                  </div>
                  {bookResults.map(b=>(
                    <div key={b.id} onClick={()=>setSelBook(b)} style={{display:"flex",gap:10,padding:"8px",borderRadius:9,cursor:"pointer",marginBottom:4}}>
                      {b.thumbnail?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}
                      <div><div style={{fontSize:13,color:"#2E2B27",lineHeight:1.4}}>{b.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{b.authors}</div></div>
                    </div>
                  ))}
                </>:<>
                  <div style={{display:"flex",gap:10,padding:"10px",background:"#F4F2EE",borderRadius:9,marginBottom:10,alignItems:"center"}}>
                    {selBook.thumbnail?<img src={selBook.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#E8E4DC",borderRadius:4,flexShrink:0}}/>}
                    <div style={{flex:1}}><div style={{fontSize:13,color:"#2E2B27"}}>{selBook.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{selBook.authors}</div></div>
                    <button onClick={()=>{setSelBook(null);setBookResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>x</button>
                  </div>
                  <Inp value={bookMemo} onChange={e=>setBookMemo(e.target.value)} placeholder="一言感想（任意）" style={{marginBottom:12}}/>
                  <Btn onClick={()=>{addBook();setSubScreen(null);}} variant="primary" style={{width:"100%"}}>記録する</Btn>
                </>}
              </Card>
              <Label>読書履歴</Label>
              {data.books.map(b=>(
                <div key={b.id} className="row" style={{display:"flex",gap:10,padding:"10px",background:"#fff",borderRadius:10,border:"1px solid #EAE7E1",marginBottom:6,alignItems:"center"}}>
                  {b.thumbnail?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>:<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>📖</div>}
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:"#2E2B27"}}>{b.title}</div><div style={{fontSize:11,color:"#C0BAB0"}}>{fmt(b.date)}</div></div>
                  <button className="x" onClick={()=>delBook(b.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>x</button>
                </div>
              ))}
            </>}
            {/* ⑯ 建設業ニュース */}
            {subScreen==="news"&&<>
              <Card style={{marginBottom:12}}>
                <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:14}}>建設業界の法改正・補助金・トレンドをAIが要約します。</div>
                {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
                <Btn onClick={runNews} variant="primary" style={{width:"100%",opacity:newsLoading?0.6:1}}>{newsLoading?"取得中…":"最新情報を取得する"}</Btn>
                {newsDate&&<div style={{fontSize:10,color:"#C0BAB0",textAlign:"right",marginTop:6}}>{newsDate}時点</div>}
              </Card>
              {newsResult&&<Card className="fade"><div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>建設業トピック</div><div style={{fontSize:13,color:"#4A4740",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{newsResult}</div></Card>}
            </>}
          </div>
        </div>
      )}

      {/* ── HOME TAB ── */}
      {tab==="home"&&<>
        {/* Header strip */}
        <div style={{padding:"18px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.2em",color:"#C8C3BA"}}>STONA</div>
            <div style={{fontSize:11,color:"#A09790",marginTop:1}}>{new Date().toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"short"})}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{background:monthProfit>=TARGET?"rgba(124,163,122,0.12)":monthProfit<0?"rgba(220,100,80,0.09)":"rgba(196,154,90,0.09)",border:"1px solid "+(monthProfit>=TARGET?"rgba(124,163,122,0.25)":monthProfit<0?"rgba(220,100,80,0.2)":"rgba(196,154,90,0.2)"),borderRadius:20,padding:"4px 10px",fontSize:11,color:monthProfit>=TARGET?"#6A9368":monthProfit<0?"#C05040":"#A87E30"}}>
              ¥{yen(monthProfit)}
            </div>
            {streak>0&&<div style={{background:"rgba(220,100,60,0.09)",border:"1px solid rgba(220,100,60,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#C06040"}}>🔥{streak}</div>}
            <button onClick={()=>{setApiKeyInput(apiKey);setShowSettings(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18,padding:"2px 4px",cursor:"pointer"}}>⚙</button>
          </div>
        </div>

        <div style={{padding:"0 14px 100px"}}>
          {/* ① 今日の一問 */}
          <QuizCard data={data} save={save} apiKey={apiKey}/>

          {/* Quick input card */}
          <Card style={{marginBottom:14}}>
            {/* Mode selector */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <ModeBtn k="hobby" l="気づき" emoji="💡"/>
              <ModeBtn k="work" l="仕事" emoji="🔨"/>
              <ModeBtn k="study" l="学習" emoji="📖"/>
            </div>

            {/* Input area */}
            {(mode==="hobby"||mode==="work")&&(
              <div className="fade">
                <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={mode==="hobby"?"気づいたこと、感じたこと…":"今日の仕事メモ"} rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65,fontFamily:"inherit"}}/>
                <Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:8}}>記録する</Btn>
              </div>
            )}

            {mode==="study"&&(
              <div className="fade">
                {/* Timer */}
                <div style={{background:"#F4F2EE",borderRadius:10,padding:"12px",marginBottom:10,textAlign:"center"}}>
                  <div style={{fontSize:28,fontWeight:700,color:"#2E2B27",letterSpacing:"0.08em",marginBottom:8,fontVariantNumeric:"tabular-nums"}}>{timerDisp}</div>
                  <Inp value={timerNote} onChange={e=>setTimerNote(e.target.value)} placeholder="学習内容（任意）" style={{marginBottom:8}}/>
                  <div style={{display:"flex",gap:8}}>
                    {!timerRunning
                      ?<Btn onClick={()=>setTimerRunning(true)} variant="primary" style={{flex:1}}>▶ 開始</Btn>
                      :<><Btn onClick={()=>setTimerRunning(false)} style={{flex:1,background:"#F4F2EE",color:"#6E6A63",border:"none"}}>⏸ 一時停止</Btn><Btn onClick={stopTimer} style={{flex:1,background:"rgba(124,163,122,0.15)",border:"1px solid rgba(124,163,122,0.3)",color:"#6A9368"}}>⏹ 終了・記録</Btn></>
                    }
                  </div>
                  {!timerRunning&&timerSec>0&&<button onClick={()=>setTimerSec(0)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,marginTop:6,cursor:"pointer"}}>リセット</button>}
                </div>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6,textAlign:"center"}}>または手動入力</div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <Inp type="number" value={sMin} onChange={e=>setSMin(e.target.value)} placeholder="分数" style={{flex:1}}/>
                  <span style={{fontSize:13,color:"#C0BAB0",whiteSpace:"nowrap"}}>分</span>
                </div>
                <Inp value={sNote} onChange={e=>setSNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:8}}/>
                <Btn onClick={postLog} variant="primary" style={{width:"100%"}}>記録する</Btn>
              </div>
            )}
          </Card>

          {/* その他の記録ボタン */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["books","📚 読書"],["places","📍 場所"]].map(([k,l])=>(
              <button key={k} onClick={()=>setSubScreen(k)} style={{flex:1,padding:"10px",background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,fontSize:12,color:"#8A8070",cursor:"pointer",fontFamily:"inherit"}}>
                {l}を記録
              </button>
            ))}
          </div>

          {/* 今日のログ */}
          {todayItems.length>0&&<>
            <Label>今日の記録</Label>
            <Card>
              {todayItems.map(item=><LogItem key={item._t+"-"+item.id} item={item}/>)}
            </Card>
          </>}

          {todayItems.length===0&&(
            <div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>
              <div style={{fontSize:32,marginBottom:8}}>☀️</div>
              今日の記録はまだありません
            </div>
          )}

          {/* 過去ログへのリンク */}
          {allTimeline.filter(x=>isoDay(x.date)!==isoDay(new Date())).length>0&&(
            <button onClick={()=>setSubScreen("diary")} style={{width:"100%",padding:"10px",background:"transparent",border:"1px solid #E8E4DC",borderRadius:10,color:"#C0BAB0",fontSize:12,cursor:"pointer",fontFamily:"inherit",marginTop:12}}>
              過去のログを見る →
            </button>
          )}

          {/* ショートカット下部 */}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>setSubScreen("ai")} style={{flex:1,padding:"10px",background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,fontSize:12,color:"#8A8070",cursor:"pointer",fontFamily:"inherit"}}>
              🤖 AI分析
            </button>
            <button onClick={()=>setSubScreen("diary")} style={{flex:1,padding:"10px",background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,fontSize:12,color:"#8A8070",cursor:"pointer",fontFamily:"inherit"}}>
              📅 日記
            </button>
            <button onClick={()=>setSubScreen("places")} style={{flex:1,padding:"10px",background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,fontSize:12,color:"#8A8070",cursor:"pointer",fontFamily:"inherit"}}>
              🗺 場所
            </button>
          </div>
          {/* ⑯ 建設業ニュース */}
          <button onClick={()=>setSubScreen("news")} style={{width:"100%",padding:"10px",background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,fontSize:12,color:"#8A8070",cursor:"pointer",fontFamily:"inherit",marginTop:8}}>
            📰 建設業ニュース・法改正
          </button>
        </div>
      </>}

      {/* ── 原価管理 TAB ── */}
      {tab==="cost"&&<div style={{padding:"14px 14px 100px"}}>
        <div style={{padding:"4px 0 14px",fontSize:16,fontWeight:700}}>原価管理</div>

        <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:10}}>
            {[{label:"売上",val:"¥"+yen(monthBilling),color:"#8A99B0"},{label:"原価",val:"¥"+yen(monthLabor),color:"#C49A5A"},{label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
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

        {/* ㊳ 案件パイプライン */}
        <Label>案件パイプライン</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {["商談中","進行中","完了","中断"].map(status=>{
            const jobs=data.jobs.filter(j=>(j.status||"進行中")===status);
            const colors={"商談中":"#8A99B0","進行中":"#C49A5A","完了":"#7CA37A","中断":"#C0BAB0"};
            const bgs={"商談中":"rgba(138,153,176,0.08)","進行中":"rgba(196,154,90,0.08)","完了":"rgba(124,163,122,0.08)","中断":"rgba(192,186,176,0.08)"};
            return(
              <div key={status} style={{background:bgs[status],borderRadius:12,padding:"12px",border:"1px solid "+colors[status]+"33"}}>
                <div style={{fontSize:11,color:colors[status],fontWeight:600,marginBottom:6}}>{status}</div>
                {jobs.length===0
                  ?<div style={{fontSize:11,color:"#C8C3BA"}}>なし</div>
                  :jobs.map(j=><div key={j.id} style={{fontSize:12,color:"#4A4740",marginBottom:3,paddingBottom:3,borderBottom:"1px solid "+colors[status]+"22"}}>{j.name}<div style={{fontSize:10,color:"#C0BAB0"}}>{j.client}</div></div>)
                }
                <div style={{fontSize:10,color:colors[status],marginTop:4,fontWeight:600}}>{jobs.length}件</div>
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,WebkitOverflowScrolling:"touch",paddingBottom:2}}>
          {allMonths.map(m=>(
            <button key={m} onClick={()=>setCostMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0,border:costMonth===m?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:costMonth===m?"#2E2B27":"transparent",color:costMonth===m?"#F7F6F3":"#A09790"}}>
              {m==="all"?"全期間":m.replace("-","年")+"月"}
            </button>
          ))}
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
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>材料費・原価</div><Inp type="number" value={rCost} onChange={e=>setRCost(e.target.value)} placeholder="0"/></div>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>経費</div><Inp type="number" value={rExpense} onChange={e=>setRExpense(e.target.value)} placeholder="0"/></div>
            </div>
            <Inp value={rNote} onChange={e=>setRNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:10}}/>
            <div style={{display:"flex",gap:8}}><Btn onClick={saveRecord} variant="primary" style={{flex:1}}>{editRecord?"更新":"追加"}</Btn><Btn onClick={()=>{setShowRecordForm(false);setEditRecord(null);}} variant="ghost">キャンセル</Btn></div>
          </Card>}
          {!showRecordForm&&<button onClick={()=>{setShowRecordForm(true);setEditRecord(null);setRJobId("");setRWorkerId("");setRDate(isoDay(new Date()));setRDays("1");setRRate("");setRCost("0");setRExpense("0");setRNote("");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 記録を追加</button>}
          {filteredRecords.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
          {[...filteredRecords].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r=>{
            const job=getJob(r.jobId);const worker=getWorker(r.workerId);const labor=r.days*r.rate;
            return(
              <div key={r.id} className="row" style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>{job.name}</div>
                    <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>{job.client} · {fmt(r.date)}</div>
                    <div style={{fontSize:12,color:"#8A8070"}}>{worker.name} {r.days}日 × ¥{yen(r.rate)} = <span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(labor)}</span></div>
                    {(r.cost>0||r.expense>0)&&<div style={{fontSize:11,color:"#C0BAB0",marginTop:2}}>原価 ¥{yen(r.cost||0)} · 経費 ¥{yen(r.expense||0)}</div>}
                    {r.note&&<div style={{fontSize:12,color:"#9E9890",marginTop:3}}>{r.note}</div>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>startEditRecord(r)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button className="x" onClick={()=>delRecord(r.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>x</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>}

        {costSubTab==="jobs"&&<>
          {showJobForm&&<Card style={{marginBottom:12}} className="fade">
            <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editJob?"工事を編集":"工事を追加"}</div>
            <Inp value={jName} onChange={e=>setJName(e.target.value)} placeholder="工事名" style={{marginBottom:8}}/>
            <Inp value={jClient} onChange={e=>setJClient(e.target.value)} placeholder="元請け" style={{marginBottom:8}}/>
            <Inp type="number" value={jBilling} onChange={e=>setJBilling(e.target.value)} placeholder="請求額（円）" style={{marginBottom:8}}/>
            <select value={jStatus} onChange={e=>setJStatus(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:12}}>
              {["商談中","進行中","完了","中断"].map(s=><option key={s}>{s}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}><Btn onClick={saveJob} variant="primary" style={{flex:1}}>{editJob?"更新":"追加"}</Btn><Btn onClick={()=>{setShowJobForm(false);setEditJob(null);}} variant="ghost">キャンセル</Btn></div>
          </Card>}
          {!showJobForm&&<button onClick={()=>{setShowJobForm(true);setEditJob(null);setJName("");setJClient("");setJBilling("");setJStatus("進行中");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 工事を追加</button>}
          {data.jobs.map(j=>{
            const recs=filteredRecords.filter(r=>r.jobId===j.id);
            const labor=recs.reduce((s,r)=>s+r.days*r.rate,0);
            const cost=recs.reduce((s,r)=>s+(r.cost||0),0);
            const expense=recs.reduce((s,r)=>s+(r.expense||0),0);
            const days=recs.reduce((s,r)=>s+r.days,0);
            const stColor={"商談中":"#8A99B0","進行中":"#C49A5A","完了":"#7CA37A","中断":"#C0BAB0"}[j.status||"進行中"];
            return(
              <div key={j.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",borderBottom:recs.length>0?"1px solid #F0EDE7":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{j.name}</div>
                      <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:stColor+"22",color:stColor,border:"1px solid "+stColor+"44"}}>{j.status||"進行中"}</span>
                    </div>
                    <div style={{fontSize:11,color:"#C0BAB0"}}>元請：{j.client}{j.billing>0?" · 請求 ¥"+yen(j.billing):""}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#C49A5A"}}>¥{yen(labor+cost+expense)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>{days}日</div></div>
                    <button onClick={()=>{setEditJob(j);setJName(j.name);setJClient(j.client);setJBilling(String(j.billing||0));setJStatus(j.status||"進行中");setShowJobForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delJob(j.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {recs.length>0&&<div style={{padding:"8px 14px"}}>
                  {[...new Set(recs.map(r=>r.workerId))].map(wid=>{
                    const wrecs=recs.filter(r=>r.workerId===wid);
                    const wdays=wrecs.reduce((s,r)=>s+r.days,0);
                    const wtotal=wrecs.reduce((s,r)=>s+r.days*r.rate,0);
                    return(
                      <div key={wid} style={{padding:"5px 0",borderBottom:"1px solid #F5F3EF",fontSize:12,display:"flex",justifyContent:"space-between",color:"#4A4740"}}>
                        <span>{getWorker(wid).name} {wdays}日</span><span style={{color:"#C49A5A",fontWeight:600}}>¥{yen(wtotal)}</span>
                      </div>
                    );
                  })}
                  {j.billing>0&&<div style={{padding:"5px 0",fontSize:12,display:"flex",justifyContent:"space-between",color:"#8A99B0"}}><span>粗利</span><span style={{fontWeight:600}}>¥{yen(j.billing-labor-cost-expense)}</span></div>}
                </div>}
              </div>
            );
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
            return(
              <div key={w.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"11px 14px",borderBottom:recs.length>0?"1px solid #F0EDE7":"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
                    return(
                      <div key={jid} style={{padding:"5px 0",borderBottom:"1px solid #F5F3EF",fontSize:12,display:"flex",justifyContent:"space-between",color:"#4A4740"}}>
                        <span>{getJob(jid).name} {jrecs.reduce((s,r)=>s+r.days,0)}日</span><span style={{color:"#8A99B0",fontWeight:600}}>¥{yen(jrecs.reduce((s,r)=>s+r.days*r.rate,0))}</span>
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
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
                  {jd.recs.map((r,ri)=>{const w=getWorker(r.workerId);return(<div key={ri} style={{fontSize:12,color:"#6A6058",marginBottom:3}}>{w.name} {r.days}日 × ¥{yen(r.rate)} = <span style={{color:"#C49A5A"}}>¥{yen(r.days*r.rate)}</span></div>);})}
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F0EDE7",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                    {[{l:"人工",v:jd.labor,c:"#C49A5A"},{l:"原価",v:jd.cost,c:"#9E9890"},{l:"経費",v:jd.expense,c:"#9E9890"},{l:"合計",v:jd.labor+jd.cost+jd.expense,c:"#2E2B27"}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:s.c}}>¥{yen(s.v)}</div><div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div></div>
                    ))}
                  </div>
                </Card>
              ))}
              <div style={{textAlign:"right",fontSize:12,color:"#8A8070",padding:"4px"}}>{c.client} 小計：<span style={{fontWeight:700,color:"#C49A5A"}}>¥{yen(c.labor+c.cost+c.expense)}</span></div>
            </div>
          ))}
          {filteredRecords.length>0&&<Card style={{background:"rgba(196,154,90,0.08)",border:"1px solid rgba(196,154,90,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#8A7050"}}>{costMonth==="all"?"全期間":costMonth.replace("-","年")+"月"} 合計</span>
              <span style={{fontSize:20,fontWeight:700,color:"#C49A5A"}}>¥{yen(filteredRecords.reduce((s,r)=>s+r.days*r.rate+(r.cost||0)+(r.expense||0),0))}</span>
            </div>
          </Card>}
        </>}
      </div>}

      {/* ── 目標 TAB ── */}
      {tab==="goal"&&<div style={{padding:"14px 14px 100px"}}>
        <div style={{padding:"4px 0 14px",fontSize:16,fontWeight:700}}>目標</div>

        <Label>今週のサマリー</Label>
        <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
            {[{label:"粗利",val:"¥"+yen(monthProfit),color:monthProfit>=0?"#7CA37A":"#E07070"},{label:"学習",val:wkStudyH.toFixed(1)+"h",color:"#8A99B0"},{label:"ストリーク",val:streak+"日🔥",color:"#C06040"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                <div style={{fontSize:16,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
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
          <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:8}}>
            <div style={{height:"100%",width:profitPct+"%",background:monthProfit>=TARGET?"#7CA37A":monthProfit<0?"#E07070":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",marginBottom:14}}>
            {[{l:"売上",v:monthBilling},{l:"原価",v:monthLabor},{l:"原価+経費",v:monthCost+monthExpense}].map((s,i)=>(
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
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>売上予定</div><Inp type="number" value={fcBilling} onChange={e=>setFcBilling(e.target.value)} placeholder="0"/></div>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>粗利予定</div><Inp type="number" value={fcProfit} onChange={e=>setFcProfit(e.target.value)} placeholder="0"/></div>
            </div>
            <div style={{display:"flex",gap:8}}><Btn onClick={saveForecast} variant="primary" style={{flex:1}}>{editFC?"更新":"追加"}</Btn><Btn onClick={()=>{setShowFC(false);setEditFC(null);}} variant="ghost">キャンセル</Btn></div>
          </div>}
          {!showFC&&<button onClick={()=>{setShowFC(true);setEditFC(null);setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");}} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 予定を追加</button>}
          {forecastMonths.map(m=>{
            const items=(data.forecast||[]).filter(f=>f.month===m);
            if(items.length===0)return null;
            const totalB=items.reduce((s,f)=>s+f.billing,0),totalP=items.reduce((s,f)=>s+f.profit,0);
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
          {(data.forecast||[]).length>0&&<div style={{paddingTop:10,borderTop:"1px solid #F0EDE7",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#8A7050"}}>6ヶ月 粗利合計</span>
            <span style={{fontSize:16,fontWeight:700,color:"#7CA37A"}}>¥{yen((data.forecast||[]).reduce((s,f)=>s+f.profit,0))}</span>
          </div>}
        </Card>

        <Label>一級施工管理技士</Label>
        <Card style={{marginBottom:12}}>
          <div style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #F0EDE7"}}>
            <StudyCalendar sessions={data.sessions}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:22,fontWeight:700,color:"#8A99B0"}}>{totalH.toFixed(1)}</span>
              <span style={{fontSize:13,color:"#C0BAB0"}}>h / {targetHours}h</span>
            </div>
            {!editG&&<button onClick={()=>{setGDate(examDate);setGH(targetHours);setEditG(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>設定</button>}
          </div>
          <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:10}}>
            <div style={{height:"100%",width:sPct+"%",background:"#8A99B0",borderRadius:6,transition:"width 0.5s"}}/>
          </div>
          {!editG
            ?wkNeed
              ?<div style={{fontSize:12,color:"#A0998F"}}>試験まで <span style={{color:"#2E2B27",fontWeight:600}}>{dl}日</span> · 週あたり <span style={{color:"#8A99B0",fontWeight:600}}>{wkNeed}h</span> 必要</div>
              :<div style={{fontSize:12,color:"#C8C3BA"}}>試験日を設定してください</div>
            :<div className="fade">
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>試験日</div><Inp type="date" value={gDate} onChange={e=>setGDate(e.target.value)}/></div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>目標時間（h）</div><Inp type="number" value={gH} onChange={e=>setGH(e.target.value)}/></div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveGoal} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setEditG(false)} variant="ghost">キャンセル</Btn></div>
            </div>
          }
        </Card>

        <Label>過去問進捗（全540問）</Label>
        <Card>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
            <span style={{fontSize:22,fontWeight:700,color:"#8A99B0"}}>{quizDone}</span>
            <span style={{fontSize:12,color:"#C0BAB0"}}>/ {QUIZ_TOTAL}問</span>
            <span style={{fontSize:12,color:"#7CA37A",marginLeft:"auto"}}>{quizPct.toFixed(1)}%</span>
          </div>
          <div style={{background:"#F0EDE7",borderRadius:6,height:8,overflow:"hidden",marginBottom:12}}>
            <div style={{height:"100%",width:quizPct+"%",background:"linear-gradient(90deg,#8A99B0,#7CA37A)",borderRadius:6,transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>開始問番号</div><Inp type="number" value={quizFrom} onChange={e=>setQuizFrom(e.target.value)} placeholder="1"/></div>
            <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>終了問番号</div><Inp type="number" value={quizTo} onChange={e=>setQuizTo(e.target.value)} placeholder="30"/></div>
          </div>
          <Btn onClick={addQuiz} variant="primary" style={{width:"100%",marginBottom:12}}>追加</Btn>
          {(data.quizProgress||[]).length>0&&[...(data.quizProgress||[])].reverse().map(q=>(
            <div key={q.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F0EDE7",fontSize:12}}>
              <span style={{color:"#4A4740"}}>{q.from}〜{q.to}問目 ({q.to-q.from+1}問)</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:"#C0BAB0"}}>{q.date}</span>
                <button onClick={()=>save({...data,quizProgress:(data.quizProgress||[]).filter(x=>x.id!==q.id)})} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
              </div>
            </div>
          ))}
        </Card>

        {/* ⑨ ライバル設定 */}
        <Label>ライバル設定</Label>
        <Card style={{marginBottom:12}}>
          {showRival
            ?<div className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>ライバルを設定</div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>ライバルの名前</div><Inp value={rivalName} onChange={e=>setRivalName(e.target.value)} placeholder="例：田中組"/></div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>月次粗利目標（円）</div><Inp type="number" value={rivalTarget} onChange={e=>setRivalTarget(e.target.value)} placeholder="3000000"/></div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveRival} variant="primary" style={{flex:1}}>設定する</Btn><Btn onClick={()=>setShowRival(false)} variant="ghost">キャンセル</Btn></div>
            </div>
            :<>
              {data.rival&&data.rival.name
                ?<div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div><div style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{data.rival.name}</div><div style={{fontSize:11,color:"#C0BAB0"}}>目標 ¥{yen(data.rival.target)}/月</div></div>
                    <button onClick={()=>{setRivalName(data.rival.name);setRivalTarget(String(data.rival.target));setShowRival(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>変更</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                    <div style={{textAlign:"center",padding:"10px",background:"rgba(196,154,90,0.08)",borderRadius:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:"#C49A5A"}}>¥{yen(monthProfit)}</div>
                      <div style={{fontSize:10,color:"#C0BAB0"}}>あなた</div>
                    </div>
                    <div style={{textAlign:"center",padding:"10px",background:"rgba(138,153,176,0.08)",borderRadius:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:"#8A99B0"}}>¥{yen(data.rival.target)}</div>
                      <div style={{fontSize:10,color:"#C0BAB0"}}>{data.rival.name}</div>
                    </div>
                  </div>
                  {monthProfit<data.rival.target
                    ?<div style={{fontSize:12,color:"#C05040",textAlign:"center"}}>あと ¥{yen(data.rival.target-monthProfit)} で逆転！</div>
                    :<div style={{fontSize:12,color:"#4A8A62",textAlign:"center"}}>🏆 ¥{yen(monthProfit-data.rival.target)} リード中！</div>
                  }
                </div>
                :<button onClick={()=>{setRivalName("");setRivalTarget("3000000");setShowRival(true);}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>＋ ライバルを設定する</button>
              }
            </>
          }
        </Card>

        {/* ⑱ なぜ？深掘りメモ */}
        <Label>なぜ？深掘りメモ</Label>
        <Card style={{marginBottom:12}}>
          {showWhy
            ?<div className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>出来事を深掘りする</div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>出来事（うまくいった / 失敗した）</div><Inp value={whyEvent} onChange={e=>setWhyEvent(e.target.value)} placeholder="例：見積もりで値下げさせられた"/></div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>なぜ①</div><Inp value={why1} onChange={e=>setWhy1(e.target.value)} placeholder="なぜそうなった？"/></div>
              <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>なぜ②</div><Inp value={why2} onChange={e=>setWhy2(e.target.value)} placeholder="さらに、なぜ？"/></div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>なぜ③（本質）</div><Inp value={why3} onChange={e=>setWhy3(e.target.value)} placeholder="根本の原因は？"/></div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveWhy} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setShowWhy(false)} variant="ghost">キャンセル</Btn></div>
            </div>
            :<button onClick={()=>setShowWhy(true)} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>＋ 深掘りメモを追加</button>
          }
          {(data.whyMemos||[]).length>0&&(
            <div style={{marginTop:showWhy?12:0}}>
              {(data.whyMemos||[]).slice(0,3).map(w=>(
                <div key={w.id} style={{borderTop:"1px solid #F0EDE7",paddingTop:10,marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",flex:1}}>{w.event}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#C0BAB0"}}>{w.date}</span>
                      <button onClick={()=>save({...data,whyMemos:(data.whyMemos||[]).filter(x=>x.id!==w.id)})} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
                    </div>
                  </div>
                  {w.why1&&<div style={{fontSize:12,color:"#8A8070",marginBottom:3}}>① {w.why1}</div>}
                  {w.why2&&<div style={{fontSize:12,color:"#8A8070",marginBottom:3}}>② {w.why2}</div>}
                  {w.why3&&<div style={{fontSize:12,color:"#4A8A62",fontWeight:500}}>③ {w.why3}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ㊼ 思考実験メモ */}
        <Label>思考実験メモ</Label>
        <Card style={{marginBottom:12}}>
          {showThought
            ?<div className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>視点を変えて考える</div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>視点を選ぶ</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                  {["元請けの立場なら","10年後の自分なら","職人の立場なら","お客さんの立場なら","競合他社なら"].map(p=>(
                    <button key={p} onClick={()=>setThoughtPerspective(p)} style={{padding:"4px 10px",fontSize:11,borderRadius:16,cursor:"pointer",fontFamily:"inherit",border:thoughtPerspective===p?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:thoughtPerspective===p?"#2E2B27":"transparent",color:thoughtPerspective===p?"#F7F6F3":"#A09790"}}>{p}</button>
                  ))}
                </div>
                <Inp value={thoughtPerspective} onChange={e=>setThoughtPerspective(e.target.value)} placeholder="または自由入力"/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>その視点から見ると？</div>
                <textarea value={thoughtText} onChange={e=>setThoughtText(e.target.value)} placeholder="自由に書いてみる…" rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",lineHeight:1.65,fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",gap:8}}><Btn onClick={saveThought} variant="primary" style={{flex:1}}>保存</Btn><Btn onClick={()=>setShowThought(false)} variant="ghost">キャンセル</Btn></div>
            </div>
            :<button onClick={()=>setShowThought(true)} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>＋ 思考実験を書く</button>
          }
          {(data.thoughtMemos||[]).length>0&&(
            <div style={{marginTop:showThought?12:0}}>
              {(data.thoughtMemos||[]).slice(0,3).map(t=>(
                <div key={t.id} style={{borderTop:"1px solid #F0EDE7",paddingTop:10,marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <span style={{fontSize:11,padding:"1px 8px",borderRadius:10,background:"rgba(138,153,176,0.1)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.2)"}}>{t.perspective}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#C0BAB0"}}>{t.date}</span>
                      <button onClick={()=>save({...data,thoughtMemos:(data.thoughtMemos||[]).filter(x=>x.id!==t.id)})} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
                    </div>
                  </div>
                  <p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:460,background:"rgba(247,246,243,0.95)",backdropFilter:"blur(10px)",borderTop:"1px solid #E8E4DC",display:"flex",zIndex:50}}>
        {[["home","今日","☀️"],["cost","原価管理","📋"],["goal","目標","🎯"]].map(([k,l,e])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"10px 0 14px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{e}</span>
            <span style={{fontSize:10,color:tab===k?"#2E2B27":"#C0BAB0",fontWeight:tab===k?600:400}}>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

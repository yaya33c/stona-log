import { useState, useEffect, useCallback } from “react”;

const SK = “stona-log-v3”;
const TARGET = 3_000_000;

const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);

function weekRange() {
const now = new Date(), day = now.getDay();
const mon = new Date(now); mon.setDate(now.getDate()-(day===0?6:day-1)); mon.setHours(0,0,0,0);
const sun = new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
return [mon, sun];
}
function inWeek(dateStr) {
const [mon,sun] = weekRange(); const d = new Date(dateStr);
return d >= mon && d <= sun;
}
function calcStreak(sessions) {
const days = […new Set(sessions.map(s=>isoDay(s.date)))].sort().reverse();
if (!days.length) return 0;
let streak=0, cur=new Date(); cur.setHours(0,0,0,0);
for (const day of days) {
const d=new Date(day), diff=Math.round((cur-d)/86400000);
if (diff>1) break;
streak++; cur=d;
}
return streak;
}

const INITIAL = { posts:[], projects:[], sessions:[], books:[], places:[], goal:{examDate:””,targetHours:400} };
const stColor = { “完了”:”#7CA37A”,“進行中”:”#C49A5A”,“商談中”:”#8A99B0” };
const stBg    = { “完了”:“rgba(124,163,122,0.1)”,“進行中”:“rgba(196,154,90,0.1)”,“商談中”:“rgba(138,153,176,0.1)” };

// ── UI parts ──
const Inp = ({value,onChange,placeholder,type=“text”,style={}}) => (
<input type={type} value={value} onChange={onChange} placeholder={placeholder}
style={{width:“100%”,background:”#F4F2EE”,border:“1px solid #E8E4DC”,borderRadius:9,padding:“10px 12px”,fontSize:13,color:”#2E2B27”,fontFamily:“inherit”,…style}}/>
);
const Card = ({children,style={}}) => (

  <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"16px",...style}}>{children}</div>
);
const Btn = ({onClick,children,variant="primary",style={}}) => (
  <button onClick={onClick} style={{padding:"10px 16px",borderRadius:9,fontSize:13,cursor:"pointer",fontFamily:"inherit",
    background:variant==="primary"?"#2E2B27":variant==="ghost"?"transparent":"#F4F2EE",
    color:variant==="primary"?"#F7F6F3":variant==="ghost"?"#BDB9B1":"#6E6A63",
    border:variant==="ghost"?"1px solid #E8E4DC":"none",...style}}>{children}</button>
);
const Label = ({children}) => (
  <div style={{fontSize:11,color:"#C0BAB0",letterSpacing:"0.1em",marginBottom:8}}>{children}</div>
);

export default function App() {
const [data, setData]   = useState(INITIAL);
const [tab, setTab]     = useState(“log”);
const [mode, setMode]   = useState(“hobby”);
const [text, setText]   = useState(””);
const [place, setPlace] = useState(””);
const [sMin, setSMin]   = useState(””);
const [sNote, setSNote] = useState(””);
const [bookQuery, setBookQuery]     = useState(””);
const [bookResults, setBookResults] = useState([]);
const [bookLoading, setBookLoading] = useState(false);
const [selBook, setSelBook]         = useState(null);
const [bookMemo, setBookMemo]       = useState(””);
const [placeName, setPlaceName]     = useState(””);
const [placeResults, setPlaceResults] = useState([]);
const [placeLoading, setPlaceLoading] = useState(false);
const [selPlace, setSelPlace]       = useState(null);
const [placeMemo, setPlaceMemo]     = useState(””);
const [showPF, setShowPF]   = useState(false);
const [editP, setEditP]     = useState(null);
const [pName, setPName]     = useState(””);
const [pAmt, setPAmt]       = useState(””);
const [pSt, setPSt]         = useState(“進行中”);
const [editG, setEditG]     = useState(false);
const [gDate, setGDate]     = useState(””);
const [gH, setGH]           = useState(400);
const [aiResult, setAiResult]   = useState(””);
const [aiLoading, setAiLoading] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [placeView, setPlaceView] = useState(“list”); // list | map
const [placeFilter, setPlaceFilter] = useState(“all”);
const [apiKey, setApiKey]   = useState(””);
const [apiKeyInput, setApiKeyInput] = useState(””);

// load
useEffect(() => {
try {
const raw = localStorage.getItem(SK);
if (raw) setData(JSON.parse(raw));
} catch {}
try {
const k = localStorage.getItem(“stona-api-key”);
if (k) setApiKey(k);
} catch {}
}, []);

const save = useCallback((next) => {
setData(next);
try { localStorage.setItem(SK, JSON.stringify(next)); } catch {}
}, []);

const saveApiKey = () => {
setApiKey(apiKeyInput);
try { localStorage.setItem(“stona-api-key”, apiKeyInput); } catch {}
setShowSettings(false);
};

// computed
const mk      = mKey(new Date());
const mProjs  = data.projects.filter(p=>mKey(p.date)===mk);
const dProjs  = mProjs.filter(p=>p.status===“完了”);
const gross   = dProjs.reduce((s,p)=>s+p.amount,0);
const gPct    = Math.min(100,(gross/TARGET)*100);
const totalH  = data.sessions.reduce((s,ss)=>s+ss.minutes,0)/60;
const {examDate,targetHours} = data.goal;
const dl      = examDate ? Math.ceil((new Date(examDate)-new Date())/86400000) : null;
const wkNeed  = dl>0 ? (Math.max(0,targetHours-totalH)/(dl/7)).toFixed(1) : null;
const sPct    = Math.min(100,(totalH/targetHours)*100);
const streak  = calcStreak(data.sessions);
const [wMon,wSun] = weekRange();
const wkGross   = data.projects.filter(p=>inWeek(p.date)&&p.status===“完了”).reduce((s,p)=>s+p.amount,0);
const wkStudyH  = data.sessions.filter(s=>inWeek(s.date)).reduce((s,ss)=>s+ss.minutes,0)/60;
const wkRecords = […data.posts,…data.books,…data.places].filter(x=>inWeek(x.date)).length;

const timeline = [
…data.posts.map(p=>({…p,_t:“post”})),
…data.sessions.map(s=>({…s,_t:“sess”})),
…data.books.map(b=>({…b,_t:“book”})),
…data.places.map(p=>({…p,_t:“place”})),
].sort((a,b)=>new Date(b.date)-new Date(a.date));

// actions
const postLog = () => {
if (mode===“hobby”) {
if(!text.trim()) return;
save({…data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:“hobby”,place:place.trim(),text:text.trim()},…data.posts]});
setText(””); setPlace(””);
} else if (mode===“work”) {
if(!text.trim()) return;
save({…data,posts:[{id:Date.now(),date:new Date().toISOString(),mode:“work”,text:text.trim()},…data.posts]});
setText(””);
} else if (mode===“study”) {
if(!sMin) return;
save({…data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes:parseInt(sMin,10),note:sNote.trim()},…data.sessions]});
setSMin(””); setSNote(””);
}
};

const searchBooks = async () => {
if(!bookQuery.trim()) return;
setBookLoading(true); setBookResults([]);
const q = bookQuery.trim();

```
const fetchGoogle = async () => {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&orderBy=relevance`);
    const json = await res.json();
    return (json.items||[]).map(i=>({
      id:"gb-"+i.id,
      title:i.volumeInfo.title||"",
      authors:(i.volumeInfo.authors||[]).join(", "),
      thumbnail:(i.volumeInfo.imageLinks?.thumbnail||i.volumeInfo.imageLinks?.smallThumbnail||"").replace("http:","https:"),
      publisher:i.volumeInfo.publisher||"",
    }));
  } catch { return []; }
};

const fetchNDL = async () => {
  try {
    const res = await fetch(`https://iss.ndl.go.jp/api/opensearch?any=${encodeURIComponent(q)}&cnt=10&mediatype=1`);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const items = Array.from(xml.querySelectorAll("item"));
    return items.map((item, i) => {
      const get = tag => item.querySelector(tag)?.textContent||"";
      const creators = Array.from(item.querySelectorAll("creator")).map(e=>e.textContent).join(", ");
      const isbn = Array.from(item.querySelectorAll("identifier")).find(e=>e.textContent.replace(/-/g,"").match(/^97[89]\d{10}$/))?.textContent||"";
      const thumbnail = isbn ? `https://cover.openbd.jp/${isbn.replace(/-/g,"")}.jpg` : "";
      return { id:"ndl-"+i+"-"+Date.now(), title:get("title"), authors:creators, thumbnail, publisher:get("publisher") };
    }).filter(b=>b.title);
  } catch { return []; }
};

const [gBooks, ndlBooks] = await Promise.all([fetchGoogle(), fetchNDL()]);
const seen = new Set();
const merged = [...gBooks, ...ndlBooks].filter(b => {
  const key = b.title.replace(/\s/g,"").toLowerCase();
  if(seen.has(key)||!b.title) return false;
  seen.add(key); return true;
});
setBookResults(merged.slice(0,12));
if(merged.length===0) alert("見つかりませんでした。別のキーワードを試してください。");
setBookLoading(false);
```

};

const addBook = () => {
if(!selBook) return;
save({…data,books:[{id:Date.now(),date:new Date().toISOString(),…selBook,memo:bookMemo.trim()},…data.books]});
setSelBook(null); setBookQuery(””); setBookResults([]); setBookMemo(””);
};

const searchPlace = async () => {
if(!placeName.trim()) return;
setPlaceLoading(true); setPlaceResults([]);

```
// Photon（OpenStreetMap高精度エンジン）+ Nominatim 並列
const fetchPhoton = async () => {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(placeName)}&lang=ja&limit=8`);
    const json = await res.json();
    return (json.features||[]).map(f=>{
      const p = f.properties;
      const parts = [p.name, p.city||p.town||p.village, p.county, p.state].filter(Boolean);
      const area = [p.state||p.county, p.city||p.town||p.village].filter(Boolean).join(" ");
      return {
        name: p.name||parts[0]||"",
        fullName: parts.join(", "),
        area,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        type: p.type||p.osm_value||"",
      };
    }).filter(r=>r.name);
  } catch { return []; }
};

const fetchNominatim = async () => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=5&accept-language=ja&addressdetails=1`);
    const json = await res.json();
    return json.map(p=>{
      const a = p.address||{};
      const area = [a.state||a.prefecture, a.city||a.town||a.village||a.suburb].filter(Boolean).join(" ");
      return {
        name: p.display_name.split(",")[0],
        fullName: p.display_name,
        area,
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        type: p.type||"",
      };
    });
  } catch { return []; }
};

const [photon, nominatim] = await Promise.all([fetchPhoton(), fetchNominatim()]);
const seen = new Set();
const merged = [...photon, ...nominatim].filter(r=>{
  const key = r.name.trim().toLowerCase();
  if(seen.has(key)||!r.name) return false;
  seen.add(key); return true;
});
setPlaceResults(merged.slice(0,10));
if(merged.length===0) alert("見つかりませんでした。");
setPlaceLoading(false);
```

};

const addPlace = () => {
if(!selPlace) return;
save({…data,places:[{id:Date.now(),date:new Date().toISOString(),…selPlace,memo:placeMemo.trim()},…data.places]});
setSelPlace(null); setPlaceName(””); setPlaceResults([]); setPlaceMemo(””);
};

const saveProj = () => {
if(!pName.trim()||!pAmt) return;
const p={id:editP?.id||Date.now(),date:editP?.date||new Date().toISOString(),name:pName.trim(),amount:parseInt(pAmt,10),status:pSt};
save({…data,projects:editP?data.projects.map(x=>x.id===editP.id?p:x):[p,…data.projects]});
setPName(””); setPAmt(””); setPSt(“進行中”); setShowPF(false); setEditP(null);
};
const startEditP = p => { setEditP(p); setPName(p.name); setPAmt(String(p.amount)); setPSt(p.status); setShowPF(true); };
const delProj  = id => save({…data,projects:data.projects.filter(p=>p.id!==id)});
const delPost  = id => save({…data,posts:data.posts.filter(p=>p.id!==id)});
const delSess  = id => save({…data,sessions:data.sessions.filter(s=>s.id!==id)});
const delBook  = id => save({…data,books:data.books.filter(b=>b.id!==id)});
const delPlace = id => save({…data,places:data.places.filter(p=>p.id!==id)});
const saveGoal = () => { save({…data,goal:{examDate:gDate,targetHours:parseInt(gH,10)||400}}); setEditG(false); };

const runAI = async () => {
if(!apiKey) { setAiResult(“設定からAnthropicのAPIキーを入力してください。”); return; }
const memos = data.posts.filter(p=>p.mode===“work”).map(p=>`[${fmt(p.date)}] ${p.text}`).join(”\n”);
if(!memos.trim()) { setAiResult(“仕事メモがまだありません。記録タブから追加してください。”); return; }
setAiLoading(true); setAiResult(””);
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method:“POST”,
headers:{“Content-Type”:“application/json”,“x-api-key”:apiKey,“anthropic-version”:“2023-06-01”,“anthropic-dangerous-direct-browser-access”:“true”},
body: JSON.stringify({
model:“claude-sonnet-4-20250514”, max_tokens:1000,
system:`あなたは建設業の一人親方・現場監督STONAの経営参謀です。仕事メモから以下を分析して簡潔な日本語で返してください。必ずこのフォーマットで:

【見えてきた課題】

- 箇条書きで2〜3点

【次のアクション】

- 具体的な行動を2〜3点

【営業・案件のヒント】

- 気づきや提案を1〜2点`, messages:[{role:"user",content:`直近の仕事メモ：\n\n${memos}`}]
  })
  });
  const json = await res.json();
  setAiResult(json.content?.[0]?.text || “分析できませんでした。”);
  } catch(e) { setAiResult(“エラーが発生しました: “ + e.message); }
  setAiLoading(false);
  };
  
  const ModeBtn = ({k,l}) => (
  <button onClick={()=>setMode(k)} style={{padding:“5px 13px”,fontSize:12,borderRadius:20,cursor:“pointer”,fontFamily:“inherit”,
  border:mode===k?“1.5px solid #2E2B27”:“1.5px solid #E2DDD5”,
  background:mode===k?”#2E2B27”:“transparent”,
  color:mode===k?”#F7F6F3”:”#A09790”,transition:“all 0.15s”}}>{l}</button>
  );
  
  const css = `*{box-sizing:border-box;margin:0;padding:0} input,textarea,select{font-family:inherit;outline:none} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#E2DDD5;border-radius:2px} .fade{animation:fi 0.2s ease} @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1}} .row:hover .x{opacity:1!important} textarea{resize:none} button{cursor:pointer;font-family:inherit} .hover-bg:hover{background:#F4F2EE!important}`;
  
  return (
  
    <div style={{fontFamily:"'Hiragino Sans','Hiragino Kaku Gothic ProN',YuGothic,sans-serif",background:"#F7F6F3",minHeight:"100vh",color:"#2E2B27",maxWidth:460,margin:"0 auto"}}>
      <style>{css}</style>
  
  ```
  {/* settings modal */}
  {showSettings && (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
      <div style={{width:"100%",background:"#fff",borderRadius:"18px 18px 0 0",padding:"24px 20px 40px",maxWidth:460,margin:"0 auto"}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>設定</div>
        <div style={{fontSize:12,color:"#C0BAB0",marginBottom:16}}>AI分析に使用するAnthropicのAPIキー</div>
        <input
          type="password"
          value={apiKeyInput}
          onChange={e=>setApiKeyInput(e.target.value)}
          placeholder="sk-ant-..."
          style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:10,outline:"none"}}
        />
        <div style={{fontSize:11,color:"#C0BAB0",marginBottom:16}}>
          キーは端末のlocalStorageに保存されます。<br/>
          <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" style={{color:"#8A99B0"}}>console.anthropic.com</a> で取得できます。
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={saveApiKey} variant="primary" style={{flex:1}}>保存</Btn>
          <Btn onClick={()=>setShowSettings(false)} variant="ghost">キャンセル</Btn>
        </div>
      </div>
    </div>
  )}
  
  {/* header */}
  <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <div>
      <div style={{fontSize:10,letterSpacing:"0.2em",color:"#C8C3BA",marginBottom:1}}>STONA</div>
      <div style={{fontSize:22,fontWeight:700,letterSpacing:"0.02em"}}>Log</div>
    </div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end",alignItems:"center"}}>
      <div style={{background:gross>=TARGET?"rgba(124,163,122,0.12)":"rgba(196,154,90,0.09)",border:`1px solid ${gross>=TARGET?"rgba(124,163,122,0.25)":"rgba(196,154,90,0.2)"}`,borderRadius:20,padding:"4px 10px",fontSize:11,color:gross>=TARGET?"#6A9368":"#A87E30"}}>
        ¥{(gross/10000).toFixed(0)}万
      </div>
      {examDate&&<div style={{background:"rgba(138,153,176,0.09)",border:"1px solid rgba(138,153,176,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#6A7E99"}}>{totalH.toFixed(0)}h</div>}
      {streak>0&&<div style={{background:"rgba(220,100,60,0.09)",border:"1px solid rgba(220,100,60,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#C06040"}}>🔥{streak}</div>}
      <button onClick={()=>{setApiKeyInput(apiKey);setShowSettings(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18,padding:"2px 4px"}}>⚙</button>
    </div>
  </div>
  
  {/* tabs */}
  <div style={{display:"flex",padding:"14px 20px 0",gap:20,borderBottom:"1px solid #E8E4DC"}}>
    {[["log","記録"],["goal","目標"],["places","場所"],["ai","AI分析"]].map(([k,l])=>(
      <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",fontSize:14,fontWeight:tab===k?600:400,color:tab===k?"#2E2B27":"#C0BAB0",borderBottom:tab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:8,transition:"all 0.15s",cursor:"pointer",fontFamily:"inherit"}}>
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
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="気づいたこと、感じたこと…" rows={3}
            style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/>
        </div>}
  
        {mode==="work"&&<div className="fade">
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="今日の仕事メモ" rows={3}
            style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65}}/>
        </div>}
  
        {mode==="study"&&<div className="fade">
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <Inp type="number" value={sMin} onChange={e=>setSMin(e.target.value)} placeholder="学習時間" style={{flex:1}}/>
            <span style={{fontSize:13,color:"#C0BAB0"}}>分</span>
          </div>
          <Inp value={sNote} onChange={e=>setSNote(e.target.value)} placeholder="メモ（任意）"/>
        </div>}
  
        {mode==="book"&&<div className="fade">
          {!selBook?<>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <Inp value={bookQuery} onChange={e=>setBookQuery(e.target.value)} placeholder="書名で検索" style={{flex:1}}
                onKeyDown={e=>e.key==="Enter"&&searchBooks()}/>
              <Btn onClick={searchBooks} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{bookLoading?"…":"検索"}</Btn>
            </div>
            {bookResults.map(b=>(
              <div key={b.id} className="hover-bg" onClick={()=>setSelBook(b)}
                style={{display:"flex",gap:10,padding:"8px",borderRadius:9,cursor:"pointer",background:"transparent",transition:"background 0.15s",marginBottom:4}}>
                {b.thumbnail
                  ?<img src={b.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>
                  :<div style={{width:36,height:50,background:"#F0EDE7",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📖</div>}
                <div><div style={{fontSize:13,color:"#2E2B27",marginBottom:2,lineHeight:1.4}}>{b.title}</div><div style={{fontSize:11,color:"#B5AFA6"}}>{b.authors}</div></div>
              </div>
            ))}
          </>:<>
            <div style={{display:"flex",gap:10,padding:"10px",background:"#F4F2EE",borderRadius:9,marginBottom:10,alignItems:"center"}}>
              {selBook.thumbnail
                ?<img src={selBook.thumbnail} alt="" style={{width:36,height:50,objectFit:"cover",borderRadius:4,flexShrink:0}}/>
                :<div style={{width:36,height:50,background:"#E8E4DC",borderRadius:4,flexShrink:0}}/>}
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:"#2E2B27",lineHeight:1.4}}>{selBook.title}</div>
                <div style={{fontSize:11,color:"#B5AFA6"}}>{selBook.authors}</div>
              </div>
              <button onClick={()=>{setSelBook(null);setBookResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>×</button>
            </div>
            <Inp value={bookMemo} onChange={e=>setBookMemo(e.target.value)} placeholder="一言感想（任意）"/>
          </>}
        </div>}
  
        {mode==="place"&&<div className="fade">
          {!selPlace?<>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <Inp value={placeName} onChange={e=>setPlaceName(e.target.value)} placeholder="場所名で検索" style={{flex:1}}
                onKeyDown={e=>e.key==="Enter"&&searchPlace()}/>
              <Btn onClick={searchPlace} variant="secondary" style={{whiteSpace:"nowrap",padding:"10px 14px"}}>{placeLoading?"…":"検索"}</Btn>
            </div>
            {placeResults.map((p,i)=>(
              <div key={i} className="hover-bg" onClick={()=>setSelPlace(p)}
                style={{padding:"9px 10px",borderRadius:9,cursor:"pointer",background:"transparent",transition:"background 0.15s",marginBottom:3}}>
                <div style={{fontSize:13,color:"#2E2B27"}}>{p.name}</div>
                <div style={{fontSize:11,color:"#B5AFA6",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.fullName}</div>
              </div>
            ))}
          </>:<>
            <div style={{background:"#F4F2EE",borderRadius:9,marginBottom:10,overflow:"hidden"}}>
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${selPlace.lat},${selPlace.lon}&zoom=15&size=420x130&markers=${selPlace.lat},${selPlace.lon},red`}
                alt="map" style={{width:"100%",height:110,objectFit:"cover",display:"block"}}
                onError={e=>{e.target.style.display="none";}}/>
              <div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"#2E2B27"}}>{selPlace.name}</span>
                <button onClick={()=>{setSelPlace(null);setPlaceResults([]);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:18}}>×</button>
              </div>
            </div>
            <Inp value={placeMemo} onChange={e=>setPlaceMemo(e.target.value)} placeholder="どうだった？（任意）"/>
          </>}
        </div>}
  
        {(mode==="hobby"||mode==="work"||mode==="study")&&
          <Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
        {mode==="book"&&selBook&&
          <Btn onClick={addBook} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
        {mode==="place"&&selPlace&&
          <Btn onClick={addPlace} variant="primary" style={{width:"100%",marginTop:12}}>記録する</Btn>}
      </Card>
  
      {timeline.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>最初の記録をつけてみましょう</div>}
  
      {timeline.map(item=>(
        <div key={`${item._t}-${item.id}`} className="row fade" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:7,overflow:"hidden"}}>
  
          {item._t==="place"&&<>
            <img src={`https://staticmap.openstreetmap.de/staticmap.php?center=${item.lat},${item.lon}&zoom=15&size=460x110&markers=${item.lat},${item.lon},red`}
              alt="" style={{width:"100%",height:100,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
            <div style={{padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.memo?5:0}}>
                <span style={{fontSize:12,color:"#2E2B27",fontWeight:500}}>📍 {item.name}</span>
                <span style={{fontSize:11,color:"#CCC7BE",marginLeft:"auto"}}>{fmt(item.date)}</span>
                <button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>×</button>
              </div>
              {item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
            </div>
          </>}
  
          {item._t==="book"&&<div style={{padding:"12px 14px"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              {item.thumbnail
                ?<img src={item.thumbnail} alt="" style={{width:44,height:60,objectFit:"cover",borderRadius:5,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.1)"}}/>
                :<div style={{width:44,height:60,background:"#F0EDE7",borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📖</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(100,120,180,0.08)",color:"#6478A0",border:"1px solid rgba(100,120,180,0.18)"}}>読書</span>
                  <span style={{fontSize:11,color:"#CCC7BE"}}>{fmt(item.date)}</span>
                  <button className="x" onClick={()=>delBook(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>×</button>
                </div>
                <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2,lineHeight:1.4}}>{item.title}</div>
                <div style={{fontSize:11,color:"#B5AFA6",marginBottom:item.memo?4:0}}>{item.authors}</div>
                {item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
              </div>
            </div>
          </div>}
  
          {item._t==="post"&&<div style={{padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
              {item.mode==="hobby"&&item.place&&<span style={{fontSize:11,color:"#CCC7BE"}}>📍{item.place}</span>}
              {item.mode==="work"&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.08)",color:"#B08A3A",border:"1px solid rgba(196,154,90,0.18)"}}>仕事</span>}
              <button className="x" onClick={()=>delPost(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>×</button>
            </div>
            <p style={{fontSize:14,lineHeight:1.7,color:"#4A4740",margin:0}}>{item.text}</p>
          </div>}
  
          {item._t==="sess"&&<div style={{padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:item.note?5:0}}>
              <span style={{fontSize:11,color:"#CCC7BE"}}>{fmtFull(item.date)}</span>
              <span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"rgba(138,153,176,0.08)",color:"#6A7E99",border:"1px solid rgba(138,153,176,0.18)"}}>学習 {item.minutes}分</span>
              <button className="x" onClick={()=>delSess(item.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s"}}>×</button>
            </div>
            {item.note&&<p style={{fontSize:13,color:"#9E9890",lineHeight:1.6,margin:0}}>{item.note}</p>}
          </div>}
        </div>
      ))}
    </>}
  
    {/* ── GOAL TAB ── */}
    {tab==="goal"&&<>
      <Label>今週のサマリー</Label>
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
          {[{label:"粗利",val:`¥${(wkGross/10000).toFixed(0)}万`,color:"#C49A5A"},{label:"学習",val:`${wkStudyH.toFixed(1)}h`,color:"#8A99B0"},{label:"記録",val:`${wkRecords}件`,color:"#7CA37A"}].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
              <div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
              <div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:"#C8C3BA",marginTop:10,textAlign:"center"}}>{fmt(wMon.toISOString())} 〜 {fmt(wSun.toISOString())}</div>
      </Card>
  
      <Label>学習ストリーク</Label>
      <Card style={{marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:36}}>🔥</div>
        <div>
          <div style={{fontSize:26,fontWeight:700,color:"#C06040"}}>{streak}<span style={{fontSize:14,fontWeight:400,color:"#C0BAB0"}}> 日連続</span></div>
          <div style={{fontSize:12,color:"#C8C3BA"}}>累計 {totalH.toFixed(1)}h</div>
        </div>
      </Card>
  
      <Label>今月の粗利</Label>
      <Card style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
          <span style={{fontSize:26,fontWeight:700,color:gross>=TARGET?"#7CA37A":"#2E2B27"}}>¥{gross.toLocaleString()}</span>
          <span style={{fontSize:12,color:"#C0BAB0"}}>/ ¥3,000,000</span>
        </div>
        <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:8}}>
          <div style={{height:"100%",width:`${gPct}%`,background:gross>=TARGET?"#7CA37A":"#C49A5A",borderRadius:6,transition:"width 0.5s"}}/>
        </div>
        <div style={{fontSize:11,color:"#C8C3BA"}}>完了 {dProjs.length}件 · 進行中 {mProjs.filter(p=>p.status==="進行中").length}件 · 商談中 {mProjs.filter(p=>p.status==="商談中").length}件</div>
      </Card>
  
      {data.projects.map(p=>(
        <div key={p.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#2E2B27",marginBottom:2}}>{p.name}</div>
            <div style={{fontSize:11,color:"#C8C3BA"}}>¥{p.amount.toLocaleString()} · {fmt(p.date)}</div>
          </div>
          <span style={{fontSize:11,padding:"2px 9px",borderRadius:10,background:stBg[p.status],color:stColor[p.status],border:`1px solid ${stColor[p.status]}33`}}>{p.status}</span>
          <button onClick={()=>startEditP(p)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
          <button onClick={()=>delProj(p.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,cursor:"pointer"}}>×</button>
        </div>
      ))}
  
      {!showPF
        ?<button onClick={()=>{setShowPF(true);setEditP(null);setPName("");setPAmt("");setPSt("進行中");}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:16,cursor:"pointer",fontFamily:"inherit"}}>＋ 案件を追加</button>
        :<Card style={{marginBottom:16}} className="fade">
          <Inp value={pName} onChange={e=>setPName(e.target.value)} placeholder="案件名" style={{marginBottom:8}}/>
          <Inp type="number" value={pAmt} onChange={e=>setPAmt(e.target.value)} placeholder="粗利（円）" style={{marginBottom:8}}/>
          <select value={pSt} onChange={e=>setPSt(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit",marginBottom:12,outline:"none"}}>
            {["商談中","進行中","完了"].map(s=><option key={s}>{s}</option>)}
          </select>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={saveProj} variant="primary" style={{flex:1}}>{editP?"更新":"追加"}</Btn>
            <Btn onClick={()=>{setShowPF(false);setEditP(null);}} variant="ghost">キャンセル</Btn>
          </div>
        </Card>
      }
  
      <Label>一級施工管理技士</Label>
      <Card style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:24,fontWeight:700,color:"#8A99B0"}}>{totalH.toFixed(1)}</span>
            <span style={{fontSize:13,color:"#C0BAB0"}}>h / {targetHours}h</span>
          </div>
          {!editG&&<button onClick={()=>{setGDate(examDate);setGH(targetHours);setEditG(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>設定</button>}
        </div>
        <div style={{background:"#F0EDE7",borderRadius:6,height:5,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",width:`${sPct}%`,background:"#8A99B0",borderRadius:6,transition:"width 0.5s"}}/>
        </div>
        {!editG
          ?wkNeed
            ?<div style={{fontSize:12,color:"#A0998F"}}>試験まで <span style={{color:"#2E2B27",fontWeight:600}}>{dl}日</span> · 週あたり <span style={{color:"#8A99B0",fontWeight:600}}>{wkNeed}h</span> 必要</div>
            :<div style={{fontSize:12,color:"#C8C3BA"}}>試験日を設定してください</div>
          :<div className="fade">
            <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>試験日</div><Inp type="date" value={gDate} onChange={e=>setGDate(e.target.value)}/></div>
            <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>目標時間（h）</div><Inp type="number" value={gH} onChange={e=>setGH(e.target.value)}/></div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={saveGoal} variant="primary" style={{flex:1}}>保存</Btn>
              <Btn onClick={()=>setEditG(false)} variant="ghost">キャンセル</Btn>
            </div>
          </div>
        }
      </Card>
  
      <Card style={{marginBottom:8}}>
        <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10}}>学習を記録</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <Inp type="number" value={sMin} onChange={e=>setSMin(e.target.value)} placeholder="分数" style={{flex:1}}/>
          <span style={{fontSize:13,color:"#C0BAB0"}}>分</span>
        </div>
        <Inp value={sNote} onChange={e=>setSNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:10}}/>
        <Btn onClick={()=>{if(!sMin)return;save({...data,sessions:[{id:Date.now(),date:new Date().toISOString(),minutes:parseInt(sMin,10),note:sNote.trim()},...data.sessions]});setSMin("");setSNote("");}} variant="primary" style={{width:"100%"}}>記録する</Btn>
      </Card>
  
      {data.sessions.length>0&&<>
        <div style={{fontSize:11,color:"#C8C3BA",letterSpacing:"0.08em",marginTop:12,marginBottom:8}}>学習履歴</div>
        {data.sessions.map(ss=>(
          <div key={ss.id} className="row" style={{display:"flex",alignItems:"center",gap:12,padding:"8px 2px",borderBottom:"1px solid #F0EDE7"}}>
            <span style={{fontSize:11,color:"#C8C3BA",minWidth:40}}>{fmt(ss.date)}</span>
            <span style={{fontSize:14,fontWeight:600,color:"#8A99B0",minWidth:44}}>{ss.minutes}<span style={{fontSize:11,fontWeight:400,color:"#C8C3BA"}}>分</span></span>
            <span style={{fontSize:12,color:"#9E9890",flex:1}}>{ss.note}</span>
            <button className="x" onClick={()=>delSess(ss.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:16,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>×</button>
          </div>
        ))}
      </>}
    </>}
  
    {/* ── PLACES TAB ── */}
    {tab==="places"&&(()=>{
      const areas = ["all", ...new Set(data.places.map(p=>p.area||"その他").filter(Boolean))];
      const filtered = placeFilter==="all" ? data.places : data.places.filter(p=>(p.area||"その他")===placeFilter);
      const sorted = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
      return <>
        {/* filter bar */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
          {areas.map(a=>(
            <button key={a} onClick={()=>setPlaceFilter(a)} style={{
              padding:"5px 13px",fontSize:12,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",
              border:placeFilter===a?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",
              background:placeFilter===a?"#2E2B27":"transparent",
              color:placeFilter===a?"#F7F6F3":"#A09790",flexShrink:0,
            }}>{a==="all"?`すべて(${data.places.length})`:a}</button>
          ))}
        </div>
  
        {/* stats */}
        {data.places.length>0&&<Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
            {[
              {label:"合計",val:`${data.places.length}件`,color:"#7CA37A"},
              {label:"エリア",val:`${new Set(data.places.map(p=>p.area||"?")).size}箇所`,color:"#8A99B0"},
              {label:"今月",val:`${data.places.filter(p=>mKey(p.date)===mKey(new Date())).length}件`,color:"#C49A5A"},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                <div style={{fontSize:20,fontWeight:700,color:s.color,marginBottom:2}}>{s.val}</div>
                <div style={{fontSize:11,color:"#C0BAB0"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>}
  
        {/* list */}
        {sorted.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#CCC7BE",fontSize:13}}>場所の記録がまだありません</div>}
        {sorted.map(item=>(
          <div key={item.id} className="row" style={{background:"#fff",borderRadius:12,border:"1px solid #EAE7E1",marginBottom:8,overflow:"hidden"}}>
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${item.lat},${item.lon}&zoom=14&size=460x100&markers=${item.lat},${item.lon},red`}
              alt="" style={{width:"100%",height:90,objectFit:"cover",display:"block"}}
              onError={e=>{e.target.style.display="none";}}
            />
            <div style={{padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:item.memo?5:0}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:2}}>📍 {item.name}</div>
                  {item.area&&<div style={{fontSize:11,color:"#C0BAB0"}}>{item.area}</div>}
                </div>
                <span style={{fontSize:11,color:"#CCC7BE",flexShrink:0}}>{fmt(item.date)}</span>
                <button className="x" onClick={()=>delPlace(item.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>×</button>
              </div>
              {item.memo&&<p style={{fontSize:13,color:"#4A4740",lineHeight:1.65,margin:0}}>{item.memo}</p>}
            </div>
          </div>
        ))}
      </>;
    })()}
  
    {/* ── AI TAB ── */}
    {tab==="ai"&&<>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:13,color:"#4A4740",lineHeight:1.7,marginBottom:14}}>仕事メモを分析して、課題・次のアクション・営業ヒントを提案します。</div>
        <div style={{fontSize:11,color:"#C0BAB0",marginBottom:12}}>仕事メモ {data.posts.filter(p=>p.mode==="work").length}件 が対象</div>
        {!apiKey&&<div style={{fontSize:12,color:"#C49A5A",marginBottom:10}}>⚙ 右上の設定からAPIキーを入力してください</div>}
        <Btn onClick={runAI} variant="primary" style={{width:"100%",opacity:aiLoading?0.6:1}}>{aiLoading?"分析中…":"AIに分析してもらう"}</Btn>
      </Card>
  
      {aiResult&&<Card className="fade">
        <div style={{fontSize:11,color:"#C0BAB0",marginBottom:10,letterSpacing:"0.08em"}}>分析結果</div>
        <div style={{fontSize:13,color:"#4A4740",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiResult}</div>
      </Card>}
  
      {data.posts.filter(p=>p.mode==="work").length>0&&<>
        <div style={{fontSize:11,color:"#C8C3BA",letterSpacing:"0.08em",marginTop:16,marginBottom:10}}>仕事メモ一覧</div>
        {data.posts.filter(p=>p.mode==="work").map(p=>(
          <div key={p.id} style={{padding:"10px 0",borderBottom:"1px solid #F0EDE7"}}>
            <div style={{fontSize:11,color:"#C8C3BA",marginBottom:3}}>{fmtFull(p.date)}</div>
            <div style={{fontSize:13,color:"#4A4740",lineHeight:1.6}}>{p.text}</div>
          </div>
        ))}
      </>}
    </>}
  </div>
  ```
  
    </div>
  );

}

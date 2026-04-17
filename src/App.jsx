import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

// Supabase config
const SUPABASE_URL = "https://iiftlmjzfjekhfwvsxnl.supabase.co";
const SUPABASE_KEY = "sb_publishable_KGYaFqLvtM22MHbQ3XwrOg_MRInCaan";
const USER_ID = "koichi-main";

async function sbGet() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stona_data?id=eq.${USER_ID}&select=data`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const json = await res.json();
    return json?.[0]?.data || null;
  } catch { return null; }
}

async function sbSet(data) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/stona_data`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id: USER_ID, user_id: USER_ID, data, updated_at: new Date().toISOString() })
    });
  } catch {}
}

const SK = "stona-log-v5";
const TARGET = 3_000_000;
const fmt     = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()}`; };
const fmtFull = d => { const t=new Date(d); return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const mKey    = d => { const t=new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
const isoDay  = d => new Date(d).toISOString().slice(0,10);
const yen     = n => { const v=Math.round(Number(n)||0); return isNaN(v)?'0':v.toLocaleString(); };

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


const QUIZ_CATS=["施工計画","工程管理","品質管理","安全管理","法規","材料・工法","積算","環境管理"];
const QUIZ_Q=[
  // 施工計画
  {id:1,cat:"施工計画",q:"バーチャート工程表の特徴として正しいのはどれか？",a:["各作業の関連性が明確に分かる","作成が簡単で視覚的に分かりやすい","クリティカルパスを求めるのに適している","大規模複雑工事に特に有効"],c:1,exp:"バーチャートは横棒で各作業期間を示す。作成が容易で視覚的だが、作業間依存関係の把握には不向き。"},
  {id:2,cat:"施工計画",q:"ネットワーク工程表のクリティカルパスとは何か？",a:["工事費用が最大となる経路","最も工期が長くなる（余裕ゼロの）経路","作業員が最多となる経路","資材消費量が最大の経路"],c:1,exp:"クリティカルパスは全経路中で最長の経路。この経路上の遅れが全体工期に直結する。"},
  {id:3,cat:"施工計画",q:"仮設工事の「共通仮設費」に含まれるのはどれか？",a:["型枠","足場","現場事務所","支保工"],c:2,exp:"現場事務所・労務宿舎・動力用水光熱費などが共通仮設費。型枠・足場・支保工は直接仮設費。"},
  {id:4,cat:"施工計画",q:"施工計画書に記載すべき内容として適切でないのはどれか？",a:["施工方法","品質管理計画","工程表","確定申告書"],c:3,exp:"施工計画書は工法・品質管理・安全計画・工程表等を含む。確定申告書は会計書類であり含まれない。"},
  {id:5,cat:"施工計画",q:"施工計画作成で「後工程に影響する工種から先に計画する」理由として正しいのはどれか？",a:["材料コストを下げるため","全体の遅延リスクを低減するため","作業員の習熟度を上げるため","工事費を削減するため"],c:1,exp:"後工程に影響する基礎・躯体等を優先することで、計画全体の余裕と安定性が生まれる。"},
  // 工程管理
  {id:6,cat:"工程管理",q:"工程管理のPDCAサイクルにおいて「C」が意味するのはどれか？",a:["計画（Plan）","実施（Do）","検討・評価（Check）","改善（Act）"],c:2,exp:"C＝Check（確認・評価）。計画値と実績を比較し差異を把握する段階。"},
  {id:7,cat:"工程管理",q:"出来高進捗曲線（Sカーブ）で実施線が計画線の右側にある場合は？",a:["工程が進んでいる","工程が遅れている","コストオーバー","品質低下"],c:1,exp:"実施線が計画線の右（時間軸）にあると、予定より遅れていることを示す。"},
  {id:8,cat:"工程管理",q:"タクト工程表が最も有効な工事種別はどれか？",a:["特殊形状の構造物","各階が同一構成の高層ビル","地下工事","橋梁工事"],c:1,exp:"各階が同じ構成の高層マンション等、繰り返し作業が多い工事でタクト工程は効果的。"},
  {id:9,cat:"工程管理",q:"工程遅延時の対応として適切でないのはどれか？",a:["作業員を増員","残業・休日出勤を活用","品質基準を下げて作業を早める","工法を変更し効率化"],c:2,exp:"品質基準の引下げは契約違反・不良工事につながるため不可。増員・時間延長・工法変更で対応する。"},
  {id:10,cat:"工程管理",q:"「山積み・山崩し」手法の目的として最も適切なのはどれか？",a:["作業員・機械の過不足を平準化","工期短縮","工事費削減","品質向上"],c:0,exp:"山積みで各時点の資源需要を把握し、山崩しで平準化することで過不足を解消しコストを抑える。"},
  // 品質管理
  {id:11,cat:"品質管理",q:"コンクリートのスランプ試験で測定するのはどれか？",a:["圧縮強度","ワーカビリティー（軟らかさ）","水セメント比","骨材の粒度"],c:1,exp:"スランプ試験はフレッシュコンクリートの流動性を測定。コーン除去後の沈下量(cm)で表す。"},
  {id:12,cat:"品質管理",q:"鉄筋のかぶり厚さを確保する主な目的はどれか？",a:["鉄筋の腐食防止と耐火性の確保","鉄筋の節約","コンクリートの節約","型枠の固定"],c:0,exp:"かぶり厚さにより鉄筋を保護し、腐食防止・耐火性・付着強度の確保を図る。"},
  {id:13,cat:"品質管理",q:"ISO 9001の基本的な考え方として正しいのはどれか？",a:["製品完成後に検査する","プロセス管理で品質を作り込む","コスト最優先","顧客より社内基準優先"],c:1,exp:"ISO 9001はプロセスアプローチが基本。工程ごとに管理して品質を作り込む考え方。"},
  {id:14,cat:"品質管理",q:"コンクリートの「中性化」が問題となる主な理由はどれか？",a:["強度低下","鉄筋の腐食促進","ひび割れの発生","色の変化"],c:1,exp:"コンクリートのアルカリ性が失われると鉄筋を守る不動態被膜が破壊され腐食が進む。"},
  {id:15,cat:"品質管理",q:"品質管理図（管理図）でUCLを超えたとき、まず何をすべきか？",a:["直ちに作業中止","原因調査し異常有無を確認","管理限界値を拡大","そのまま継続"],c:1,exp:"UCL逸脱は異常の可能性を示すが、測定ミス等もあるため原因調査を先に行う。"},
  // 安全管理
  {id:16,cat:"安全管理",q:"労働安全衛生法上、高さ何m以上の作業床で墜落防止措置が必要か？",a:["1m","1.5m","2m","3m"],c:2,exp:"労働安全衛生規則により高さ2m以上では手すり・中桟・幅木等の設置が義務。"},
  {id:17,cat:"安全管理",q:"ツールボックスミーティング（TBM）の一般的な実施タイミングはどれか？",a:["毎週月曜の朝","毎日作業開始前","工事完了時","月に一度"],c:1,exp:"TBMは毎日作業前に危険ポイント・安全対策を5〜10分で確認するミーティング。"},
  {id:18,cat:"安全管理",q:"リスクアセスメントの正しい手順はどれか？",a:["対策→危険特定→評価","危険特定→評価→対策","評価→対策→危険特定","対策→評価→危険特定"],c:1,exp:"①危険源の特定→②リスク評価（頻度×重篤度）→③リスク低減措置の実施が正しい順序。"},
  {id:19,cat:"安全管理",q:"特定元方事業者（元請）が実施しなければならない措置として正しいのはどれか？",a:["協議組織の設置と運営","各下請の給与支払い","下請作業員の採用面接","専門工事の施工"],c:0,exp:"特定元方事業者は協議組織の設置・定期巡視・作業間連絡調整等を義務として実施する。"},
  {id:20,cat:"安全管理",q:"建設現場における「5S活動」に含まれないのはどれか？",a:["整理","整頓","清掃","節約"],c:3,exp:"5Sは整理・整頓・清掃・清潔・躾。節約は含まれない。"},
  // 法規
  {id:21,cat:"法規",q:"建築基準法で確認申請が不要な工事はどれか？",a:["木造3階建て住宅の新築","鉄骨造工場の大規模修繕","200m²超の特殊建築物の大規模模様替え","防火地域外の10m²以下増築"],c:3,exp:"防火・準防火地域外の10m²以下の増築は確認申請不要。その他の選択肢は申請が必要。"},
  {id:22,cat:"法規",q:"建設業法で主任技術者の配置が必要になる工事の請負金額の下限はどれか？",a:["100万円以上","500万円以上","1500万円以上","全ての請負工事"],c:3,exp:"建設業法上、全ての請負工事に主任技術者の配置が必要（金額の下限なし）。"},
  {id:23,cat:"法規",q:"労働基準法上の法定労働時間の原則はどれか？",a:["1日8時間・週40時間","1日10時間・週50時間","1日6時間・週35時間","1日8時間・週48時間"],c:0,exp:"労働基準法第32条：法定労働時間は1日8時間・週40時間が原則。"},
  {id:24,cat:"法規",q:"特定建設業許可が必要となるのはどれか？",a:["元請として4000万円以上の下請契約を結ぶとき","全ての元請工事","下請として工事するとき","工事金額が1億円超のとき"],c:0,exp:"特定建設業は元請が下請に4000万円以上（建築一式は6000万円以上）発注する場合に必要。"},
  {id:25,cat:"法規",q:"産業廃棄物の処理で「マニフェスト制度」の目的はどれか？",a:["工事費節約","廃棄物の処理経路を追跡・管理","建設機械の維持管理","工期短縮"],c:1,exp:"マニフェストは廃棄物の排出から最終処分までを追跡し不法投棄を防止する制度。"},
  // 材料・工法
  {id:26,cat:"材料・工法",q:"鉄筋コンクリート造（RC）で引張力を主に負担するのはどれか？",a:["コンクリート","鉄筋","型枠","砂利"],c:1,exp:"コンクリートは圧縮強度が高く引張強度は低い。RC造では引張力を鉄筋が負担する。"},
  {id:27,cat:"材料・工法",q:"ALC（軽量気泡コンクリート）の特徴として正しいのはどれか？",a:["普通コンクリートより重い","断熱性・耐火性に優れ軽量","水分を全く吸収しない","引張強度が非常に高い"],c:1,exp:"ALCは気泡を含む軽量コンクリート。断熱性・耐火性・遮音性に優れる一方、吸水性が高い。"},
  {id:28,cat:"材料・工法",q:"溶接欠陥「アンダーカット」とはどれか？",a:["溶接部が盛り上がりすぎた状態","母材表面が溶けて凹んだ状態","溶接が未完成な状態","ひび割れが生じた状態"],c:1,exp:"アンダーカットは溶接ビード端部の母材が掘れた欠陥。応力集中が生じ破断の原因となる。"},
  {id:29,cat:"材料・工法",q:"木造軸組工法における「筋交い」の主な役割はどれか？",a:["荷重を基礎に伝える","水平力（地震・風）に抵抗する","屋根荷重を支える","床を支える"],c:1,exp:"筋交いは斜めに入れる軸組材で、地震・風による水平力に抵抗して建物変形を防ぐ。"},
  {id:30,cat:"材料・工法",q:"乾式工法の利点はどれか？",a:["接着強度が高い","養生期間不要で工期短縮","コストが低い","大型部材に適する"],c:1,exp:"乾式工法はボルト・金具等による取付で養生が不要。湿式はモルタル等の養生が必要。"},
  // 積算
  {id:31,cat:"積算",q:"公共工事の積算で用いる「歩掛り」とは何か？",a:["工事現場の面積","単位工事量当たりに必要な労務・材料・機械の量","建物の高さ","歩留まり率"],c:1,exp:"歩掛りは単位工事量（1m³打設等）に必要な標準的な労務・材料・機械の量を示す数値。"},
  {id:32,cat:"積算",q:"見積書の「諸経費」に含まれないのはどれか？",a:["現場管理費","一般管理費","労務費（直接工事費）","保険料"],c:2,exp:"労務費は直接工事費。諸経費（現場管理費・一般管理費）は間接的コスト。"},
  {id:33,cat:"積算",q:"設計図書と異なる施工を行う場合に必要な手続きはどれか？",a:["口頭での協議のみ","変更契約・設計変更の書面手続き","下請業者への通知のみ","作業員への説明のみ"],c:1,exp:"設計変更は書面による変更契約処理が必要。口頭のみでは後日トラブルの原因となる。"},
  // 環境管理
  {id:34,cat:"環境管理",q:"建設リサイクル法において解体工事前に義務付けられているのはどれか？",a:["廃材の全量再資源化","特定建設資材の分別解体","廃材の埋め立て","廃材の海外輸出"],c:1,exp:"コンクリート・木材・アスファルト等の特定建設資材の分別解体・再資源化が義務付けられている。"},
  {id:35,cat:"環境管理",q:"騒音規制法の特定建設作業に該当しないのはどれか？",a:["くい打ち機を使う作業","コンクリートプラント","手持ち式小型電動ドリル","バックホウを使う作業"],c:2,exp:"手持ち小型ドリルは騒音規制法の特定建設作業対象外。くい打ち・さく岩機・バックホウ等は対象。"},
  {id:36,cat:"環境管理",q:"工事現場での粉じん対策として行われないのはどれか？",a:["散水による粉じん抑制","防じんネットの設置","防じんマスク支給","粉じんの大気中への積極的拡散"],c:3,exp:"粉じんを積極的に拡散させることは規制違反。発生抑制（散水）・飛散防止（ネット）・個人防護が正解。"},
];

// カテゴリ自動ローテーション用 - 今日の日付をシードにカテゴリを決める
function getTodayCategory(){
  const today=new Date();
  const dayOfYear=Math.floor((today-new Date(today.getFullYear(),0,0))/86400000);
  return QUIZ_CATS[dayOfYear%QUIZ_CATS.length];
}

function QuizCard({data,save}){
  const today=new Date().toISOString().slice(0,10);
  const todayCat=getTodayCategory();
  const todayLog=(data.quizLog||[]).filter(q=>q.date===today);
  const todayIds=new Set(todayLog.map(q=>q.qid));
  // 今日のカテゴリの未回答問題 → なければ全カテゴリの未回答
  const catPool=QUIZ_Q.filter(q=>q.cat===todayCat&&!todayIds.has(q.id));
  const remaining=catPool.length>0?catPool:QUIZ_Q.filter(q=>!todayIds.has(q.id));
  const [current,setCurrent]=React.useState(null);
  const [selected,setSelected]=React.useState(null);
  const [answered,setAnswered]=React.useState(false);

  React.useEffect(()=>{
    if(remaining.length>0&&!current){
      setCurrent(remaining[Math.floor(Math.random()*remaining.length)]);
    }
  },[]);

  if(remaining.length===0&&!current){
    const correct=todayLog.filter(q=>q.correct).length;
    const wrongLog=todayLog.filter(q=>!q.correct);
    const wrongQs=wrongLog.map(l=>QUIZ_Q.find(q=>q.id===l.qid)).filter(Boolean);
    return(
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"14px",marginBottom:12}}>
        <div style={{textAlign:"center",marginBottom:wrongQs.length>0?14:0}}>
          <div style={{fontSize:18,marginBottom:4}}>🎉</div>
          <div style={{fontSize:13,color:"#4A8A62",fontWeight:600}}>今日の問題は全問完了！</div>
          <div style={{fontSize:11,color:"#C0BAB0",marginTop:2}}>{correct}/{todayLog.length} 正解 ・ 今日のテーマ：{todayCat}</div>
        </div>
        {wrongQs.length>0&&(
          <>
            <div style={{fontSize:11,fontWeight:700,color:"#E07070",marginBottom:8,paddingTop:10,borderTop:"1px solid #F0EDE7"}}>✗ 間違えた問題（{wrongQs.length}問）</div>
            {wrongQs.map((q,i)=>(
              <div key={q.id} style={{background:"#FDF8F4",border:"1px solid #EAE7E1",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{fontSize:11,color:"#C49A5A",fontWeight:600,marginBottom:4}}>{q.cat}</div>
                <div style={{fontSize:13,color:"#2E2B27",lineHeight:1.6,marginBottom:8,fontWeight:500}}>{q.q}</div>
                <div style={{fontSize:12,color:"#7CA37A",marginBottom:4}}>✓ 正解：{q.a[q.c]}</div>
                <div style={{background:"#F8F7F4",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#5A5550",lineHeight:1.7,borderLeft:"3px solid #C49A5A"}}>
                  💡 {q.exp}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }
  if(!current)return null;

  const handleAnswer=(idx)=>{
    if(answered)return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect=idx===current.c;
    const newLog=[...(data.quizLog||[]),{id:Date.now(),date:today,qid:current.id,correct:isCorrect}];
    save({...data,quizLog:newLog});
  };

  const next=()=>{
    const nextPool=remaining.filter(q=>q.id!==current.id);
    setCurrent(nextPool.length>0?nextPool[Math.floor(Math.random()*nextPool.length)]:null);
    setSelected(null);setAnswered(false);
  };

  const correct=todayLog.filter(q=>q.correct).length;
  const total=todayLog.length;

  return(
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #EAE7E1",padding:"14px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"#C0BAB0",letterSpacing:"0.08em"}}>今日の一問 📝</div>
          <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:"rgba(196,154,90,0.1)",color:"#C49A5A",border:"1px solid rgba(196,154,90,0.2)"}}>{current.cat}</span>
        </div>
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
            <button key={i} onClick={()=>handleAnswer(i)} style={{textAlign:"left",padding:"9px 12px",borderRadius:9,fontSize:13,cursor:answered?"default":"pointer",fontFamily:"inherit",background:bg,border,color,transition:"all 0.15s"}}>
              {["A","B","C","D"][i]}. {ans}
            </button>
          );
        })}
      </div>
      {answered&&(
        <>
          <div style={{marginTop:10,background:"#F8F7F4",borderRadius:8,padding:"9px 11px",fontSize:12,color:"#5A5550",lineHeight:1.7,borderLeft:"3px solid #C49A5A"}}>
            <span style={{fontWeight:700,color:"#2E2B27"}}>💡 </span>{current.exp}
          </div>
          <div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:600,color:selected===current.c?"#4A8A62":"#C05040"}}>
              {selected===current.c?"✓ 正解！":"✗ 不正解"}
            </div>
            <button onClick={next} style={{fontSize:12,color:"#8A99B0",background:"none",border:"1px solid #E8E4DC",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit"}}>次の問題 →</button>
          </div>
        </>
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

  // invoice
  const [invoiceClient,setInvoiceClient]=useState("");
  const [invoiceMonth,setInvoiceMonth]=useState(mKey(new Date()));
  const [invoiceNum,setInvoiceNum]=useState("");

  // cost
  const [costSubTab,setCostSubTab]=useState("records");
  const [costMonth,setCostMonth]=useState(mKey(new Date()));
  const [showJobForm,setShowJobForm]=useState(false);
  const [editJob,setEditJob]=useState(null);
  const [jName,setJName]=useState("");
  const [jClient,setJClient]=useState("");
  const [jBilling,setJBilling]=useState("");
  const [jStatus,setJStatus]=useState("進行中");
  const [jStartDate,setJStartDate]=useState("");
  const [jEndDate,setJEndDate]=useState("");
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
  const [estJobName,setEstJobName]=useState("");
  const [estJobInput,setEstJobInput]=useState("");
  const [estShowHistory,setEstShowHistory]=useState(false);
  const [estDates,setEstDates]=useState([isoDay(new Date())]);
  const [estItems,setEstItems]=useState([{id:1,name:"",spec:"",qty:"1",unit:"式",unitPrice:"",total:0}]);
  const [estTaxRate,setEstTaxRate]=useState("10");
  const [estNote,setEstNote]=useState("");
  const [estClient,setEstClient]=useState("");
  const [estBilling,setEstBilling]=useState("");
  const [estBillingItems,setEstBillingItems]=useState([{id:1,name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"}]);
  const [calMonth,setCalMonth]=useState(new Date().getMonth()+1);
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [showEstForm,setShowEstForm]=useState(false);
  const [editEst,setEditEst]=useState(null);

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
    (async()=>{
      try{
        const remote=await sbGet();
        if(remote){
          setData(remote);
        } else {
          const r=localStorage.getItem(SK);
          if(r){
            const local=JSON.parse(r);
            setData(local);
            await sbSet(local);
          }
        }
      }catch{
        try{const r=localStorage.getItem(SK);if(r)setData(JSON.parse(r));}catch{}
      }
      try{const k=localStorage.getItem("stona-api-key");if(k)setApiKey(k);}catch{}
    })();
  },[]);

  const save=useCallback(async next=>{setData(next);try{localStorage.setItem(SK,JSON.stringify(next));}catch{};await sbSet(next);},[]);
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

  const monthRecords=data.workRecords.filter(r=>mKey(r.date)===mk&&r.type!=="estimate");
  const monthLabor=monthRecords.reduce((s,r)=>s+(parseFloat(r.days)||0)*(parseFloat(r.rate)||0),0);
  const monthCost=monthRecords.reduce((s,r)=>s+(parseInt(r.cost)||0),0);
  const monthExpense=monthRecords.reduce((s,r)=>s+(parseInt(r.expense)||0),0);
  const monthEstRecs=data.workRecords.filter(r=>r.type==="estimate"&&mKey(r.date)===mk);
  const monthEstCost=monthEstRecs.reduce((s,r)=>{
    const items=(r.estCostItems||r.estItems||[]);
    return s+items.reduce((ss,it)=>ss+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
  },0);
  const monthBilling=monthEstRecs.length>0
    ?monthEstRecs.reduce((s,r)=>s+parseInt(r.estBilling||0),0)
    :data.jobs.filter(j=>mKey(j.createdAt)===mk).reduce((s,j)=>s+(j.billing||0),0);
  const monthTotalCost=monthLabor+monthCost+monthExpense+monthEstCost;
  const monthProfit=isNaN(monthBilling-monthTotalCost)?0:monthBilling-monthTotalCost;
  const profitPct=Math.min(100,Math.max(0,(monthProfit/TARGET)*100));

  const chartData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
      const mk2=mKey(d);
      const estR=data.workRecords.filter(r=>r.type==="estimate"&&mKey(r.date)===mk2);
      const billing=estR.reduce((s,r)=>s+(parseInt(r.estBilling)||0),0);
      const cost=estR.reduce((s,r)=>{
        const items=(r.estCostItems||r.estItems||[]);
        return s+items.reduce((ss,it)=>ss+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
      },0);
      months.push({label:(d.getMonth()+1)+"月",billing,profit:billing-cost});
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
    const j={id:editJob?.id||Date.now(),createdAt:editJob?.createdAt||new Date().toISOString(),name:jName.trim(),client:jClient.trim(),billing:parseInt(jBilling)||0,status:jStatus,startDate:jStartDate,endDate:jEndDate};
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

  // estimate-style actions
  const estSubtotal=estItems.reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
  const estTax=estTaxRate==="0"?0:Math.round(estSubtotal*parseInt(estTaxRate)/100);
  const estTotal=estSubtotal+estTax;
  const estJobHistory=[...new Set((data.workRecords||[]).filter(r=>r.estJobName).map(r=>r.estJobName))];

  const addEstItem=()=>setEstItems(prev=>[...prev,{id:Date.now(),name:"",spec:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"}]);
  const delEstItem=id=>setEstItems(prev=>prev.filter(it=>it.id!==id));
  const updateEstItem=(id,field,val)=>setEstItems(prev=>prev.map(it=>it.id===id?{...it,[field]:val}:it));
  const addEstBillingItem=()=>setEstBillingItems(prev=>[...prev,{id:Date.now(),name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"}]);
  const delEstBillingItem=id=>setEstBillingItems(prev=>prev.filter(it=>it.id!==id));
  const updateEstBillingItem=(id,field,val)=>setEstBillingItems(prev=>prev.map(it=>it.id===id?{...it,[field]:val}:it));
  const toggleEstDate=d=>setEstDates(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d].sort());

  const estBillingSubtotal=estBillingItems.reduce((s,it)=>{
    const base=parseFloat(it.qty||0)*parseFloat(it.unitPrice||0);
    const tax=it.taxRate==="10"?Math.round(base*0.1):it.taxRate==="8"?Math.round(base*0.08):0;
    return s+base+tax;
  },0);

  const saveEst=()=>{
    if(!estJobName.trim()||estDates.length===0)return;
    const record={
      id:editEst?.id||Date.now(),
      date:estDates[0],
      dates:estDates,
      estJobName:estJobName.trim(),
      estClient:estClient.trim(),
      estCostItems:estItems.filter(it=>it.name.trim()),
      estBillingItems:estBillingItems.filter(it=>it.name.trim()),
      estBilling:String(estBillingSubtotal),
      estSubtotal,
      estNote:estNote.trim(),
      type:"estimate"
    };
    const updated=editEst
      ?data.workRecords.map(x=>x.id===editEst.id?record:x)
      :[record,...(data.workRecords||[])];
    save({...data,workRecords:updated});
    const blank={id:Date.now(),name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"};
    setEstJobName("");setEstJobInput("");setEstClient("");
    setEstItems([{...blank,id:1}]);setEstBillingItems([{...blank,id:2}]);
    setEstDates([isoDay(new Date())]);setEstNote("");setShowEstForm(false);setEditEst(null);
  };
  const startEditEst=r=>{
    setEditEst(r);setEstJobName(r.estJobName||"");setEstJobInput(r.estJobName||"");
    setEstClient(r.estClient||"");setEstBilling(r.estBilling||"");
    const blankItem={id:Date.now(),name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"};
    const costItems=r.estCostItems||r.estItems||[];
    setEstItems(costItems.length>0?costItems:[{...blankItem,id:1}]);
    const billingItems=r.estBillingItems||[];
    setEstBillingItems(billingItems.length>0?billingItems:[{...blankItem,id:2}]);
    setEstDates(r.dates||[r.date]);setEstNote(r.estNote||"");setShowEstForm(true);
  };
  const delEst=id=>save({...data,workRecords:(data.workRecords||[]).filter(r=>r.id!==id)});
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
          <QuizCard data={data} save={save}/>

          {/* Quick input card */}
          <Card style={{marginBottom:14}}>
            {/* Mode selector */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <ModeBtn k="hobby" l="気づき" emoji="💡"/>
              <ModeBtn k="work" l="仕事" emoji="🔨"/>
            </div>

            {/* Input area */}
            {(mode==="hobby"||mode==="work")&&(
              <div className="fade">
                <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={mode==="hobby"?"気づいたこと、感じたこと…":"今日の仕事メモ"} rows={3} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:14,color:"#2E2B27",lineHeight:1.65,fontFamily:"inherit"}}/>
                <Btn onClick={postLog} variant="primary" style={{width:"100%",marginTop:8}}>記録する</Btn>
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

        {/* ガントチャート パイプライン */}
        <Label>案件パイプライン</Label>

        {/* 追加フォーム */}
        <Card style={{marginBottom:12}}>
          {showJobForm
            ?<div className="fade">
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editJob?"案件を編集":"案件を追加"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>案件名</div><Inp value={jName} onChange={e=>setJName(e.target.value)} placeholder="例：東大阪アパート"/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>発注者</div><Inp value={jClient} onChange={e=>setJClient(e.target.value)} placeholder="例：松本建設"/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>開始日</div><Inp type="date" value={jStartDate} onChange={e=>setJStartDate(e.target.value)}/></div>
                <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>終了日</div><Inp type="date" value={jEndDate} onChange={e=>setJEndDate(e.target.value)}/></div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>ステータス</div>
                <select value={jStatus} onChange={e=>setJStatus(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit"}}>
                  {["確定","交渉中","パイプライン","完了"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={saveJob} variant="primary" style={{flex:1}}>{editJob?"更新":"追加"}</Btn>
                <Btn onClick={()=>{setShowJobForm(false);setEditJob(null);setJName("");setJClient("");setJStartDate("");setJEndDate("");setJStatus("確定");}} variant="ghost">キャンセル</Btn>
              </div>
            </div>
            :<button onClick={()=>{setShowJobForm(true);setEditJob(null);setJName("");setJClient("");setJStartDate(isoDay(new Date()));const e2=new Date();e2.setMonth(e2.getMonth()+2);setJEndDate(isoDay(e2));setJStatus("確定");}} style={{width:"100%",padding:"10px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>＋ 案件を追加</button>
          }
        </Card>

        {/* 凡例 */}
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:10}}>
          {[["確定","#7CA37A"],["交渉中","#C49A5A"],["パイプライン","#8A99B0"],["完了","#B0A8A0"]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#5A5550"}}>
              <div style={{width:12,height:12,borderRadius:3,background:c}}/>
              {l}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#E07070"}}>│ 今日</div>
        </div>

        {/* ガント本体 */}
        <Card style={{marginBottom:12,padding:0,overflow:"hidden"}}>
          {(()=>{
            const allJobs=data.jobs||[];
            const stColor={"確定":"#7CA37A","交渉中":"#C49A5A","パイプライン":"#8A99B0","完了":"#B0A8A0","進行中":"#C49A5A","商談中":"#8A99B0","中断":"#B0A8A0"};
            const today=new Date();
            const displayYear2=today.getFullYear();
            const months=Array.from({length:12},(_,i)=>i); // 0-11
            const CELL_W=52;
            const NAME_W=140;
            const STATUS_W=72;
            return(
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{minWidth:NAME_W+STATUS_W+12*CELL_W}}>
                  {/* ヘッダー行 */}
                  <div style={{display:"flex",background:"#F0EDE7",borderBottom:"1px solid #EAE7E1",position:"sticky",top:0,zIndex:5}}>
                    <div style={{width:NAME_W,flexShrink:0,padding:"7px 12px",fontSize:11,fontWeight:700,color:"#5A5550"}}>案件名</div>
                    <div style={{width:STATUS_W,flexShrink:0,padding:"7px 6px",fontSize:11,fontWeight:700,color:"#5A5550",textAlign:"center"}}>状態</div>
                    {months.map(m=>{
                      const isNow=today.getFullYear()===displayYear2&&today.getMonth()===m;
                      return(
                        <div key={m} style={{width:CELL_W,flexShrink:0,padding:"7px 2px",fontSize:10,fontWeight:700,color:isNow?"#C49A5A":"#8A99B0",textAlign:"center",borderLeft:"1px solid #EAE7E1",background:isNow?"rgba(196,154,90,0.06)":"transparent"}}>
                          {m+1}月
                        </div>
                      );
                    })}
                  </div>

                  {/* データ行 */}
                  {allJobs.length===0&&(
                    <div style={{textAlign:"center",padding:"24px",color:"#C0BAB0",fontSize:12}}>案件を追加してください</div>
                  )}
                  {allJobs.map((j,ji)=>{
                    const pStart=j.startDate?new Date(j.startDate):null;
                    const pEnd=j.endDate?new Date(j.endDate):null;
                    const color=stColor[j.status||"確定"]||"#8A99B0";
                    return(
                      <div key={j.id} style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid #F5F3EF",background:ji%2===0?"#fff":"#FAFAF8"}}>
                        {/* 案件名 */}
                        <div style={{width:NAME_W,flexShrink:0,padding:"8px 12px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#2E2B27",marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.name}</div>
                          {j.client&&<div style={{fontSize:10,color:"#8A99B0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.client}</div>}
                        </div>
                        {/* 状態 */}
                        <div style={{width:STATUS_W,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 4px"}}>
                          <span style={{fontSize:10,padding:"3px 7px",borderRadius:10,fontWeight:600,background:color+"20",color:color,border:"1px solid "+color+"40",whiteSpace:"nowrap"}}>{j.status||"確定"}</span>
                        </div>
                        {/* 月セル */}
                        {months.map(m=>{
                          const cellStart=new Date(displayYear2,m,1);
                          const cellEnd=new Date(displayYear2,m+1,0);
                          const cellDays=cellEnd.getDate();
                          const overlap=pStart&&pEnd&&pStart<=cellEnd&&pEnd>=cellStart;
                          const isNow=today.getFullYear()===displayYear2&&today.getMonth()===m;
                          const todayPct=isNow?(today.getDate()-0.5)/cellDays*100:null;
                          let barLeft=0,barWidth=100;
                          if(overlap){
                            const effStart=pStart>cellStart?pStart:cellStart;
                            const effEnd=pEnd<cellEnd?pEnd:cellEnd;
                            barLeft=(effStart.getDate()-1)/cellDays*100;
                            barWidth=(effEnd.getDate()-effStart.getDate()+1)/cellDays*100;
                          }
                          return(
                            <div key={m} style={{width:CELL_W,flexShrink:0,position:"relative",borderLeft:"1px solid #F0EDE7",background:isNow?"rgba(196,154,90,0.03)":"transparent",height:44}}>
                              {todayPct!==null&&<div style={{position:"absolute",left:todayPct+"%",top:0,bottom:0,width:2,background:"#E07070",zIndex:3}}/>}
                              {overlap&&<div style={{position:"absolute",left:barLeft+"%",width:Math.max(4,barWidth)+"%",top:9,height:26,borderRadius:4,background:color,opacity:0.88,zIndex:1,display:"flex",alignItems:"center",paddingLeft:4,overflow:"hidden"}}>
                                {pStart>=cellStart&&<span style={{fontSize:9,color:"#fff",whiteSpace:"nowrap",fontWeight:600}}>{j.name.slice(0,3)}</span>}
                              </div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* 削除ボタン列（フロート） */}
                  {allJobs.length>0&&<div style={{borderTop:"1px solid #F0EDE7",display:"flex",flexWrap:"wrap",gap:6,padding:"8px 12px"}}>
                    {allJobs.map(j=>(
                      <div key={j.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,background:"#F4F2EE",borderRadius:6,padding:"3px 8px"}}>
                        <span style={{color:"#5A5550"}}>{j.name}</span>
                        <button onClick={()=>{setEditJob(j);setJName(j.name);setJClient(j.client||"");setJStartDate(j.startDate||"");setJEndDate(j.endDate||"");setJStatus(j.status||"確定");setShowJobForm(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:11,cursor:"pointer",padding:"0 2px"}}>編集</button>
                        <button onClick={()=>delJob(j.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:13,cursor:"pointer",padding:"0 2px"}}>×</button>
                      </div>
                    ))}
                  </div>}
                </div>
              </div>
            );
          })()}
        </Card>

        {/* 月別売上・粗利予測 */}
        <Label>月別売上・粗利の予測入力</Label>
        <Card style={{marginBottom:12}}>
          {showFC&&<div className="fade" style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #F0EDE7"}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{editFC?"予定を編集":"予定を追加"}</div>
            <div style={{marginBottom:8}}><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>月</div>
              <select value={fcMonth} onChange={e=>setFcMonth(e.target.value)} style={{width:"100%",background:"#F4F2EE",border:"1px solid #E8E4DC",borderRadius:9,padding:"10px 12px",fontSize:13,color:"#2E2B27",fontFamily:"inherit"}}>
                <option value="">選択してください</option>
                {forecastMonths.map(m=><option key={m} value={m}>{m.replace("-","年")}月</option>)}
              </select>
            </div>
            <Inp value={fcName} onChange={e=>setFcName(e.target.value)} placeholder="案件名（任意）" style={{marginBottom:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>売上予定</div><Inp type="number" value={fcBilling} onChange={e=>setFcBilling(e.target.value)} placeholder="0"/></div>
              <div><div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>粗利予定</div><Inp type="number" value={fcProfit} onChange={e=>setFcProfit(e.target.value)} placeholder="0"/></div>
            </div>
            <div style={{display:"flex",gap:8}}><Btn onClick={saveForecast} variant="primary" style={{flex:1}}>{editFC?"更新":"追加"}</Btn><Btn onClick={()=>{setShowFC(false);setEditFC(null);}} variant="ghost">キャンセル</Btn></div>
          </div>}
          {!showFC&&<button onClick={()=>{setShowFC(true);setEditFC(null);setFcMonth("");setFcName("");setFcBilling("");setFcProfit("");}} style={{width:"100%",padding:"9px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:8,color:"#C0BAB0",fontSize:13,marginBottom:forecastMonths.some(m=>(data.forecast||[]).some(f=>f.month===m))?12:0,cursor:"pointer",fontFamily:"inherit"}}>＋ 月別予測を追加</button>}
          {forecastMonths.map(m=>{
            const items=(data.forecast||[]).filter(f=>f.month===m);
            if(items.length===0)return null;
            const totalB=items.reduce((s,f)=>s+f.billing,0),totalP=items.reduce((s,f)=>s+f.profit,0);
            return(
              <div key={m} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #F5F3EF"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,color:"#5A5550",fontWeight:600}}>{m.replace("-","年")}月</span>
                  <span style={{fontSize:12,color:"#8A99B0"}}>売上 ¥{yen(totalB)} / 粗利 <span style={{color:totalP>=0?"#7CA37A":"#E07070"}}>¥{yen(totalP)}</span></span>
                </div>
                {items.map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:11}}>
                    <span style={{flex:1,color:"#8A8070"}}>{f.name||"—"}</span>
                    <button onClick={()=>{setEditFC(f);setFcMonth(f.month);setFcName(f.name);setFcBilling(String(f.billing));setFcProfit(String(f.profit));setShowFC(true);}} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:11,cursor:"pointer"}}>編集</button>
                    <button onClick={()=>delForecast(f.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer"}}>x</button>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>

        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,WebkitOverflowScrolling:"touch",paddingBottom:2}}>
          {allMonths.map(m=>(
            <button key={m} onClick={()=>setCostMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",flexShrink:0,border:costMonth===m?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:costMonth===m?"#2E2B27":"transparent",color:costMonth===m?"#F7F6F3":"#A09790"}}>
              {m==="all"?"全期間":m.replace("-","年")+"月"}
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:16,borderBottom:"1px solid #E8E4DC",marginBottom:12}}>
          {[["records","記録"],["gantt","ガント"],["summary","集計"],["invoice","請求書"]].map(([k,l])=>(
            <button key={k} onClick={()=>setCostSubTab(k)} style={{background:"none",border:"none",fontSize:13,fontWeight:costSubTab===k?600:400,color:costSubTab===k?"#2E2B27":"#C0BAB0",borderBottom:costSubTab===k?"2px solid #2E2B27":"2px solid transparent",paddingBottom:6,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>

        {costSubTab==="records"&&<>
          {/* 原価入力フォーム */}
          {showEstForm&&<Card style={{marginBottom:12}} className="fade">
            <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{editEst?"記録を編集":"原価を追加"}</div>

            {/* 工事名 + 履歴 */}
            <div style={{marginBottom:10,position:"relative"}}>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>工事名</div>
              <Inp value={estJobInput} onChange={e=>{setEstJobInput(e.target.value);setEstJobName(e.target.value);setEstShowHistory(true);}} placeholder="工事名を入力" onFocus={()=>setEstShowHistory(true)} onBlur={()=>setTimeout(()=>setEstShowHistory(false),200)}/>
              {estShowHistory&&estJobHistory.filter(h=>!estJobInput||h.toLowerCase().includes(estJobInput.toLowerCase())).length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#fff",border:"1px solid #E8E4DC",borderRadius:9,zIndex:20,maxHeight:140,overflowY:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
                  {estJobHistory.filter(h=>!estJobInput||h.toLowerCase().includes(estJobInput.toLowerCase())).map((h,i)=>(
                    <div key={i} onMouseDown={()=>{setEstJobName(h);setEstJobInput(h);setEstShowHistory(false);}} style={{padding:"9px 12px",fontSize:13,color:"#2E2B27",cursor:"pointer",borderBottom:"1px solid #F0EDE7"}}>{h}</div>
                  ))}
                </div>
              )}
            </div>

            {/* 元請け */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>元請け</div>
              <Inp value={estClient} onChange={e=>setEstClient(e.target.value)} placeholder="元請け会社名"/>
            </div>

            {/* 月カレンダー マルチセレクト */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:2}}>施工日（複数選択可）</div>
              <div style={{fontSize:10,color:"#8A99B0",marginBottom:6}}>日数のカウントと履歴のために記録。明細は請求・原価それぞれ別途入力してください。</div>
              <div style={{background:"#F8F7F4",borderRadius:10,padding:"10px",border:"1px solid #E8E4DC"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <button onClick={()=>{const d=new Date(calYear,calMonth-1,1);d.setMonth(d.getMonth()-1);setCalMonth(d.getMonth()+1);setCalYear(d.getFullYear());}} style={{background:"none",border:"none",color:"#C0BAB0",fontSize:18,cursor:"pointer",padding:"0 4px"}}>‹</button>
                  <span style={{fontSize:13,fontWeight:600,color:"#2E2B27"}}>{calYear}年{calMonth}月</span>
                  <button onClick={()=>{const d=new Date(calYear,calMonth-1,1);d.setMonth(d.getMonth()+1);setCalMonth(d.getMonth()+1);setCalYear(d.getFullYear());}} style={{background:"none",border:"none",color:"#C0BAB0",fontSize:18,cursor:"pointer",padding:"0 4px"}}>›</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                  {["日","月","火","水","木","金","土"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:i===0?"#E07070":i===6?"#8A99B0":"#C0BAB0",paddingBottom:2}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                  {(()=>{
                    const firstDay=new Date(calYear,calMonth-1,1).getDay();
                    const daysInMonth=new Date(calYear,calMonth,0).getDate();
                    const cells=[];
                    for(let i=0;i<firstDay;i++)cells.push(<div key={"e"+i}/>);
                    for(let d=1;d<=daysInMonth;d++){
                      const ds=`${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                      const sel=estDates.includes(ds);
                      const isToday=ds===isoDay(new Date());
                      const dow=new Date(calYear,calMonth-1,d).getDay();
                      cells.push(
                        <button key={d} onClick={()=>toggleEstDate(ds)} style={{
                          aspectRatio:"1",width:"100%",borderRadius:"50%",border:"none",
                          background:sel?"#2E2B27":isToday?"rgba(138,153,176,0.15)":"transparent",
                          color:sel?"#F7F6F3":dow===0?"#E07070":dow===6?"#8A99B0":"#2E2B27",
                          fontSize:11,cursor:"pointer",fontFamily:"inherit",
                          outline:isToday&&!sel?"2px solid #8A99B0":"none",outlineOffset:"-2px"
                        }}>{d}</button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
              {estDates.length>0&&<div style={{fontSize:11,color:"#8A99B0",marginTop:4}}>{estDates.sort().join(", ")} （{estDates.length}日）</div>}
            </div>

            {/* 請求額（自動計算）・原価合計 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{background:"rgba(124,163,122,0.08)",borderRadius:9,padding:"10px 12px",border:"1px solid rgba(124,163,122,0.2)"}}>
                <div style={{fontSize:10,color:"#7CA37A",marginBottom:2}}>請求額（税込・自動計算）</div>
                <div style={{fontSize:16,fontWeight:700,color:"#7CA37A"}}>¥{yen(estBillingSubtotal)}</div>
              </div>
              <div style={{background:"rgba(196,154,90,0.08)",borderRadius:9,padding:"10px 12px",border:"1px solid rgba(196,154,90,0.2)"}}>
                <div style={{fontSize:10,color:"#C49A5A",marginBottom:2}}>原価合計（税抜）</div>
                <div style={{fontSize:16,fontWeight:700,color:"#C49A5A"}}>¥{yen(estSubtotal)}</div>
              </div>
            </div>

            {/* 請求明細 */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#7CA37A",fontWeight:700,marginBottom:6}}>📋 請求明細（請求書に出力される）</div>
              <div style={{background:"#F8FBF8",borderRadius:8,overflow:"hidden",border:"1px solid rgba(124,163,122,0.25)"}}>
                <div style={{display:"grid",gridTemplateColumns:"2.5fr 0.8fr 0.6fr 1.2fr 1fr 24px",gap:0,padding:"6px 8px",background:"rgba(124,163,122,0.1)"}}>
                  {["品番・品名","数量","単位","単価","課税",""].map((h,i)=><div key={i} style={{fontSize:10,color:"#7CA37A",fontWeight:600}}>{h}</div>)}
                </div>
                {estBillingItems.map((it)=>(
                  <div key={it.id} style={{display:"grid",gridTemplateColumns:"2.5fr 0.8fr 0.6fr 1.2fr 1fr 24px",gap:2,padding:"6px 8px",borderTop:"1px solid rgba(124,163,122,0.15)",alignItems:"center"}}>
                    <input value={it.name} onChange={e=>updateEstBillingItem(it.id,"name",e.target.value)} placeholder="品名を入力" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input type="number" value={it.qty} onChange={e=>updateEstBillingItem(it.id,"qty",e.target.value)} style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input value={it.unit} onChange={e=>updateEstBillingItem(it.id,"unit",e.target.value)} placeholder="式" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input type="number" value={it.unitPrice} onChange={e=>updateEstBillingItem(it.id,"unitPrice",e.target.value)} placeholder="0" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <select value={it.taxRate||"10"} onChange={e=>updateEstBillingItem(it.id,"taxRate",e.target.value)} style={{background:"transparent",border:"none",fontSize:10,color:"#6E6A63",fontFamily:"inherit",outline:"none",width:"100%"}}>
                      <option value="10">10%</option><option value="8">8%</option><option value="0">非課税</option>
                    </select>
                    {estBillingItems.length>1&&<button onClick={()=>delEstBillingItem(it.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer",padding:0}}>×</button>}
                  </div>
                ))}
                <div style={{padding:"6px 8px",borderTop:"1px solid rgba(124,163,122,0.15)"}}>
                  <button onClick={addEstBillingItem} style={{background:"none",border:"none",color:"#7CA37A",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 請求行を追加</button>
                </div>
              </div>
            </div>

            {/* 原価明細 */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:"#C49A5A",fontWeight:700,marginBottom:6}}>💰 原価明細（内部管理用）</div>
              <div style={{background:"#F8F7F4",borderRadius:8,overflow:"hidden",border:"1px solid #E8E4DC"}}>
                <div style={{display:"grid",gridTemplateColumns:"2.5fr 0.8fr 0.6fr 1.2fr 1fr 24px",gap:0,padding:"6px 8px",background:"#F0EDE7"}}>
                  {["名称","数量","単位","単価","課税",""].map((h,i)=><div key={i} style={{fontSize:10,color:"#9E9890",fontWeight:500}}>{h}</div>)}
                </div>
                {estItems.map((it)=>(
                  <div key={it.id} style={{display:"grid",gridTemplateColumns:"2.5fr 0.8fr 0.6fr 1.2fr 1fr 24px",gap:2,padding:"6px 8px",borderTop:"1px solid #E8E4DC",alignItems:"center"}}>
                    <input value={it.name} onChange={e=>updateEstItem(it.id,"name",e.target.value)} placeholder="名称" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input type="number" value={it.qty} onChange={e=>updateEstItem(it.id,"qty",e.target.value)} style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input value={it.unit} onChange={e=>updateEstItem(it.id,"unit",e.target.value)} placeholder="式" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <input type="number" value={it.unitPrice} onChange={e=>updateEstItem(it.id,"unitPrice",e.target.value)} placeholder="0" style={{background:"transparent",border:"none",fontSize:12,color:"#2E2B27",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                    <select value={it.taxRate||"10"} onChange={e=>updateEstItem(it.id,"taxRate",e.target.value)} style={{background:"transparent",border:"none",fontSize:10,color:"#6E6A63",fontFamily:"inherit",outline:"none",width:"100%"}}>
                      <option value="10">10%</option><option value="8">8%</option><option value="0">非課税</option>
                    </select>
                    {estItems.length>1&&<button onClick={()=>delEstItem(it.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:14,cursor:"pointer",padding:0}}>×</button>}
                  </div>
                ))}
                <div style={{padding:"6px 8px",borderTop:"1px solid #E8E4DC"}}>
                  <button onClick={addEstItem} style={{background:"none",border:"none",color:"#8A99B0",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 原価行を追加</button>
                </div>
              </div>
            </div>

            <Inp value={estNote} onChange={e=>setEstNote(e.target.value)} placeholder="メモ（任意）" style={{marginBottom:10}}/>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={saveEst} variant="primary" style={{flex:1}}>{editEst?"更新":"追加"}</Btn>
              <Btn onClick={()=>{setShowEstForm(false);setEditEst(null);setEstShowHistory(false);}} variant="ghost">キャンセル</Btn>
            </div>
          </Card>}

          {!showEstForm&&<button onClick={()=>{setShowEstForm(true);setEditEst(null);setEstJobName("");setEstJobInput("");setEstClient("");setEstItems([{id:1,name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"}]);setEstBillingItems([{id:2,name:"",qty:"1",unit:"式",unitPrice:"",taxRate:"10"}]);setEstDates([isoDay(new Date())]);setEstNote("");setEstShowHistory(false);}} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #DDD8D0",borderRadius:10,color:"#C0BAB0",fontSize:13,marginBottom:12,cursor:"pointer",fontFamily:"inherit"}}>＋ 原価・請求を追加</button>}

          {filteredRecords.filter(r=>r.type==="estimate").length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
          {[...(filteredRecords||[])].filter(r=>r.type==="estimate").sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r=>{
            const costItems=r.estCostItems||r.estItems||[];
            const billingItems=r.estBillingItems||[];
            const costSub=costItems.reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
            const billing=parseInt(r.estBilling||0);
            const profit=billing-costSub;
            const dateLabel=(r.dates||[r.date]).sort();
            const dateDisplay=dateLabel.length===1?fmt(dateLabel[0]):fmt(dateLabel[0])+"〜"+fmt(dateLabel[dateLabel.length-1])+" ("+dateLabel.length+"日)";
            return(<div key={r.id} className="row" style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#2E2B27",marginBottom:1}}>{r.estJobName}</div>
                  {r.estClient&&<div style={{fontSize:11,color:"#8A99B0",marginBottom:2}}>元請：{r.estClient}</div>}
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>📅 {dateDisplay}</div>

                  {/* 請求明細 */}
                  {billingItems.filter(it=>it.name).length>0&&<>
                    <div style={{fontSize:10,color:"#7CA37A",fontWeight:700,marginBottom:4}}>📋 請求明細</div>
                    {billingItems.filter(it=>it.name).map((it,i)=>(
                      <div key={i} style={{fontSize:11,color:"#6E6A63",marginBottom:2,display:"flex",justifyContent:"space-between"}}>
                        <span>{it.name} {it.qty}{it.unit}</span>
                        <span>¥{yen(parseFloat(it.qty||0)*parseFloat(it.unitPrice||0))}</span>
                      </div>
                    ))}
                  </>}

                  {/* 原価明細 */}
                  {costItems.filter(it=>it.name).length>0&&<>
                    <div style={{fontSize:10,color:"#C49A5A",fontWeight:700,marginBottom:4,marginTop:billingItems.filter(it=>it.name).length>0?8:0}}>💰 原価明細</div>
                    {costItems.filter(it=>it.name).map((it,i)=>(
                      <div key={i} style={{fontSize:11,color:"#6E6A63",marginBottom:2,display:"flex",justifyContent:"space-between"}}>
                        <span>{it.name} {it.qty}{it.unit}</span>
                        <span>¥{yen(parseFloat(it.qty||0)*parseFloat(it.unitPrice||0))}</span>
                      </div>
                    ))}
                  </>}

                  {/* サマリー */}
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F0EDE7",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                    {[{l:"請求",v:billing,c:"#7CA37A"},{l:"原価",v:costSub,c:"#C49A5A"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",background:"#F8F7F4",borderRadius:6,padding:"5px 3px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                        <div style={{fontSize:9,color:"#C0BAB0"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {r.estNote&&<div style={{fontSize:11,color:"#9E9890",marginTop:6}}>{r.estNote}</div>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>startEditEst(r)} style={{background:"none",border:"none",color:"#C8C3BA",fontSize:12,cursor:"pointer"}}>編集</button>
                  <button className="x" onClick={()=>delEst(r.id)} style={{background:"none",border:"none",color:"#D8D3CA",fontSize:18,opacity:0,transition:"opacity 0.15s",cursor:"pointer"}}>×</button>
                </div>
              </div>
            </div>);
          })}
        </>}

        {costSubTab==="gantt"&&(()=>{
          const today=new Date();
          const start=new Date(today);start.setMonth(start.getMonth()-1);
          const end=new Date(today);end.setMonth(end.getMonth()+5);
          const totalDays=Math.ceil((end-start)/86400000);
          const jobsWithDates=data.jobs.filter(j=>j.startDate||j.endDate);
          const allJobs=data.jobs.length>0?data.jobs:[];
          const weeks=[];
          const cur=new Date(start);
          while(cur<end){weeks.push(new Date(cur));cur.setDate(cur.getDate()+7);}
          const todayX=Math.max(0,Math.min(100,((today-start)/86400000/totalDays)*100));
          return(<>
            <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>{start.getMonth()+1}月 〜 {end.getMonth()+1}月</div>
            {allJobs.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>工事タブで案件を追加してください</div>}
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <div style={{minWidth:600}}>
                {/* week headers */}
                <div style={{display:"flex",marginBottom:4,marginLeft:120}}>
                  {weeks.map((w,i)=>(
                    <div key={i} style={{flex:`0 0 ${(7/totalDays)*100}%`,fontSize:9,color:"#C0BAB0",borderLeft:"1px solid #F0EDE7",paddingLeft:2}}>
                      {(w.getMonth()+1)}/{w.getDate()}
                    </div>
                  ))}
                </div>
                {/* today line + rows */}
                {allJobs.map(j=>{
                  const s=j.startDate?new Date(j.startDate):null;
                  const e=j.endDate?new Date(j.endDate):null;
                  const sx=s?Math.max(0,((s-start)/86400000/totalDays)*100):null;
                  const ex=e?Math.min(100,((e-start)/86400000/totalDays)*100):null;
                  const stColor={"商談中":"#8A99B0","進行中":"#C49A5A","完了":"#7CA37A","中断":"#D8D3CA"}[j.status||"進行中"];
                  return(
                    <div key={j.id} style={{display:"flex",alignItems:"center",marginBottom:8,height:32}}>
                      <div style={{width:120,flexShrink:0,fontSize:11,color:"#2E2B27",paddingRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.name}</div>
                      <div style={{flex:1,position:"relative",height:20,background:"#F4F2EE",borderRadius:4}}>
                        {/* today line */}
                        <div style={{position:"absolute",left:todayX+"%",top:0,bottom:0,width:1,background:"#E07070",zIndex:2}}/>
                        {/* bar */}
                        {sx!==null&&ex!==null&&<div style={{
                          position:"absolute",left:sx+"%",width:(ex-sx)+"%",
                          top:2,bottom:2,borderRadius:3,background:stColor,opacity:0.8,
                          display:"flex",alignItems:"center",paddingLeft:4,overflow:"hidden"
                        }}>
                          <span style={{fontSize:9,color:"#fff",whiteSpace:"nowrap"}}>{j.client}</span>
                        </div>}
                        {(sx===null||ex===null)&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:4}}>
                          <span style={{fontSize:10,color:"#C0BAB0"}}>日程未設定</span>
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* legend */}
            <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
              {[["商談中","#8A99B0"],["進行中","#C49A5A"],["完了","#7CA37A"],["今日","#E07070"]].map(([l,c])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#9E9890"}}>
                  <div style={{width:12,height:4,background:c,borderRadius:2}}/>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </>);
        })()}

        {costSubTab==="summary"&&<>
          {(filteredRecords||[]).filter(r=>r.type==="estimate").length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>記録がありません</div>}
          {(()=>{
            const recs=(filteredRecords||[]).filter(r=>r.type==="estimate");
            const totalBilling=recs.reduce((s,r)=>s+parseInt(r.estBilling||0),0);
            const totalCost=recs.reduce((s,r)=>{
              const items=r.estItems||[];
              const t10=items.filter(it=>it.taxRate==="10"||!it.taxRate).reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
              const t8=items.filter(it=>it.taxRate==="8").reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
              const t0=items.filter(it=>it.taxRate==="0").reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
              return s+t10+t8+t0+Math.round(t10*0.1)+Math.round(t8*0.08);
            },0);
            const totalProfit=totalBilling-totalCost;
            return(<>
              <Card style={{marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
                  {[{l:"売上",v:totalBilling,c:"#7CA37A"},{l:"原価",v:totalCost,c:"#C49A5A"},{l:"粗利",v:totalProfit,c:totalProfit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center",padding:"10px 4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                      <div style={{fontSize:16,fontWeight:700,color:s.c}}>¥{yen(s.v)}</div>
                      <div style={{fontSize:10,color:"#C0BAB0",marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </Card>
              {recs.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r=>{
                const items=r.estItems||[];
                const t10=items.filter(it=>it.taxRate==="10"||!it.taxRate).reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
                const t8=items.filter(it=>it.taxRate==="8").reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
                const t0=items.filter(it=>it.taxRate==="0").reduce((s,it)=>s+parseFloat(it.qty||0)*parseFloat(it.unitPrice||0),0);
                const tax=Math.round(t10*0.1)+Math.round(t8*0.08);
                const cost=t10+t8+t0+tax;
                const billing=parseInt(r.estBilling||0);
                const profit=billing-cost;
                return(<div key={r.id} style={{background:"#fff",border:"1px solid #EAE7E1",borderRadius:10,padding:"11px 14px",marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:500,color:"#2E2B27",marginBottom:1}}>{r.estJobName}</div>
                  {r.estClient&&<div style={{fontSize:11,color:"#8A99B0",marginBottom:2}}>元請：{r.estClient}</div>}
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>{fmt(r.date)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                    {[{l:"売上",v:billing,c:"#7CA37A"},{l:"原価",v:cost,c:"#C49A5A"},{l:"粗利",v:profit,c:profit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",padding:"6px 4px",background:"#F8F7F4",borderRadius:6}}>
                        <div style={{fontSize:12,fontWeight:600,color:s.c}}>¥{yen(s.v)}</div>
                        <div style={{fontSize:10,color:"#C0BAB0"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>);
              })}
            </>);
          })()}
        </>}

        {costSubTab==="invoice"&&(()=>{
          // 元請け一覧（estClientが入っているもの）
          const estRecs=(data.workRecords||[]).filter(r=>r.type==="estimate");
          const allClients=[...new Set(estRecs.map(r=>r.estClient||"").filter(Boolean))];
          const selClient=invoiceClient||allClients[0]||"";
          // 請求書対象月一覧
          const allInvMonths=["all",...new Set(estRecs.map(r=>mKey(r.date)).filter(Boolean))].sort().reverse();
          // 対象レコード
          const targetRecs=estRecs.filter(r=>{
            const clientMatch=!selClient||r.estClient===selClient;
            const monthMatch=invoiceMonth==="all"||mKey(r.date)===invoiceMonth;
            return clientMatch&&monthMatch;
          }).sort((a,b)=>new Date(a.date)-new Date(b.date));

          // 明細展開（estBillingItemsを優先、なければestItemsをフォールバック）
          const lineItems=[];
          targetRecs.forEach(r=>{
            const dates=r.dates||[r.date];
            const lastDate=dates[dates.length-1];
            const d=new Date(lastDate);
            const dateStr=`${d.getMonth()+1}/${d.getDate()}`;
            const prefix=`[${dateStr} 納品分] ${r.estJobName}`;
            const items=r.estBillingItems||r.estItems||[];
            items.filter(it=>it.name.trim()).forEach(it=>{
              const amt=Math.round(parseFloat(it.qty||0)*parseFloat(it.unitPrice||0));
              lineItems.push({label:`${prefix}　${it.name}`,qty:it.qty,unit:it.unit||"式",price:it.unitPrice||0,amount:amt,taxRate:it.taxRate||"10"});
            });
          });

          const subtotal10=lineItems.filter(l=>l.taxRate==="10"||!l.taxRate).reduce((s,l)=>s+l.amount,0);
          const subtotal8=lineItems.filter(l=>l.taxRate==="8").reduce((s,l)=>s+l.amount,0);
          const subtotal0=lineItems.filter(l=>l.taxRate==="0").reduce((s,l)=>s+l.amount,0);
          const tax=Math.round(subtotal10*0.1)+Math.round(subtotal8*0.08);
          const grandTotal=subtotal10+subtotal8+subtotal0+tax;

          const monthLabel=invoiceMonth==="all"?"全期間":invoiceMonth.replace("-","年")+"月";
          const today=new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\//g,"年").replace("年","年").replace("/","月")+"日";
          const defInvNum=invoiceMonth==="all"?"INV-ALL":invoiceMonth.replace("-","")+"-001";

          const printInvoice=()=>{
            const rows=lineItems.map(l=>`<tr><td>${l.label}</td><td style="text-align:center">${parseFloat(l.qty).toLocaleString()} ${l.unit}</td><td style="text-align:right">${parseInt(l.price).toLocaleString()}</td><td style="text-align:right">${l.amount.toLocaleString()}</td></tr>`).join("");
            const win=window.open("","_blank");
            win.document.write(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>請求書</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;padding:36px 40px;background:#fff;color:#111;font-size:12px}.top-right{text-align:right;margin-bottom:6px}.inv-title{text-align:center;font-size:28px;font-weight:700;letter-spacing:8px;margin-bottom:20px}.meta{display:flex;justify-content:space-between;margin-bottom:20px}.client-name{font-size:16px;font-weight:700;border-bottom:2px solid #111;padding-bottom:3px;margin-bottom:8px}.amount-val{font-size:18px;font-weight:700;margin-top:4px}.sender{font-size:11px;line-height:1.7;text-align:right}.sender .co{font-size:13px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#E8E4DC;font-size:11px;padding:7px 10px;border:1px solid #CCC8C0;text-align:left}th:last-child{text-align:right}td{padding:7px 10px;border:1px solid #DDD8D0;font-size:11px}tr:nth-child(even){background:#FAFAF8}.tot-lbl{background:#F0EDE7;font-weight:600;text-align:center!important}.tot-val{text-align:right!important;font-weight:600}.grand-lbl{background:#E8E4DC;font-weight:700;text-align:center!important}.grand-val{text-align:right!important;font-weight:800;font-size:14px}.bank{margin-top:18px;font-size:11px}@media print{@page{size:A4;margin:15mm}}</style></head><body>
              <div class="top-right">${today}<br>請求番号: ${invoiceNum||defInvNum}</div>
              <div class="inv-title">請求書</div>
              <div class="meta">
                <div>
                  <div class="client-name">${selClient}</div>
                  <div style="margin-top:8px">件名：${monthLabel}分　ご請求書</div>
                  <div style="margin-top:6px">下記のとおりご請求申し上げます。</div>
                  <div style="margin-top:12px;font-size:12px">ご請求金額</div>
                  <div class="amount-val">¥ ${grandTotal.toLocaleString()} -</div>
                </div>
                <div class="sender">
                  <div class="co">STONA</div>
                  <div>小野浩一</div>
                  <div style="margin-top:4px">〒630-8144 奈良県奈良市</div>
                  <div>東九条町1192-6-207</div>
                  <div>TEL: 090-5375-6016</div>
                  <div>k.ono.kw01@gmail.com</div>
                </div>
              </div>
              <table>
                <thead><tr><th style="width:50%">品番・品名</th><th style="width:15%;text-align:center">数量</th><th style="width:15%;text-align:right">単価</th><th style="width:20%;text-align:right">金額</th></tr></thead>
                <tbody>${rows}</tbody>
                <tbody>
                  <tr><td colspan="2"></td><td class="tot-lbl">小計</td><td class="tot-val">¥ ${(subtotal10+subtotal8+subtotal0).toLocaleString()}</td></tr>
                  <tr><td colspan="2"></td><td class="tot-lbl">消費税 (10%)</td><td class="tot-val">${tax.toLocaleString()}</td></tr>
                  <tr><td colspan="2"></td><td class="grand-lbl">合計</td><td class="grand-val">${grandTotal.toLocaleString()}</td></tr>
                </tbody>
              </table>
              <div class="bank"><strong>お振込先：</strong><br>住信ＳＢＩネット銀行　イルカ支店　普通7283298</div>
            </body></html>`);
            win.document.close();setTimeout(()=>win.print(),500);
          };

          return(<>
            {/* フィルター */}
            <Card style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:8}}>元請けを選択</div>
              {allClients.length===0
                ?<div style={{fontSize:13,color:"#C0BAB0",textAlign:"center",padding:"12px 0"}}>原価記録に「元請け」を入力すると請求書を生成できます</div>
                :<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {allClients.map(c=>(
                    <button key={c} onClick={()=>setInvoiceClient(c)} style={{padding:"5px 12px",fontSize:12,borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:selClient===c?"1.5px solid #2E2B27":"1.5px solid #E2DDD5",background:selClient===c?"#2E2B27":"transparent",color:selClient===c?"#F7F6F3":"#A09790"}}>{c}</button>
                  ))}
                </div>
              }
              <div style={{fontSize:11,color:"#C0BAB0",marginBottom:6}}>月を選択</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {allInvMonths.map(m=>(
                  <button key={m} onClick={()=>setInvoiceMonth(m)} style={{padding:"5px 12px",fontSize:11,borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:invoiceMonth===m?"1.5px solid #C49A5A":"1.5px solid #E2DDD5",background:invoiceMonth===m?"#C49A5A":"transparent",color:invoiceMonth===m?"#fff":"#A09790",whiteSpace:"nowrap"}}>
                    {m==="all"?"全期間":m.replace("-","年")+"月"}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"#C0BAB0",marginBottom:4}}>請求番号</div>
                  <Inp value={invoiceNum} onChange={e=>setInvoiceNum(e.target.value)} placeholder={defInvNum}/>
                </div>
              </div>
            </Card>

            {/* 請求書プレビュー */}
            {lineItems.length===0
              ?<div style={{textAlign:"center",padding:"32px 0",color:"#CCC7BE",fontSize:13}}>該当する明細がありません</div>
              :<>
                <Card style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600}}>{selClient} / {monthLabel}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#2E2B27"}}>¥{yen(grandTotal)}</div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                      <thead>
                        <tr style={{background:"#F0EDE7"}}>
                          {["品番・品名","数量","単価","金額"].map((h,i)=><th key={i} style={{padding:"6px 8px",textAlign:i===0?"left":"right",color:"#5A5550",fontWeight:700,whiteSpace:"nowrap",border:"1px solid #E8E4DC"}}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((l,i)=>(
                          <tr key={i} style={{background:i%2===0?"#fff":"#FAFAF8"}}>
                            <td style={{padding:"6px 8px",border:"1px solid #E8E4DC",color:"#2E2B27"}}>{l.label}</td>
                            <td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",color:"#2E2B27",whiteSpace:"nowrap"}}>{parseFloat(l.qty).toLocaleString()} {l.unit}</td>
                            <td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",color:"#2E2B27",whiteSpace:"nowrap"}}>¥{parseInt(l.price).toLocaleString()}</td>
                            <td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",fontWeight:600,color:"#2E2B27",whiteSpace:"nowrap"}}>¥{l.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr><td colSpan={2}/><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",background:"#F0EDE7",fontWeight:600,textAlign:"center",fontSize:11}}>小計</td><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",fontWeight:600}}>¥{yen(subtotal10+subtotal8+subtotal0)}</td></tr>
                        <tr><td colSpan={2}/><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",background:"#F0EDE7",fontWeight:600,textAlign:"center",fontSize:11}}>消費税(10%)</td><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",fontWeight:600}}>¥{yen(tax)}</td></tr>
                        <tr><td colSpan={2}/><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",background:"#E8E4DC",fontWeight:700,textAlign:"center",fontSize:12}}>合計</td><td style={{padding:"6px 8px",border:"1px solid #E8E4DC",textAlign:"right",fontWeight:800,fontSize:14,color:"#2E2B27"}}>¥{yen(grandTotal)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Btn onClick={printInvoice} variant="primary" style={{width:"100%"}}>🖨️ 請求書を印刷 / PDF保存</Btn>
              </>
            }
          </>);
        })()}

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
            {[{l:"売上",v:monthBilling,c:"#8A99B0"},{l:"原価",v:monthTotalCost,c:"#C49A5A"},{l:"粗利",v:monthProfit,c:monthProfit>=0?"#7CA37A":"#E07070"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"4px",borderRight:i<2?"1px solid #F0EDE7":"none"}}>
                <div style={{fontSize:12,color:s.c,fontWeight:600}}>¥{yen(s.v)}</div>
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

import React, { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Ethnicity config ──────────────────────────────────────────────────────
const ETHNICITIES = [
  { id:"general",       label:"General Population", subtitle:"", note:"Standard ACSM/AHA/ADA norms.", adjustments:{} },
  { id:"south_asian",   label:"South Asian", subtitle:"Indian, Pakistani, Bangladeshi, Sri Lankan",
    note:"WHO 2004: higher cardiometabolic risk at lower thresholds.",
    adjustments:{ bodyfat:{ optMaxD:-3 }, glucose:{ optMaxD:-5 } } },
  { id:"black_african", label:"Black / African American", subtitle:"African American, African Caribbean",
    note:"AHA/ACC 2017: earlier hypertension onset, higher CVD risk.",
    adjustments:{ bp:{ optMaxD:-5 }, glucose:{ optMaxD:-5 } } },
  { id:"hispanic",      label:"Hispanic / Latino", subtitle:"Mexican, Puerto Rican, Central/South American",
    note:"ADA/CDC: highest T2D prevalence; tighter glucose targets.",
    adjustments:{ glucose:{ optMaxD:-5 }, bodyfat:{ optMaxD:-2 } } },
  { id:"east_asian",    label:"East Asian", subtitle:"Chinese, Japanese, Korean, Taiwanese",
    note:"WHO 2004: cardiometabolic risk at lower body fat levels.",
    adjustments:{ bodyfat:{ optMaxD:-3 }, glucose:{ optMaxD:-3 } } },
];

// ── Base metric definitions ───────────────────────────────────────────────
const MB = {
  vo2max:  { label:"VO₂ Max",           unit:"mL/kg/min", higherIsBetter:true,  dp:1, source:"ACSM by sex/age",
    description:"Cardiorespiratory fitness — #1 longevity predictor",
    howTo:"Apple Watch (auto-synced) or 12-min Cooper Run",
    female:{ opt:{min:38,max:44}, cMin:15, cMax:55, ranges:[
      {label:"Poor",      lo:15,   hi:27,   c:"#ff6b6b"},
      {label:"Fair",      lo:27,   hi:31.5, c:"#f0c060"},
      {label:"Good",      lo:31.5, hi:38,   c:"#7feba1"},
      {label:"Excellent", lo:38,   hi:55,   c:"#00ffa3"}]},
    male:{ opt:{min:46,max:56}, cMin:20, cMax:70, ranges:[
      {label:"Poor",      lo:20, hi:30, c:"#ff6b6b"},
      {label:"Fair",      lo:30, hi:38, c:"#f0c060"},
      {label:"Good",      lo:38, hi:46, c:"#7feba1"},
      {label:"Excellent", lo:46, hi:70, c:"#00ffa3"}]}},
  rhr:     { label:"Resting Heart Rate", unit:"bpm",       higherIsBetter:false, dp:0, source:"AHA adult norms (unisex)",
    description:"Cardiovascular efficiency & autonomic health",
    howTo:"Apple Watch (auto-synced) or 60-sec morning count",
    female:{ opt:{min:40,max:60}, cMin:40, cMax:100, ranges:[
      {label:"Athlete",   lo:40, hi:56,  c:"#00ffa3"},
      {label:"Excellent", lo:56, hi:66,  c:"#7feba1"},
      {label:"Good",      lo:66, hi:76,  c:"#f0c060"},
      {label:"High",      lo:76, hi:100, c:"#ff6b6b"}]},
    male:{ opt:{min:40,max:60}, cMin:40, cMax:100, ranges:[
      {label:"Athlete",   lo:40, hi:56,  c:"#00ffa3"},
      {label:"Excellent", lo:56, hi:66,  c:"#7feba1"},
      {label:"Good",      lo:66, hi:76,  c:"#f0c060"},
      {label:"High",      lo:76, hi:100, c:"#ff6b6b"}]}},
  bp:      { label:"Blood Pressure",     unit:"mmHg",      higherIsBetter:false, dp:0, source:"AHA 2017", secondary:true,
    description:"Systolic pressure — vascular age indicator",
    howTo:"Paired BP cuff via Apple Health or Omron cuff (~$30)",
    female:{ opt:{min:90,max:120}, cMin:90, cMax:160, ranges:[
      {label:"Normal",   lo:90,  hi:120, c:"#00ffa3"},
      {label:"Elevated", lo:120, hi:130, c:"#7feba1"},
      {label:"Stage 1",  lo:130, hi:140, c:"#f0c060"},
      {label:"Stage 2",  lo:140, hi:160, c:"#ff6b6b"}]},
    male:{ opt:{min:90,max:120}, cMin:90, cMax:160, ranges:[
      {label:"Normal",   lo:90,  hi:120, c:"#00ffa3"},
      {label:"Elevated", lo:120, hi:130, c:"#7feba1"},
      {label:"Stage 1",  lo:130, hi:140, c:"#f0c060"},
      {label:"Stage 2",  lo:140, hi:160, c:"#ff6b6b"}]}},
  glucose: { label:"Fasting Glucose",    unit:"mg/dL",     higherIsBetter:false, dp:0, source:"ADA + Attia",
    description:"Metabolic health & insulin sensitivity",
    howTo:"Apple Health (paired glucometer) or ReliOn (~$20), 8+ hrs fasted",
    female:{ opt:{min:60,max:85}, cMin:60, cMax:145, ranges:[
      {label:"Optimal",      lo:60,  hi:85,  c:"#00ffa3"},
      {label:"Normal",       lo:85,  hi:100, c:"#7feba1"},
      {label:"Pre-diabetic", lo:100, hi:126, c:"#f0c060"},
      {label:"Diabetic",     lo:126, hi:145, c:"#ff6b6b"}]},
    male:{ opt:{min:60,max:85}, cMin:60, cMax:145, ranges:[
      {label:"Optimal",      lo:60,  hi:85,  c:"#00ffa3"},
      {label:"Normal",       lo:85,  hi:100, c:"#7feba1"},
      {label:"Pre-diabetic", lo:100, hi:126, c:"#f0c060"},
      {label:"Diabetic",     lo:126, hi:145, c:"#ff6b6b"}]}},
  bodyfat: { label:"Body Fat %",         unit:"%",         higherIsBetter:false, dp:1, source:"ACE by sex",
    description:"Visceral fat proxy & metabolic risk marker",
    howTo:"Apple Health (smart scale sync) or Withings/Renpho scale (~$40)",
    female:{ opt:{min:14,max:20}, cMin:10, cMax:45, ranges:[
      {label:"Athletic", lo:10, hi:20, c:"#00ffa3"},
      {label:"Fit",      lo:20, hi:25, c:"#7feba1"},
      {label:"Average",  lo:25, hi:32, c:"#f0c060"},
      {label:"High",     lo:32, hi:45, c:"#ff6b6b"}]},
    male:{ opt:{min:6, max:17}, cMin:5,  cMax:40, ranges:[
      {label:"Athletic", lo:5,  hi:17, c:"#00ffa3"},
      {label:"Fit",      lo:17, hi:22, c:"#7feba1"},
      {label:"Average",  lo:22, hi:28, c:"#f0c060"},
      {label:"High",     lo:28, hi:40, c:"#ff6b6b"}]}},
};
const MK = Object.keys(MB);

function getM(id, sex="female", eth="general") {
  const base = MB[id]; if(!base) return null;
  const sc = JSON.parse(JSON.stringify(base[sex]||base.female));
  const adj = ETHNICITIES.find(e=>e.id===eth)?.adjustments?.[id];
  if(adj?.optMaxD) sc.opt.max = Math.max(sc.opt.min+1, sc.opt.max+adj.optMaxD);
  const {female:_f,male:_m,...rest} = base;
  return {...rest,...sc};
}

// ── Scoring ───────────────────────────────────────────────────────────────
const ST = [15,45,72,100];
function getScore(id, val, sex="female", eth="general") {
  const m=getM(id,sex,eth); if(!m||val==null) return null;
  const {ranges:R,higherIsBetter:hib}=m; const n=R.length;
  for(let i=0;i<n;i++){
    const r=R[i];
    if(!(val>=r.lo&&(i===n-1?val<=r.hi:val<R[i+1].lo))) continue;
    const pos=r.hi>r.lo?(val-r.lo)/(r.hi-r.lo):0;
    if(hib){ const s0=ST[i],s1=ST[Math.min(i+1,n-1)]; return Math.min(100,s0+pos*(s1-s0)); }
    else    { const s0=ST[n-1-i],s1=ST[Math.max(n-2-i,0)]; return Math.max(15,s0-pos*(s0-s1)); }
  }
  return hib?(val>R[n-1].hi?100:15):(val<R[0].lo?100:15);
}
const gC=s=>s>=85?"#00ffa3":s>=65?"#7feba1":s>=45?"#f0c060":"#ff6b6b";
const gL=s=>s>=85?"Optimal":s>=65?"Good":s>=45?"Fair":"Needs Work";

function getBioAge(entries,age,sex,eth){
  const sc=MK.map(id=>{const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];return l?getScore(id,l.value,sex,eth):null;}).filter(Boolean);
  if(!sc.length)return null;
  const avg=sc.reduce((a,b)=>a+b,0)/sc.length;
  return Math.max(18,age-(15-((100-avg)/100)*15));
}

// ── Recommendations ───────────────────────────────────────────────────────
const RECS = {
  vo2max:{
    good:{action:"Maintain Zone 2 + one interval session/week",detail:"Keep 150–180 min/week at conversational pace. Add 4×4 min at 90–95% max HR once weekly. VO₂Max updates automatically after outdoor Apple Watch runs."},
    fair:{action:"Add structured cardio 4× per week",detail:"Build from 30-min brisk walks to Zone 2 jogging. Each MET improvement reduces all-cause mortality ~13%. Track progress via Apple Watch outdoor workouts."},
    poor:{action:"Begin daily 20-min walks immediately",detail:"Start with low-impact consistency. Within 4–8 weeks of regular Zone 2 activity, VO₂Max typically improves 1–3 mL/kg/min. Consider a supervised fitness assessment."},
  },
  rhr:{
    good:{action:"Protect sleep quality to sustain low RHR",detail:"Prioritize 7–9 hrs sleep. Limit alcohol (raises RHR 3–5 bpm). Consistent wake time and daily HRV breathing (box or 4-7-8) maintain gains."},
    fair:{action:"Improve sleep + add Zone 2 cardio",detail:"Each week of consistent cardio lowers RHR ~1 bpm. Aim for 7–8 hrs sleep, reduce caffeine after 2pm, and practice daily diaphragmatic breathing."},
    poor:{action:"Rule out clinical causes, then lifestyle overhaul",detail:"Persistent RHR >76 bpm warrants a physician visit. After clearance: prioritize sleep consistency, reduce alcohol, begin 20-min daily walks, and track weekly in Apple Watch."},
  },
  bp:{
    good:{action:"Sustain sodium ≤ 2,300 mg/day + DASH diet",detail:"BP is in normal range. Continue sodium awareness and current exercise. Home cuff readings 2× per week catch any drift early."},
    fair:{action:"DASH diet + sodium reduction to <2,300 mg/day",detail:"Increase potassium-rich foods (bananas, leafy greens). Add 30 min moderate cardio 5× week. DASH diet reduces systolic by 8–14 mmHg on average."},
    poor:{action:"Consult physician + immediate lifestyle changes",detail:"Stage 1+ BP needs medical evaluation. Alongside doctor guidance: eliminate processed foods, sodium <1,500 mg/day, daily walking. Each kg of weight loss ≈ 1 mmHg reduction."},
  },
  glucose:{
    good:{action:"Maintain low-glycemic nutrition + post-meal walks",detail:"Glucose in optimal range. Limit refined carbs. A 10–15 min walk after meals blunts glucose spikes by 20–30 mg/dL. Consider a CGM for deeper insight."},
    fair:{action:"Cut refined carbs + 10-min post-meal walks",detail:"Eliminate ultra-processed carbs and sugary drinks. Prioritize fiber-first meal sequencing (vegetables before carbs). Walking after meals is highly effective."},
    poor:{action:"Medical evaluation + dietary overhaul",detail:"Pre-diabetic or higher requires physician follow-up. Eliminate added sugar and refined grains. Increase fiber to 30–40 g/day. Resistance training dramatically improves insulin sensitivity."},
  },
  bodyfat:{
    good:{action:"Preserve lean mass with resistance training 2–3×/week",detail:"Body fat in athletic or fit range. Maintain with compound lifts. Protein 0.7–1g/lb body weight protects muscle. Avoid excessive caloric restriction."},
    fair:{action:"Resistance training 3×/week + protein target",detail:"Add 3× weekly strength training (squats, deadlifts, rows). Increase protein to 0.7–1g/lb/day. A 250–500 kcal/day deficit is sustainable and safe."},
    poor:{action:"Structured fat-loss program with medical oversight",detail:"Elevated body fat increases insulin resistance and inflammation. Start: 150+ min/week mixed cardio + strength, 1g/lb protein daily, eliminate ultra-processed food, track weekly with your smart scale."},
  },
};

// ── Seed data ─────────────────────────────────────────────────────────────
// Seed dates are computed relative to today so snapshot windows always have data
const _sd=(daysAgo)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);return d.toISOString().substring(0,10);};
const SEED=[
  // vo2max — improving trend over 9 months
  {id:"s1",metricId:"vo2max",value:33.5,date:_sd(270),note:"Baseline"},
  {id:"s2",metricId:"vo2max",value:34.8,date:_sd(180)},
  {id:"s3",metricId:"vo2max",value:36.1,date:_sd(90)},
  {id:"s4",metricId:"vo2max",value:36.9,date:_sd(45)},
  {id:"s5",metricId:"vo2max",value:37.9,date:_sd(7),note:"Zone 2"},
  // rhr — improving trend
  {id:"s6",metricId:"rhr",value:62,date:_sd(270),note:"Baseline"},
  {id:"s7",metricId:"rhr",value:58,date:_sd(180)},
  {id:"s8",metricId:"rhr",value:55,date:_sd(90)},
  {id:"s9",metricId:"rhr",value:53,date:_sd(45)},
  {id:"s10",metricId:"rhr",value:51,date:_sd(7)},
  // bp — improving
  {id:"s11",metricId:"bp",value:128,secondary:82,date:_sd(270),note:"Baseline"},
  {id:"s12",metricId:"bp",value:122,secondary:79,date:_sd(180)},
  {id:"s13",metricId:"bp",value:118,secondary:76,date:_sd(90)},
  {id:"s14",metricId:"bp",value:115,secondary:75,date:_sd(45)},
  {id:"s15",metricId:"bp",value:112,secondary:74,date:_sd(7),note:"Low sodium"},
  // glucose — improving
  {id:"s16",metricId:"glucose",value:98,date:_sd(270),note:"Baseline"},
  {id:"s17",metricId:"glucose",value:93,date:_sd(180)},
  {id:"s18",metricId:"glucose",value:88,date:_sd(90)},
  {id:"s19",metricId:"glucose",value:85,date:_sd(45)},
  {id:"s20",metricId:"glucose",value:82,date:_sd(7)},
  // bodyfat — improving
  {id:"s21",metricId:"bodyfat",value:26.5,date:_sd(270),note:"Baseline"},
  {id:"s22",metricId:"bodyfat",value:24.2,date:_sd(180)},
  {id:"s23",metricId:"bodyfat",value:22.1,date:_sd(90)},
  {id:"s24",metricId:"bodyfat",value:21.0,date:_sd(45)},
  {id:"s25",metricId:"bodyfat",value:20.4,date:_sd(7),note:"Resistance training"},
];

// ── Apple Health streaming parser ─────────────────────────────────────────
const AHT={
  HKQuantityTypeIdentifierVO2Max:"vo2max",
  HKQuantityTypeIdentifierRestingHeartRate:"rhr",
  HKQuantityTypeIdentifierBloodPressureSystolic:"bp_sys",
  HKQuantityTypeIdentifierBloodPressureDiastolic:"bp_dia",
  HKQuantityTypeIdentifierBloodGlucose:"glucose",
  HKQuantityTypeIdentifierBodyFatPercentage:"bodyfat",
};
async function parseAH(file,onProgress){
  // ── Shared record processing (same for ZIP and raw XML paths) ────────────
  const attr=(n,t)=>{const m=t.match(new RegExp(`\\b${n}="([^"]*)"`));return m?m[1]:null;};
  const bpS={},bpD={},byMD={};let dSex=null,dDOB=null;
  const proc=buf=>{
    const re=/<Record\b[^>]*?(?:\/>|>[\s\S]*?<\/Record>)/g;let m,last=0;
    while((m=re.exec(buf))!==null){
      const rec=m[0];const type=attr("type",rec);const mid=AHT[type];last=m.index+m[0].length;if(!mid)continue;
      const rv=parseFloat(attr("value",rec));const unit=(attr("unit",rec)||"").toLowerCase();
      const rd=attr("startDate",rec)||attr("creationDate",rec)||"";if(!rd||isNaN(rv))continue;
      const date=rd.substring(0,10);let val=rv;
      if(type==="HKQuantityTypeIdentifierBodyFatPercentage"&&val<=1)val=parseFloat((val*100).toFixed(2));
      if(type==="HKQuantityTypeIdentifierBloodGlucose"&&(unit.includes("mmol")||val<25))val=Math.round(val*18.0182);
      if(mid==="bp_sys")bpS[date]=val;
      else if(mid==="bp_dia")bpD[date]=val;
      else{if(!byMD[mid])byMD[mid]={};if(!byMD[mid][date])byMD[mid][date]=[];byMD[mid][date].push(val);}
    }
    return last;
  };
  const exMeta=t=>{
    const sx=t.match(/HKCharacteristicTypeIdentifierBiologicalSex="([^"]*)"/);
    if(sx){if(sx[1].includes("Female"))dSex="female";else if(sx[1].includes("Male"))dSex="male";}
    const db=t.match(/HKCharacteristicTypeIdentifierDateOfBirth="(\d{4}-\d{2}-\d{2})"/);
    if(db)dDOB=db[1];
  };

  if(file.name.toLowerCase().endsWith(".zip")){
    // ── Native ZIP parser — no JSZip, no size validation, no external deps ──
    // Root cause of "uncompressed data size mismatch": iOS writes sizes as 0 in
    // local file headers (uses data descriptors, ZIP flag bit 3). JSZip validates
    // decompressed length against those zero values → mismatch error.
    // Fix: read authoritative sizes from the central directory, decompress with
    // the native browser DecompressionStream API, stream chunks to proc().

    const ab=await file.arrayBuffer();
    const view=new DataView(ab);
    const bytes=new Uint8Array(ab);
    const u32=(o)=>view.getUint32(o,true);
    const u16=(o)=>view.getUint16(o,true);
    const u64=(o)=>Number(view.getBigUint64(o,true));

    // 1. Find End of Central Directory (EOCD) — scan backwards for signature
    let eocd=-1;
    for(let i=ab.byteLength-22;i>=Math.max(0,ab.byteLength-65558);i--){
      if(u32(i)===0x06054b50){eocd=i;break;}
    }
    if(eocd===-1)throw new Error("Not a valid ZIP file — EOCD record not found.");

    // 2. Central directory offset & size (with ZIP64 fallback)
    let cdOffset=u32(eocd+16),cdSize=u32(eocd+12);
    if(eocd>=20&&u32(eocd-20)===0x07064b50){
      const z64loc=eocd-20;
      const z64off=u64(z64loc+8);
      if(z64off<ab.byteLength&&u32(z64off)===0x06064b50){
        cdSize=u64(z64off+40);cdOffset=u64(z64off+48);
      }
    }

    // 3. Scan central directory for export.xml entry
    let entry=null;
    const tdec=new TextDecoder();
    let pos=cdOffset;
    while(pos<cdOffset+cdSize){
      if(u32(pos)!==0x02014b50)break;
      let compSize=u32(pos+20),uncompSize=u32(pos+24),localOff=u32(pos+42);
      const compression=u16(pos+10),fnLen=u16(pos+28),extraLen=u16(pos+30),commentLen=u16(pos+32);
      const fname=tdec.decode(bytes.subarray(pos+46,pos+46+fnLen));

      // Resolve ZIP64 extended fields in extra area
      if(compSize===0xFFFFFFFF||uncompSize===0xFFFFFFFF||localOff===0xFFFFFFFF){
        let ep=pos+46+fnLen,epEnd=ep+extraLen;
        while(ep+4<=epEnd){
          const eid=u16(ep),esz=u16(ep+2);ep+=4;
          if(eid===0x0001){
            if(uncompSize===0xFFFFFFFF){uncompSize=u64(ep);ep+=8;}
            if(compSize===0xFFFFFFFF){compSize=u64(ep);ep+=8;}
            if(localOff===0xFFFFFFFF){localOff=u64(ep);}
            break;
          }
          ep+=esz;
        }
      }

      if(fname==="apple_health_export/export.xml"||fname==="export.xml"){
        entry={compression,compSize,localOff};break;
      }
      pos+=46+fnLen+extraLen+commentLen;
    }
    if(!entry)throw new Error("Could not find export.xml inside the ZIP.\n\nPlease export from: iPhone Health app → Profile photo → Export All Health Data.");

    // 4. Locate compressed data via local file header
    if(u32(entry.localOff)!==0x04034b50)throw new Error("Invalid local file header.");
    const lfnLen=u16(entry.localOff+26),lextraLen=u16(entry.localOff+28);
    const dataStart=entry.localOff+30+lfnLen+lextraLen;
    const compSlice=bytes.subarray(dataStart,dataStart+entry.compSize);

    if(entry.compression===0){
      // Stored (no compression)
      const text=tdec.decode(compSlice);exMeta(text);proc(text);
    }else if(entry.compression===8){
      // Deflate — stream through native DecompressionStream in 64 KB chunks
      // Peak memory: ~compSlice size (≈22 MB for typical AH export) + small text buffer
      const ds=new DecompressionStream("deflate-raw");
      const writer=ds.writable.getWriter();
      const reader=ds.readable.getReader();
      const CHUNK=65536;
      let written=0,textBuf="",firstChunk=true;
      const chunkDec=new TextDecoder("utf-8",{fatal:false});

      const writeLoop=async()=>{
        while(written<compSlice.length){
          const end=Math.min(written+CHUNK,compSlice.length);
          await writer.write(compSlice.subarray(written,end));
          written=end;
        }
        await writer.close();
      };

      const readLoop=async()=>{
        while(true){
          const{value,done}=await reader.read();
          if(done)break;
          const chunk=chunkDec.decode(value,{stream:true});
          if(firstChunk){exMeta(chunk);firstChunk=false;}
          textBuf+=chunk;
          const le=proc(textBuf);
          const ti=textBuf.lastIndexOf("<Record",le);
          textBuf=(ti!==-1&&ti>le-32768)?textBuf.slice(ti):"";
          if(onProgress)onProgress(Math.min(99,Math.round((written/compSlice.length)*100)));
        }
        const tail=chunkDec.decode();
        if(tail){textBuf+=tail;if(textBuf)proc(textBuf);}
      };

      await Promise.all([writeLoop(),readLoop()]);
    }else{
      throw new Error(`Unsupported ZIP compression method ${entry.compression}. Expected Deflate (8).`);
    }
  }else{
    // Raw XML file
    const t=await file.text();exMeta(t);proc(t);
  }

  new Set([...Object.keys(bpS),...Object.keys(bpD)]).forEach(date=>{if(bpS[date]){if(!byMD.bp)byMD.bp={};byMD.bp[date]=[{sys:bpS[date],dia:bpD[date]||null}];}});
  const entries=[];
  Object.entries(byMD).forEach(([mid,byDate])=>{
    Object.entries(byDate).forEach(([date,vals])=>{
      if(mid==="bp"){vals.forEach(v=>{if(v.sys)entries.push({id:`ah_bp_${date}_${v.sys}`,metricId:"bp",value:Math.round(v.sys),secondary:v.dia?Math.round(v.dia):undefined,date,note:"Apple Health"});});}
      else{const avg=vals.reduce((a,b)=>a+b,0)/vals.length;entries.push({id:`ah_${mid}_${date}`,metricId:mid,value:parseFloat(avg.toFixed(MB[mid]?.dp??1)),date,note:"Apple Health"});}
    });
  });
  const counts={};entries.forEach(e=>{counts[e.metricId]=(counts[e.metricId]||0)+1;});
  if(!entries.length)throw new Error("No matching records found. Export must contain VO₂Max, RHR, BP, Glucose, or Body Fat.");
  return{entries,counts,dSex,dDOB};
}

// ── Canvas snapshot ───────────────────────────────────────────────────────
function rrect(ctx,x,y,w,h,r=6){
  r=Math.min(r,w/2,h/2);ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function renderSnapshot(entries,sex,eth,bioAge,chronoAge,days){
  const W=1500,H=1320;const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const ctx=cv.getContext("2d");const now=new Date();
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  let cStr=cutoff.toISOString().substring(0,10);
  const pLabel=days===30?"Last 30 Days":days===90?"Last 3 Months":"Last 6 Months";

  // Fallback: if no entries fall within the selected window, use all available data
  const hasWindowData=entries.some(e=>e.date>=cStr);
  if(!hasWindowData&&entries.length>0){
    const earliest=entries.map(e=>e.date).sort()[0];
    cStr=earliest;
  }
  const windowNote=hasWindowData?"":` (all-time — no data in ${pLabel})`;
  const ethLabel=ETHNICITIES.find(e=>e.id===eth)?.label||"";

  ctx.fillStyle="#060a10";ctx.fillRect(0,0,W,H);

  // ── Header bar ────────────────────────────────────────────────────────
  ctx.fillStyle="#0a0e16";ctx.fillRect(0,0,W,72);
  ctx.strokeStyle="#0e1824";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,72);ctx.lineTo(W,72);ctx.stroke();
  ctx.font="bold 22px system-ui,sans-serif";ctx.fillStyle="#00ffa3";
  const bw=ctx.measureText("BIO").width;ctx.fillText("BIO",32,46);
  ctx.fillStyle="#e0eeff";ctx.fillText("AGE",32+bw,46);
  ctx.font="bold 13px monospace";ctx.fillStyle="#00ffa3";
  const pl=(pLabel+windowNote).toUpperCase();ctx.fillText(pl,W/2-ctx.measureText(pl).width/2,46);
  ctx.font="11px monospace";ctx.fillStyle="#445566";
  const meta=`${sex==="female"?"♀":"♂"} · ${ethLabel} · Bio Age ${bioAge?bioAge.toFixed(1):"–"} / Chrono ${chronoAge} · ${now.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}`;
  ctx.fillText(meta,W-ctx.measureText(meta).width-32,46);
  ctx.font="9px monospace";ctx.fillStyle="#1e3040";
  ctx.fillText("Sources: ACSM · ACE · AHA · ADA · Not medical advice",32,65);

  // ── Top section: Bio Trajectory (left) + 30-Day Plan (right) ──────────
  const PAD=16,TSEC_Y=88,TSEC_H=240;
  const TRAJ_W=Math.floor((W-PAD*3)*0.58);
  const PLAN_W=W-PAD*3-TRAJ_W;
  const TRAJ_X=PAD,PLAN_X=PAD+TRAJ_W+PAD;

  // Bio trajectory card bg
  rrect(ctx,TRAJ_X,TSEC_Y,TRAJ_W,TSEC_H,10);ctx.fillStyle="#0a0e16";ctx.fill();
  rrect(ctx,TRAJ_X,TSEC_Y,TRAJ_W,TSEC_H,10);ctx.strokeStyle="#00ffa322";ctx.lineWidth=1;ctx.stroke();

  // Bio trajectory title
  ctx.fillStyle="#00ffa3";ctx.font="bold 12px system-ui,sans-serif";
  ctx.fillText("Biological Age Trajectory",TRAJ_X+16,TSEC_Y+22);
  ctx.fillStyle="#334455";ctx.font="9px monospace";
  ctx.fillText(`Weekly · ${pLabel} · vs Chronological Age ${chronoAge}`,TRAJ_X+16,TSEC_Y+36);

  // Build weekly bio age data points for the period
  const numWeeks=Math.ceil(days/7);
  const weekPts=[];
  for(let w=numWeeks;w>=0;w--){
    const d=new Date(now);d.setDate(d.getDate()-w*7);
    const dStr=d.toISOString().substring(0,10);
    if(dStr<cStr)continue;
    const ba=getBioAge(entries.filter(e=>e.date<=dStr),chronoAge,sex,eth);
    if(ba)weekPts.push({date:dStr.slice(5),ba:+ba.toFixed(1)});
  }

  // Draw bio trajectory chart
  const CX=TRAJ_X+48,CY=TSEC_Y+48,CW2=TRAJ_W-64,CH2=TSEC_H-72;
  if(weekPts.length>1){
    const bas=weekPts.map(p=>p.ba);
    const rawMn=Math.min(...bas,chronoAge-5),rawMx=Math.max(...bas,chronoAge+1);
    const pad2=(rawMx-rawMn)*0.1||1;
    const mn=rawMn-pad2,mx=rawMx+pad2,vr=mx-mn;
    const tx=i=>CX+(i/(weekPts.length-1))*CW2;
    const ty=v=>CY+CH2-((v-mn)/vr)*CH2;
    // Chrono dashed line
    const chronoY=ty(chronoAge);
    ctx.beginPath();ctx.strokeStyle="#1e3a4a";ctx.lineWidth=1;ctx.setLineDash([6,4]);
    ctx.moveTo(CX,chronoY);ctx.lineTo(CX+CW2,chronoY);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#1e3a4a";ctx.font="8px monospace";ctx.textAlign="right";
    ctx.fillText(`Chrono ${chronoAge}`,CX+CW2,chronoY-3);ctx.textAlign="left";
    // Bio age area fill
    const grad=ctx.createLinearGradient(CX,CY,CX,CY+CH2);
    grad.addColorStop(0,"#00ffa355");grad.addColorStop(1,"#00ffa305");
    ctx.beginPath();weekPts.forEach((p,i)=>i===0?ctx.moveTo(tx(i),ty(p.ba)):ctx.lineTo(tx(i),ty(p.ba)));
    ctx.lineTo(tx(weekPts.length-1),CY+CH2);ctx.lineTo(CX,CY+CH2);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    // Bio age line
    ctx.beginPath();ctx.strokeStyle="#00ffa3";ctx.lineWidth=2.5;ctx.lineJoin="round";
    weekPts.forEach((p,i)=>i===0?ctx.moveTo(tx(i),ty(p.ba)):ctx.lineTo(tx(i),ty(p.ba)));ctx.stroke();
    // Dots
    ctx.fillStyle="#00ffa3";weekPts.forEach((p,i)=>{ctx.beginPath();ctx.arc(tx(i),ty(p.ba),3,0,Math.PI*2);ctx.fill();});
    // Y-axis
    ctx.beginPath();ctx.strokeStyle="#1e2a3a";ctx.lineWidth=1;ctx.moveTo(CX,CY);ctx.lineTo(CX,CY+CH2);ctx.stroke();
    const yTicks=[rawMn,chronoAge,rawMx];
    ctx.fillStyle="#445566";ctx.font="8px monospace";ctx.textAlign="right";
    yTicks.forEach(v=>{const lbl=v.toFixed(1);ctx.fillText(lbl,CX-3,ty(v)+3);});ctx.textAlign="left";
    // X-axis labels: first and last
    ctx.fillStyle="#334455";ctx.font="8px monospace";
    ctx.fillText(weekPts[0].date,CX,CY+CH2+13);
    const ll=weekPts[weekPts.length-1].date;ctx.fillText(ll,CX+CW2-ctx.measureText(ll).width,CY+CH2+13);
    // Start/end bio age callouts
    const first=weekPts[0],last=weekPts[weekPts.length-1];
    const delta=+(last.ba-first.ba).toFixed(1);
    const good=delta<0;
    ctx.fillStyle=good?"#00ffa3":"#ff6b6b";ctx.font="bold 10px monospace";
    const dStr2=`${good?"↓":"↑"} ${Math.abs(delta)} yrs over period`;
    ctx.fillText(dStr2,CX+CW2/2-ctx.measureText(dStr2).width/2,CY-4);
  }else{
    ctx.fillStyle="#1e2a3a";ctx.font="11px monospace";ctx.fillText("Insufficient data for this period",CX,CY+CH2/2);
  }

  // 30-Day Priority Plan card
  rrect(ctx,PLAN_X,TSEC_Y,PLAN_W,TSEC_H,10);ctx.fillStyle="#080e18";ctx.fill();
  rrect(ctx,PLAN_X,TSEC_Y,PLAN_W,TSEC_H,10);ctx.strokeStyle="#0e2030";ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle="#00ffa3";ctx.font="bold 12px system-ui,sans-serif";
  ctx.fillText("🎯 30-Day Priority Plan",PLAN_X+16,TSEC_Y+22);

  // Compute top-3 impacts (pure functions, no React)
  const curScoreMap={};
  MK.forEach(id=>{const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];if(l)curScoreMap[id]=getScore(id,l.value,sex,eth);});
  const validIds=MK.filter(id=>curScoreMap[id]!=null);
  const curAvgAll=validIds.length?validIds.reduce((s,id)=>s+curScoreMap[id],0)/validIds.length:null;
  const curBAall=curAvgAll!=null?Math.max(18,chronoAge-(15-((100-curAvgAll)/100)*15)):null;
  const topImpacts=validIds.map(id=>{
    const hypScores=validIds.map(vid=>vid===id?100:curScoreMap[vid]);
    const hypAvg=hypScores.reduce((a,b)=>a+b,0)/hypScores.length;
    const hypBA=Math.max(18,chronoAge-(15-((100-hypAvg)/100)*15));
    const gain=curBAall!=null?+(curBAall-hypBA).toFixed(1):0;
    const sc=curScoreMap[id];const tier=sc>=72?"good":sc>=45?"fair":"poor";
    const rec=RECS[id]?.[tier]||{action:"",detail:""};
    const m=getM(id,sex,eth);
    const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    return{id,label:m.label,sc,col:gC(sc),gain,action:rec.action||"",detail:rec.detail||"",currentVal:l?`${l.value} ${m.unit}`:""};
  }).sort((a,b)=>b.gain-a.gain).slice(0,3);

  const NUMS=["①","②","③"];
  topImpacts.forEach((r,i)=>{
    const iy=TSEC_Y+42+i*64;
    // Number badge
    ctx.fillStyle=r.col+"22";ctx.beginPath();ctx.arc(PLAN_X+28,iy+10,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=r.col;ctx.font="bold 11px monospace";
    ctx.fillText(NUMS[i],PLAN_X+22,iy+14);
    // Label + value + gain
    ctx.font="bold 11px system-ui,sans-serif";ctx.fillStyle="#e0eeff";
    ctx.fillText(`${r.label}`,PLAN_X+46,iy+8);
    ctx.font="9px monospace";ctx.fillStyle=r.col;
    ctx.fillText(`${r.currentVal}${r.gain>0.1?`  ↓ ${r.gain}y potential`:"  ✓ At optimal"}`,PLAN_X+46,iy+20);
    // Action (truncated to fit)
    ctx.font="9px monospace";ctx.fillStyle="#6699aa";
    const actionFull=r.action;const maxW=PLAN_W-60;
    let aw=ctx.measureText(actionFull).width;
    let actionTxt=actionFull;
    while(aw>maxW&&actionTxt.length>10){actionTxt=actionTxt.slice(0,-1);aw=ctx.measureText(actionTxt+"…").width;}
    if(actionTxt!==actionFull)actionTxt+="…";
    ctx.fillText(actionTxt,PLAN_X+46,iy+33);
    // Detail line 1 (truncated)
    const detailLine=r.detail.substring(0,90)+"…";
    ctx.font="8px monospace";ctx.fillStyle="#445566";
    ctx.fillText(detailLine,PLAN_X+46,iy+46);
    // Divider
    if(i<2){ctx.beginPath();ctx.strokeStyle="#0e2030";ctx.lineWidth=1;ctx.moveTo(PLAN_X+16,iy+56);ctx.lineTo(PLAN_X+PLAN_W-16,iy+56);ctx.stroke();}
  });
  if(!topImpacts.length){ctx.fillStyle="#1e2a3a";ctx.font="11px monospace";ctx.fillText("Log data to generate plan",PLAN_X+16,TSEC_Y+130);}

  // ── Metric cards: 3 top row + 2 bottom row centred ────────────────────
  const CARDS_Y=TSEC_Y+TSEC_H+PAD;
  const CW_CARD=Math.floor((W-PAD*4)/3);
  const CH_CARD=Math.floor((H-CARDS_Y-PAD*2)/2)-2;
  const R2Y=CARDS_Y+CH_CARD+PAD;
  const R2X=(W-2*CW_CARD-PAD)/2;
  MK.forEach((id,idx)=>{
    const col2=idx%3,row=Math.floor(idx/3);
    const cx=row===0?PAD+col2*(CW_CARD+PAD):R2X+(idx-3)*(CW_CARD+PAD);
    const cy=row===0?CARDS_Y:R2Y;
    drawCard(ctx,cx,cy,CW_CARD,CH_CARD,id,entries,sex,eth,cStr);
  });
  return cv;
}
function drawCard(ctx,x,y,w,h,id,entries,sex,eth,cStr){
  const m=getM(id,sex,eth);
  const all=entries.filter(e=>e.metricId===id).sort((a,b)=>a.date.localeCompare(b.date));
  const period=all.filter(e=>e.date>=cStr);
  const latest=all[all.length-1]||null;
  const sc=latest?getScore(id,latest.value,sex,eth):null;
  const col=sc?gC(sc):"#334455";
  rrect(ctx,x,y,w,h,10);ctx.fillStyle="#0a0e16";ctx.fill();
  rrect(ctx,x,y,w,h,10);ctx.strokeStyle=col+"28";ctx.lineWidth=1;ctx.stroke();
  const PX=x+18;
  // label
  ctx.fillStyle="#334455";ctx.font="10px monospace";ctx.fillText(m.label.toUpperCase(),PX,y+22);
  // score ring
  const RX=x+w-40,RY=y+24,RR=18;
  ctx.beginPath();ctx.arc(RX,RY,RR,0,Math.PI*2);ctx.strokeStyle="#1a1f2e";ctx.lineWidth=4;ctx.stroke();
  if(sc){ctx.beginPath();ctx.arc(RX,RY,RR,-Math.PI/2,-Math.PI/2+(sc/100)*Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle=col;ctx.font="bold 10px monospace";const ss=Math.round(sc)+"";ctx.fillText(ss,RX-ctx.measureText(ss).width/2,RY+4);}
  // value
  if(latest){
    ctx.fillStyle=col;ctx.font="bold 32px system-ui,sans-serif";
    const vs=`${latest.value}`;const vw=ctx.measureText(vs).width;ctx.fillText(vs,PX,y+74);
    ctx.fillStyle="#445566";ctx.font="11px monospace";ctx.fillText(m.unit,PX+vw+4,y+70);
    if(m.secondary&&latest.secondary)ctx.fillText(`/ ${latest.secondary}`,PX+vw+50,y+70);
    ctx.fillStyle=col+"cc";ctx.font="10px monospace";ctx.fillText(sc?gL(sc):"",PX,y+88);
  }else{ctx.fillStyle="#1e2a3a";ctx.font="bold 28px system-ui";ctx.fillText("–",PX,y+74);}
  // trend
  const ahN=period.filter(e=>e.note==="Apple Health").length;
  if(ahN>0){ctx.fillStyle="#006633";ctx.font="9px monospace";ctx.fillText(`⌘ ${ahN} Apple Health`,PX,y+100);}
  if(period.length>=2){
    const d=period[period.length-1].value-period[0].value;const good=m.higherIsBetter?d>0:d<0;
    ctx.fillStyle=good?"#00ffa3":"#ff6b6b";ctx.font="10px monospace";
    ctx.fillText(`${good?"↗":"↘"} ${Math.abs(d).toFixed(m.dp)} over period`,PX,y+(ahN>0?112:100));
  }
  // sparkline with Y-axis labels and optimal reference line
  const YLAB=30; // left margin reserved for Y-axis
  const SX=PX+YLAB,SY=y+116,SW=w-36-YLAB,SH=h-210;
  if(period.length>1){
    const vs=period.map(e=>e.value);
    const optRef=m.higherIsBetter?m.opt.min:m.opt.max;
    // Expand domain so the optimal line is always visible inside chart
    const rawMn=Math.min(...vs,optRef),rawMx=Math.max(...vs,optRef);
    const pad=(rawMx-rawMn)*0.12||2;
    const mn=rawMn-pad,mx=rawMx+pad,vr=mx-mn;
    const tx=i=>SX+(i/(period.length-1))*SW;
    const ty=v=>SY+SH-((v-mn)/vr)*SH;
    // area fill
    const ag=ctx.createLinearGradient(SX,SY,SX,SY+SH);ag.addColorStop(0,col+"44");ag.addColorStop(1,col+"04");
    ctx.beginPath();period.forEach((e,i)=>i===0?ctx.moveTo(tx(i),ty(e.value)):ctx.lineTo(tx(i),ty(e.value)));
    ctx.lineTo(tx(period.length-1),SY+SH);ctx.lineTo(SX,SY+SH);ctx.closePath();ctx.fillStyle=ag;ctx.fill();
    // optimal reference line
    const optY=ty(optRef);
    ctx.save();ctx.beginPath();ctx.strokeStyle="#00ffa3";ctx.lineWidth=1;ctx.globalAlpha=0.55;
    ctx.setLineDash([5,3]);ctx.moveTo(SX,optY);ctx.lineTo(SX+SW,optY);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
    ctx.fillStyle="#00ffa3bb";ctx.font="bold 8px monospace";
    const optLbl=`opt ${optRef}`;const olw=ctx.measureText(optLbl).width;
    ctx.fillText(optLbl,SX+SW-olw-2,optY-3);
    // data line
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin="round";
    period.forEach((e,i)=>i===0?ctx.moveTo(tx(i),ty(e.value)):ctx.lineTo(tx(i),ty(e.value)));ctx.stroke();
    // dots
    ctx.fillStyle=col;period.forEach((e,i)=>{ctx.beginPath();ctx.arc(tx(i),ty(e.value),2.5,0,Math.PI*2);ctx.fill();});
    // Y-axis line
    ctx.beginPath();ctx.strokeStyle="#1e2a3a";ctx.lineWidth=1;ctx.moveTo(SX,SY);ctx.lineTo(SX,SY+SH);ctx.stroke();
    // Y-axis tick labels: top, mid, bottom
    const yTicks=[rawMx,rawMn+(rawMx-rawMn)/2,rawMn];
    ctx.fillStyle="#445566";ctx.font="8px monospace";ctx.textAlign="right";
    yTicks.forEach(v=>{
      const lbl=v%1===0?Math.round(v).toString():v.toFixed(1);
      ctx.fillText(lbl,SX-3,ty(v)+3);
    });
    ctx.textAlign="left";
    // X-axis date labels
    ctx.fillStyle="#334455";ctx.font="8px monospace";
    ctx.fillText(period[0].date.slice(5),SX,SY+SH+12);
    const el=period[period.length-1].date.slice(5);ctx.fillText(el,SX+SW-ctx.measureText(el).width,SY+SH+12);
  }else{ctx.fillStyle="#1a2a3a";ctx.font="11px monospace";ctx.fillText("No data for this period",PX,SY+SH/2);}
  // range bar with value labels
  const BY=y+h-42,BX=PX,BW=w-36,BH=5;const{cMin,cMax,ranges,opt}=m;const tot=cMax-cMin;
  ranges.forEach(r=>{const bx=BX+((r.lo-cMin)/tot)*BW;const bw2=((r.hi-r.lo)/tot)*BW;ctx.fillStyle=r.c+"99";ctx.fillRect(bx,BY,Math.max(bw2-1,1),BH);});
  const bounds=[cMin,...ranges.slice(1).map(r=>r.lo),cMax];
  ctx.fillStyle="#445566";ctx.font="8px monospace";
  bounds.forEach((v,i)=>{const bx=BX+((v-cMin)/tot)*BW;const lbl=v%1===0?String(v):v.toFixed(1);const lw=ctx.measureText(lbl).width;const lx=i===0?bx:i===bounds.length-1?bx-lw:bx-lw/2;ctx.fillText(lbl,lx,BY+BH+10);});
  ctx.fillStyle="#445566";ctx.font="8px monospace";ctx.fillText(`Optimal: ${opt.min}–${opt.max} ${m.unit}`,PX,y+h-8);
}

// ── UI Atoms ──────────────────────────────────────────────────────────────
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const T={bg:"#060a10",card:"#0a0e16",bdr:"#0e1824",gr:"#00ffa3",dim:"#334455",txt:"#c8d8e8",br:"#e0eeff",fn:"'DM Mono',monospace",dp:"'Syne',sans-serif"};

function GlowRing({score,size=80}){
  const r=size/2-8,circ=2*Math.PI*r,dash=(score/100)*circ,c=gC(score);
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1f2e" strokeWidth="6"/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${c})`,transition:"stroke-dasharray 0.7s ease"}}/>
  </svg>;
}

function RangeBar({m,compact=false}){
  const tot=m.cMax-m.cMin;
  const bounds=[m.cMin,...m.ranges.slice(1).map(r=>r.lo),m.cMax];
  return <div>
    <div style={{display:"flex",borderRadius:4,overflow:"hidden",height:compact?5:7,marginBottom:3}}>
      {m.ranges.map((r,i)=><div key={i} style={{width:`${((r.hi-r.lo)/tot)*100}%`,background:r.c,opacity:0.8}}/>)}
    </div>
    <div style={{display:"flex",marginBottom:compact?0:2}}>
      {m.ranges.map((r,i)=><div key={i} style={{width:`${((r.hi-r.lo)/tot)*100}%`,fontSize:8,color:r.c,overflow:"hidden",whiteSpace:"nowrap"}}>{r.label}</div>)}
    </div>
    {!compact&&<div style={{position:"relative",height:13}}>
      {bounds.map((v,i)=>{
        const pct=((v-m.cMin)/tot)*100;const lbl=v%1===0?String(v):v.toFixed(1);
        return <div key={i} style={{position:"absolute",left:`${pct}%`,transform:i===0?"none":i===bounds.length-1?"translateX(-100%)":"translateX(-50%)",fontSize:8,color:"#334455",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{lbl}</div>;
      })}
    </div>}
  </div>;
}

const CTip=({active,payload})=>{
  if(!active||!payload?.length)return null;
  return <div style={{background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:8,padding:"9px 13px",fontFamily:T.fn,fontSize:12}}>
    <div style={{color:T.br,marginBottom:4}}>{payload[0]?.payload?.date}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color||T.gr}}>{p.name}: <b>{p.value}</b></div>)}
  </div>;
};

// ── Impact & Recommendations Panel ────────────────────────────────────────
function ImpactPanel({entries,age,sex,eth}){
  const [open,setOpen]=useState(null);
  const impacts=MK.map(id=>{
    const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!l)return null;
    const sc=getScore(id,l.value,sex,eth);
    const m=getM(id,sex,eth);
    // hypothetical bio age if this metric reaches optimal
    const curScores=MK.map(kid=>{const kl=entries.filter(e=>e.metricId===kid).sort((a,b)=>b.date.localeCompare(a.date))[0];return kl?getScore(kid,kl.value,sex,eth):null;}).filter(Boolean);
    const hypScores=MK.map(kid=>{const kl=entries.filter(e=>e.metricId===kid).sort((a,b)=>b.date.localeCompare(a.date))[0];const ks=kl?getScore(kid,kl.value,sex,eth):null;return kid===id?100:ks;}).filter(Boolean);
    const curAvg=curScores.reduce((a,b)=>a+b,0)/curScores.length;
    const hypAvg=hypScores.reduce((a,b)=>a+b,0)/hypScores.length;
    const curBA=Math.max(18,age-(15-((100-curAvg)/100)*15));
    const hypBA=Math.max(18,age-(15-((100-hypAvg)/100)*15));
    const gain=+(curBA-hypBA).toFixed(1);
    const tier=sc>=72?"good":sc>=45?"fair":"poor";
    const rec=RECS[id]?.[tier]||{action:"",detail:""};
    return{id,label:m.label,sc,col:gC(sc),statusLabel:gL(sc),currentVal:`${l.value} ${m.unit}`,optRange:`${m.opt.min}–${m.opt.max} ${m.unit}`,gain,...rec};
  }).filter(Boolean).sort((a,b)=>b.gain-a.gain);

  if(!impacts.length)return null;
  return <div style={{margin:"0 28px 24px"}}>
    {/* Impact table */}
    <div style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:14,padding:"20px 22px",marginBottom:14}}>
      <div style={{fontFamily:T.dp,fontSize:14,fontWeight:800,color:T.br,marginBottom:4}}>Bio Age Impact by Metric</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:18,lineHeight:1.7}}>Ranked by potential bio age gain if each metric reaches optimal. Click any row for your action plan.</div>
      {impacts.map((r,i)=><div key={r.id}>
        <div onClick={()=>setOpen(open===r.id?null:r.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:`1px solid ${T.bdr}`,cursor:"pointer",flexWrap:"wrap"}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"#0d1a0d",border:`1px solid ${r.col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:r.col,flexShrink:0,fontWeight:700}}>{i+1}</div>
          <div style={{flex:1,minWidth:120}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:T.br,fontWeight:600}}>{r.label}</span>
              <span style={{fontSize:11,color:r.col}}>{r.currentVal}</span>
              <span style={{fontSize:10,color:T.dim,background:"#0d1218",padding:"1px 7px",borderRadius:10,border:`1px solid ${r.col}22`}}>{r.statusLabel}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:72,height:5,background:"#0d1218",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,(r.gain/4)*100)}%`,background:r.col,borderRadius:3,transition:"width 0.6s"}}/>
            </div>
            <div style={{fontSize:11,color:r.gain>0.2?r.col:T.dim,minWidth:72,textAlign:"right",fontWeight:r.gain>0.2?700:400}}>{r.gain>0.1?`↓ ${r.gain}y gain`:"✓ At optimal"}</div>
            <div style={{fontSize:9,color:"#1e2a3a"}}>{open===r.id?"▲":"▼"}</div>
          </div>
        </div>
        {open===r.id&&<div style={{padding:"14px 12px 14px 46px",background:"#080c14",borderBottom:`1px solid ${T.bdr}`,animation:"fadeUp 0.2s ease"}}>
          <div style={{fontSize:11,color:r.col,fontWeight:700,marginBottom:6}}>📍 Optimal: {r.optRange}</div>
          {r.action&&<div style={{fontSize:12,color:T.br,fontWeight:600,marginBottom:5}}>Next step: {r.action}</div>}
          {r.detail&&<div style={{fontSize:11,color:"#6699aa",lineHeight:1.8}}>{r.detail}</div>}
          {r.gain>0.1&&<div style={{marginTop:6,fontSize:10,color:r.col+"88"}}>Potential gain: up to {r.gain} year{r.gain!==1?"s":""} younger</div>}
        </div>}
      </div>)}
    </div>
    {/* 30-day plan */}
    <div style={{background:"#080e18",border:"1px solid #0e2030",borderRadius:14,padding:"20px 22px"}}>
      <div style={{fontFamily:T.dp,fontSize:14,fontWeight:800,color:T.br,marginBottom:16}}>🎯 30-Day Priority Plan</div>
      {impacts.slice(0,3).map((r,i)=><div key={r.id} style={{display:"flex",gap:12,marginBottom:14}}>
        <div style={{width:26,height:26,borderRadius:"50%",background:r.col+"18",border:`1px solid ${r.col}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:r.col}}>{i+1}</div>
        <div>
          <div style={{fontSize:12,color:T.br,fontWeight:600,marginBottom:3}}>{r.label} — <span style={{color:r.col}}>{r.action}</span></div>
          <div style={{fontSize:11,color:"#5588aa",lineHeight:1.7}}>{r.detail}</div>
          {r.gain>0.1&&<div style={{marginTop:4,fontSize:10,color:r.col+"88"}}>↓ Up to {r.gain} yr bio age reduction</div>}
        </div>
      </div>)}
      <div style={{marginTop:8,padding:"9px 13px",background:"rgba(0,255,163,0.02)",borderRadius:8,border:"1px solid rgba(0,255,163,0.07)",fontSize:10,color:T.dim,lineHeight:1.7}}>Based on ACSM, AHA, ADA and longevity research. Always consult your physician before significant changes. Not medical advice.</div>
    </div>
  </div>;
}

// ── Snapshot Modal ────────────────────────────────────────────────────────
function SnapshotModal({entries,sex,eth,bioAge,chronoAge,onClose}){
  const [period,setPeriod]=useState(30);
  const [img,setImg]=useState(null);
  const [rendering,setRendering]=useState(false);
  const [renderErr,setRenderErr]=useState(null);
  const cvRef=useRef(null);

  const render=useCallback(()=>{
    setRendering(true);
    setRenderErr(null);
    setTimeout(()=>{
      try{
        const cv=renderSnapshot(entries,sex,eth,bioAge,chronoAge,period);
        cvRef.current=cv;
        setImg(cv.toDataURL("image/jpeg",0.92));
      }catch(e){
        console.error("Snapshot render error:",e);
        setRenderErr(e.message||String(e));
      }
      setRendering(false);
    },60);
  },[entries,sex,eth,bioAge,chronoAge,period]);

  useEffect(()=>{render();},[render]);

  const fname=`bioage-${period===30?"1mo":period===90?"3mo":"6mo"}-${new Date().toISOString().substring(0,10)}.jpg`;

  const download=()=>{
    const cv=cvRef.current;if(!cv)return;
    try{
      cv.toBlob(blob=>{
        if(!blob){openTab();return;}
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download=fname;a.style.display="none";
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),10000);
      },"image/jpeg",0.92);
    }catch(_){openTab();}
  };

  const openTab=()=>{
    const cv=cvRef.current;if(!cv)return;
    const url=cv.toDataURL("image/jpeg",0.92);
    const w=window.open("","_blank");
    if(w)w.document.write(`<html><body style="margin:0;background:#060a10"><img src="${url}" style="max-width:100%"/><p style="color:#aaa;font-family:monospace;padding:8px">Right-click → Save Image As → "${fname}"</p></body></html>`);
  };

  const pb=d=>({padding:"7px 18px",borderRadius:7,cursor:"pointer",border:"none",fontFamily:T.fn,fontSize:11,fontWeight:700,letterSpacing:"0.07em",background:period===d?T.gr:"#0d1320",color:period===d?"#030a06":T.dim,boxShadow:period===d?"0 0 12px rgba(0,255,163,0.3)":"none",transition:"all 0.2s"});

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:T.card,border:"1px solid #1a2a1a",borderRadius:16,width:"100%",maxWidth:800,maxHeight:"93vh",overflowY:"auto",padding:"26px 30px",position:"relative",animation:"fadeUp 0.2s ease"}}>
      <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20}}>✕</button>
      <div style={{fontFamily:T.dp,fontSize:18,fontWeight:800,color:T.br,marginBottom:4}}>Export Snapshot</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:18}}>JPEG of all 5 metric trends for the chosen period. Use "Open in New Tab" if the download button doesn't trigger a file dialog.</div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        <button style={pb(30)} onClick={()=>setPeriod(30)}>1 Month</button>
        <button style={pb(90)} onClick={()=>setPeriod(90)}>3 Months</button>
        <button style={pb(180)} onClick={()=>setPeriod(180)}>6 Months</button>
      </div>
      <div style={{borderRadius:10,overflow:"hidden",border:"1px solid #0e1824",marginBottom:14,minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",background:"#060a10"}}>
        {rendering
          ? <div style={{color:T.dim,fontSize:13,fontFamily:T.fn}}><span style={{display:"inline-block",animation:"spin 1s linear infinite",marginRight:8}}>⟳</span>Rendering…</div>
          : renderErr
            ? <div style={{padding:"20px 24px",textAlign:"center"}}>
                <div style={{color:"#ff6b6b",fontSize:12,fontFamily:T.fn,marginBottom:8}}>⚠ Render error</div>
                <div style={{color:"#445566",fontSize:11,fontFamily:T.fn,lineHeight:1.7,maxWidth:500}}>{renderErr}</div>
              </div>
            : img
              ? <img src={img} alt="Snapshot" style={{width:"100%",display:"block"}}/>
              : <div style={{color:T.dim,fontSize:12,fontFamily:T.fn}}>No preview yet</div>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={download} disabled={!img||rendering} style={{background:T.gr,color:"#030a06",fontFamily:T.fn,fontWeight:700,fontSize:11,letterSpacing:"0.09em",border:"none",borderRadius:8,padding:"11px 22px",cursor:"pointer",boxShadow:"0 0 16px rgba(0,255,163,0.3)",opacity:!img||rendering?0.5:1,flex:1}}>⬇ Download JPEG</button>
        <button onClick={openTab} disabled={!img||rendering} style={{background:"transparent",color:T.gr,fontFamily:T.fn,fontWeight:700,fontSize:11,letterSpacing:"0.07em",border:"1px solid rgba(0,255,163,0.3)",borderRadius:8,padding:"11px 18px",cursor:"pointer",opacity:!img||rendering?0.5:1}}>↗ Open in New Tab</button>
        <button onClick={onClose} style={{background:"transparent",color:T.dim,fontFamily:T.fn,fontSize:11,border:"1px solid #1e2a3a",borderRadius:8,padding:"11px 14px",cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </div>;
}

// ── Import Panel ──────────────────────────────────────────────────────────
function ImportPanel({onImport,onClose}){
  const [step,setStep]=useState("instructions");
  const [drag,setDrag]=useState(false);
  const [prog,setProg]=useState(0);
  const [preview,setPreview]=useState(null);
  const [err,setErr]=useState(null);
  const ref=useRef();
  const process=async f=>{setErr(null);setStep("loading");setProg(0);try{const r=await parseAH(f,p=>setProg(p));setPreview(r);setStep("preview");}catch(e){setErr(e.message);setStep("instructions");}};
  const OL={position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20};
  const BX={background:T.card,border:"1px solid #1a2a1a",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",padding:"30px 34px",position:"relative",animation:"fadeUp 0.22s ease"};
  const BB={background:T.gr,color:"#030a06",fontFamily:T.fn,fontWeight:700,fontSize:12,letterSpacing:"0.09em",border:"none",borderRadius:8,padding:"11px 26px",cursor:"pointer",boxShadow:"0 0 18px rgba(0,255,163,0.25)",width:"100%",marginTop:18};
  const SB={background:"transparent",color:T.dim,fontFamily:T.fn,fontSize:11,border:"1px solid #1e2a3a",borderRadius:8,padding:"9px 18px",cursor:"pointer",width:"100%",marginTop:8};
  if(step==="done")return <div style={OL}><div style={BX}><div style={{textAlign:"center",padding:"22px 0"}}>
    <div style={{fontSize:50,marginBottom:10}}>✅</div>
    <div style={{fontFamily:T.dp,fontSize:20,fontWeight:800,color:T.gr}}>Import Complete!</div>
    <div style={{fontSize:12,color:T.dim,marginTop:8,lineHeight:1.8}}>{preview?.dSex&&<span>Detected: <b style={{color:T.br}}>{preview.dSex}</b> — ranges updated. </span>}Data merged.</div>
    <button style={{...BB,maxWidth:220,margin:"18px auto 0",display:"block"}} onClick={onClose}>Back to Dashboard</button>
  </div></div></div>;
  if(step==="loading")return <div style={OL}><div style={BX}><div style={{textAlign:"center",padding:"44px 0"}}>
    <div style={{fontSize:38,display:"inline-block",animation:"spin 1.2s linear infinite",marginBottom:14}}>⟳</div>
    <div style={{fontFamily:T.dp,fontSize:17,fontWeight:700,color:T.gr}}>Streaming Health Data…</div>
    <div style={{color:T.dim,fontSize:12,marginTop:8,marginBottom:18}}>Processing in 64 KB chunks — large exports take 15–30s.</div>
    <div style={{background:"#0d1117",borderRadius:5,height:5,overflow:"hidden",width:"100%",maxWidth:280,margin:"0 auto"}}>
      <div style={{height:"100%",background:T.gr,width:`${prog}%`,transition:"width 0.3s",boxShadow:"0 0 7px rgba(0,255,163,0.5)"}}/>
    </div>
    {prog>0&&<div style={{fontSize:11,color:T.dim,marginTop:7}}>{prog}%</div>}
  </div></div></div>;
  if(step==="preview"&&preview)return <div style={OL}><div style={BX}>
    <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
    <div style={{fontFamily:T.dp,fontSize:18,fontWeight:800,color:T.br,marginBottom:6}}>Import Preview</div>
    <div style={{fontSize:11,color:T.dim,marginBottom:18,lineHeight:1.8}}>Found <b style={{color:T.gr}}>{preview.entries.length} readings</b>.{preview.dSex&&<span> Sex: <b style={{color:T.br}}>{preview.dSex}</b>.</span>}{preview.dDOB&&<span> Age: <b style={{color:T.br}}>{new Date().getFullYear()-new Date(preview.dDOB).getFullYear()}</b>.</span>}</div>
    {MK.map(id=>{const count=preview.counts[id]||0;const s=preview.entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];return <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #0e1824"}}>
      <div><div style={{fontSize:13,color:T.br}}>{MB[id].label}</div>{s&&<div style={{fontSize:10,color:T.dim}}>Latest: {s.value} · {s.date}</div>}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:T.dim}}>{count} readings</span>
        <span style={{padding:"2px 9px",borderRadius:20,fontSize:10,background:count>0?"rgba(0,255,163,0.08)":"rgba(60,60,80,0.3)",color:count>0?T.gr:T.dim,border:`1px solid ${count>0?"rgba(0,255,163,0.2)":"#1e2a3a"}`}}>{count>0?"✓ Found":"Not found"}</span>
      </div>
    </div>;})}
    <button style={BB} onClick={()=>{onImport(preview);setStep("done");}}>Confirm Import</button>
    <button style={SB} onClick={()=>setStep("instructions")}>← Start Over</button>
  </div></div>;
  return <div style={OL}><div style={BX}>
    <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
    <div style={{fontFamily:T.dp,fontSize:20,fontWeight:800,color:T.br,marginBottom:4}}>Import from Apple Health</div>
    <div style={{fontSize:11,color:T.dim,marginBottom:22,lineHeight:1.8}}>Sex is auto-detected for correct ranges. All parsing is local — nothing leaves your device.</div>
    {[{t:"Health app → Profile photo → Export All Health Data",d:"Confirm export. Large exports take 30–60s."},
      {t:"Share export.zip to your Mac",d:"Tap Share → Save to Files, or AirDrop."},
      {t:"Drop the file below",d:"Accepts export.zip or export.xml. Streamed in 64 KB chunks."}].map((s,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:14}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:"#0e2218",border:"1px solid #00ffa3",color:"#00ffa3",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>{i+1}</div>
      <div style={{fontSize:12,color:"#8899aa",lineHeight:1.7}}><span style={{color:T.br,display:"block",fontWeight:500}}>{s.t}</span>{s.d}</div>
    </div>)}
    <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)process(f);}} onClick={()=>ref.current?.click()}
      style={{border:`2px dashed ${drag?"#00ffa3":"#1e2a3a"}`,borderRadius:10,padding:"30px 20px",textAlign:"center",cursor:"pointer",background:drag?"rgba(0,255,163,0.04)":"transparent",transition:"all 0.2s",marginTop:6}}>
      <div style={{fontSize:32,marginBottom:8}}>⬆</div>
      <div style={{fontSize:13,color:T.dim}}>Drop <b style={{color:T.br}}>export.zip</b> or <b style={{color:T.br}}>export.xml</b> here<span style={{color:"#00ffa3",display:"block",fontSize:11,marginTop:3}}>or click to browse</span></div>
      <input ref={ref} type="file" accept=".zip,.xml" style={{display:"none"}} onChange={e=>{if(e.target.files[0])process(e.target.files[0]);}}/>
    </div>
    <div style={{marginTop:10,padding:"9px 13px",background:"rgba(0,100,255,0.03)",borderRadius:7,border:"1px solid rgba(40,60,120,0.2)",fontSize:10,color:T.dim,lineHeight:1.7}}>🔒 Privacy: Parsed entirely in-browser. No data leaves your device.</div>
    {err&&<div style={{marginTop:10,padding:"13px 15px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:7,fontSize:12,color:"#ff6b6b",lineHeight:1.8,whiteSpace:"pre-wrap"}}>⚠ {err}</div>}
    <button style={SB} onClick={onClose}>Cancel</button>
  </div></div>;
}

// ── Ethnicity Modal ───────────────────────────────────────────────────────
function EthModal({eth,setEth,onClose}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:T.card,border:"1px solid #1a2a1a",borderRadius:16,width:"100%",maxWidth:500,padding:"26px 30px",position:"relative",animation:"fadeUp 0.2s ease"}}>
      <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
      <div style={{fontFamily:T.dp,fontSize:17,fontWeight:800,color:T.br,marginBottom:6}}>Ethnicity & Reference Ranges</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:18,lineHeight:1.8}}>Some ethnic backgrounds have evidence-based differences in metabolic risk thresholds. WHO, ADA, and AHA adjustments are applied to your optimal targets.</div>
      {ETHNICITIES.map(e=><div key={e.id} onClick={()=>{setEth(e.id);onClose();}}
        style={{padding:"11px 14px",borderRadius:9,marginBottom:7,cursor:"pointer",border:`1px solid ${eth===e.id?"#00ffa344":"#0e1824"}`,background:eth===e.id?"#080e14":"transparent",transition:"all 0.18s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,color:eth===e.id?T.gr:T.br,fontWeight:eth===e.id?700:400}}>{e.label}</div>
            {e.subtitle&&<div style={{fontSize:10,color:T.dim}}>{e.subtitle}</div>}
          </div>
          {eth===e.id&&<div style={{color:T.gr,fontSize:15}}>✓</div>}
        </div>
        {eth===e.id&&e.note&&<div style={{fontSize:10,color:"#5599aa",marginTop:5,lineHeight:1.6}}>{e.note}</div>}
        {Object.keys(e.adjustments||{}).length>0&&<div style={{fontSize:9,color:"#334455",marginTop:3}}>Adjusts: {Object.keys(e.adjustments).map(k=>MB[k]?.label).join(" · ")}</div>}
      </div>)}
      <div style={{marginTop:10,fontSize:10,color:"#1e2a3a",lineHeight:1.8}}>Sources: WHO 2004 Asian BMI cutoffs · AHA/ACC 2017 · ADA Ethnic Risk Factors · Lancet Diabetes 2020. Not medical advice.</div>
    </div>
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function BioAgeTracker(){
  const [entries,setEntries]=useState(SEED);
  const [view,setView]=useState("dashboard");
  const [activeMid,setActiveMid]=useState(null);
  const [age,setAge]=useState(40);
  const [sex,setSex]=useState("female");
  const [eth,setEth]=useState("general");
  const [showLog,setShowLog]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [showSnap,setShowSnap]=useState(false);
  const [showEth,setShowEth]=useState(false);
  const [saved,setSaved]=useState(false);
  const [form,setForm]=useState({metricId:"vo2max",value:"",secondary:"",date:new Date().toISOString().split("T")[0],note:""});

  useEffect(()=>{(async()=>{try{
    const r=await window.storage?.get("ba6_entries");if(r?.value)setEntries(JSON.parse(r.value));
    const a=await window.storage?.get("ba6_age");if(a?.value)setAge(+a.value);
    const s=await window.storage?.get("ba6_sex");if(s?.value)setSex(s.value);
    const e=await window.storage?.get("ba6_eth");if(e?.value)setEth(e.value);
  }catch{}})();},[]);

  const persist=useCallback(async e=>{setEntries(e);try{await window.storage?.set("ba6_entries",JSON.stringify(e));}catch{}},[]);

  const handleImport=({entries:ne,dSex,dDOB})=>{
    const manual=entries.filter(e=>e.note!=="Apple Health");
    const merged=[...manual];
    ne.forEach(x=>{const i=merged.findIndex(e=>e.metricId===x.metricId&&e.date===x.date);if(i>=0)merged[i]=x;else merged.push(x);});
    persist(merged);
    if(dSex){setSex(dSex);window.storage?.set("ba6_sex",dSex);}
    if(dDOB){const y=new Date().getFullYear()-new Date(dDOB).getFullYear();setAge(y);window.storage?.set("ba6_age",String(y));}
  };

  const getLatest=id=>entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  const getHistory=id=>entries.filter(e=>e.metricId===id).sort((a,b)=>a.date.localeCompare(b.date));

  const logEntry=()=>{
    if(!form.value)return;
    persist([...entries,{id:Date.now()+"",metricId:form.metricId,value:+form.value,secondary:form.secondary?+form.secondary:undefined,date:form.date,note:form.note}]);
    setSaved(true);setTimeout(()=>setSaved(false),2000);
    setForm(f=>({...f,value:"",secondary:"",note:""}));
  };

  const bioAge=getBioAge(entries,age,sex,eth);
  const delta=bioAge?+(age-bioAge).toFixed(1):null;
  const scores=MK.map(id=>{const l=getLatest(id);return l?getScore(id,l.value,sex,eth):null;}).filter(Boolean);
  const overall=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const ahCount=entries.filter(e=>e.note==="Apple Health").length;
  const ethDef=ETHNICITIES.find(e=>e.id===eth);

  // Monthly bio age trajectory — one point per month for last 12 months
  const bioTrend=(()=>{
    const pts=[];const now=new Date();
    for(let i=11;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const eom=new Date(d.getFullYear(),d.getMonth()+1,0); // last day of month
      const eStr=eom.toISOString().substring(0,10);
      const label=d.toLocaleDateString("en-US",{month:"short",year:"2-digit"});
      const ba=getBioAge(entries.filter(e=>e.date<=eStr),age,sex,eth);
      if(ba)pts.push({date:label,"Bio Age":+ba.toFixed(1),Chrono:age});
    }
    return pts;
  })();

  const NB=a=>({padding:"6px 11px",borderRadius:7,fontSize:10,letterSpacing:"0.07em",cursor:"pointer",border:"none",fontFamily:T.fn,background:a?"#0e2218":"transparent",color:a?T.gr:"#445566",transition:"all 0.2s"});
  const inp={background:T.bg,border:"1px solid #1e2a3a",borderRadius:8,color:T.br,fontFamily:T.fn,fontSize:13,padding:"9px 13px",flex:1,minWidth:100};
  const BB2={background:T.gr,color:"#030a06",fontFamily:T.fn,fontWeight:700,fontSize:11,letterSpacing:"0.09em",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",boxShadow:"0 0 16px rgba(0,255,163,0.22)"};

  // ── Detail view ──
  if(view==="metric"&&activeMid){
    const m=getM(activeMid,sex,eth);
    const hist=getHistory(activeMid);
    const lat=getLatest(activeMid);
    const sc=lat?getScore(activeMid,lat.value,sex,eth):null;
    const col=sc?gC(sc):"#334455";
    const refLine=m.higherIsBetter?m.opt.min:m.opt.max;
    const cd=hist.map(e=>({date:e.date.substring(5),[m.label]:e.value,...(e.secondary?{Diastolic:e.secondary}:{})}));
    return <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.fn,color:T.txt}}>
      <style>{FONTS}</style>
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 26px",borderBottom:`1px solid ${T.bdr}`,background:"rgba(6,10,16,0.97)",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:T.dp,fontSize:17,fontWeight:800,color:T.br}}><span style={{color:T.gr}}>BIO</span>AGE</div>
        <button style={NB(false)} onClick={()=>setView("dashboard")}>← Dashboard</button>
      </nav>
      <div style={{padding:26}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:24,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:T.dp,fontSize:22,fontWeight:800,color:T.br}}>{m.label}</div>
            <div style={{fontSize:11,color:"#445566",marginTop:3}}>{m.description}</div>
          </div>
          {sc&&<div style={{textAlign:"center"}}>
            <div style={{position:"relative",width:76,height:76}}><GlowRing score={sc} size={76}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:col}}>{Math.round(sc)}</div>
            </div>
            <div style={{fontSize:9,color:T.dim,marginTop:3}}>HEALTH SCORE</div>
          </div>}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"16px 20px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:6}}>
            <div style={{fontSize:10,letterSpacing:"0.14em",color:T.dim}}>REFERENCE RANGES</div>
            <div style={{fontSize:9,color:"#1e3040"}}>Source: {m.source} · {sex==="female"?"♀":"♂"} · {ethDef?.label}</div>
          </div>
          <RangeBar m={m}/>
          <div style={{marginTop:12,fontSize:11,color:"#445566"}}>🎯 Optimal: <span style={{color:T.gr}}>{m.opt.min}–{m.opt.max} {m.unit}</span></div>
          <div style={{fontSize:11,color:"#223344",marginTop:5}}>📱 {m.howTo}</div>
        </div>
        {cd.length>0&&<div style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"16px 20px",marginBottom:14}}>
          <div style={{fontSize:10,letterSpacing:"0.14em",color:T.dim,marginBottom:12}}>TREND</div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={cd} margin={{top:4,right:4,left:-20,bottom:0}}>
              <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.22}/><stop offset="100%" stopColor={col} stopOpacity={0}/>
              </linearGradient></defs>
              <CartesianGrid stroke="#0e1824" strokeDasharray="3 3"/>
              <XAxis dataKey="date" tick={{fill:T.dim,fontSize:10,fontFamily:T.fn}}/>
              <YAxis domain={[m.cMin,m.cMax]} tick={{fill:T.dim,fontSize:10,fontFamily:T.fn}}/>
              <Tooltip content={<CTip/>}/>
              <ReferenceLine y={refLine} stroke={T.gr} strokeDasharray="4 4" strokeOpacity={0.45}
                label={{value:`Optimal boundary: ${refLine}`,fill:"#00ffa333",fontSize:9,fontFamily:T.fn,position:m.higherIsBetter?"insideTopLeft":"insideBottomLeft"}}/>
              <Area type="monotone" dataKey={m.label} stroke={col} fill="url(#ag)" strokeWidth={2} dot={{fill:col,r:3,strokeWidth:0}}/>
              {m.secondary&&<Line type="monotone" dataKey="Diastolic" stroke="#7feba1" strokeWidth={1.5} dot={{fill:"#7feba1",r:2.5}}/>}
            </AreaChart>
          </ResponsiveContainer>
        </div>}
        <div style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"16px 20px"}}>
          <div style={{fontSize:10,letterSpacing:"0.14em",color:T.dim,marginBottom:10}}>LOG HISTORY</div>
          {[...hist].reverse().map(e=>{const s2=getScore(activeMid,e.value,sex,eth);const c2=gC(s2);return <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0a1218",fontSize:12,gap:8,flexWrap:"wrap"}}>
            <span style={{color:T.dim}}>{e.date}</span>
            <span style={{color:c2,fontWeight:600}}>{e.value} {m.unit}{e.secondary?` / ${e.secondary}`:""}</span>
            <span style={{color:"#223344",flex:1}}>{e.note==="Apple Health"?<span style={{fontSize:9,color:"#007744",background:"rgba(0,100,60,0.15)",border:"1px solid rgba(0,150,80,0.2)",borderRadius:4,padding:"2px 7px"}}>⌘ Apple Health</span>:(e.note||"—")}</span>
            <span style={{color:c2,fontSize:10}}>{gL(s2)}</span>
          </div>;})}
          {!hist.length&&<div style={{fontSize:12,color:"#1e2a3a"}}>No entries yet.</div>}
        </div>
      </div>
    </div>;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────
  return <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.fn,color:T.txt}}>
    <style>{FONTS}</style>
    {showImport&&<ImportPanel onImport={handleImport} onClose={()=>setShowImport(false)}/>}
    {showSnap&&<SnapshotModal entries={entries} sex={sex} eth={eth} bioAge={bioAge} chronoAge={age} onClose={()=>setShowSnap(false)}/>}
    {showEth&&<EthModal eth={eth} setEth={e=>{setEth(e);window.storage?.set("ba6_eth",e);}} onClose={()=>setShowEth(false)}/>}

    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 22px",borderBottom:`1px solid ${T.bdr}`,background:"rgba(6,10,16,0.97)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:7}}>
      <div style={{fontFamily:T.dp,fontSize:17,fontWeight:800,color:T.br}}><span style={{color:T.gr}}>BIO</span>AGE</div>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",background:"#0a0e16",border:"1px solid #1e2a3a",borderRadius:7,overflow:"hidden"}}>
          {["female","male"].map(s=><button key={s} onClick={()=>{setSex(s);window.storage?.set("ba6_sex",s);}} style={{padding:"5px 10px",border:"none",cursor:"pointer",fontFamily:T.fn,fontSize:10,background:sex===s?"#0e2218":"transparent",color:sex===s?T.gr:"#334455",transition:"all 0.2s"}}>{s==="female"?"♀ Female":"♂ Male"}</button>)}
        </div>
        <button style={NB(eth!=="general")} onClick={()=>setShowEth(true)}>🌐 {eth==="general"?"Ethnicity":ethDef?.label}</button>
        {ahCount>0&&<div style={{fontSize:10,color:T.gr,background:"rgba(0,255,163,0.08)",border:"1px solid rgba(0,255,163,0.18)",borderRadius:20,padding:"3px 9px"}}>⌘ {ahCount}</div>}
        <button style={NB(false)} onClick={()=>setShowSnap(true)}>📸 Snapshot</button>
        <button style={NB(false)} onClick={()=>setShowImport(true)}>⬆ Apple Health</button>
        <button style={NB(false)} onClick={()=>setShowLog(f=>!f)}>{showLog?"✕":"+ Log"}</button>
      </div>
    </nav>

    {/* Hero */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 26px 20px",borderBottom:`1px solid ${T.bdr}`,flexWrap:"wrap",gap:18}}>
      <div>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:T.dim,textTransform:"uppercase",marginBottom:3}}>Estimated Biological Age</div>
        <div style={{fontFamily:T.dp,fontSize:56,fontWeight:900,color:T.gr,lineHeight:1,textShadow:"0 0 36px rgba(0,255,163,0.33)"}}>{bioAge?bioAge.toFixed(1):"–"}</div>
        {delta!==null&&<div style={{display:"inline-block",marginTop:9,padding:"4px 11px",borderRadius:20,fontSize:11,background:delta>0?"rgba(0,255,163,0.08)":"rgba(255,107,107,0.08)",border:`1px solid ${delta>0?"rgba(0,255,163,0.25)":"rgba(255,107,107,0.25)"}`,color:delta>0?T.gr:"#ff6b6b"}}>{delta>0?`↓ ${delta} yrs younger`:`↑ ${Math.abs(delta)} yrs older`} than chronological</div>}
        <div style={{marginTop:7,fontSize:10,color:"#1e3040"}}>{sex==="female"?"♀ Female":"♂ Male"} · {ethDef?.label} · Age {age}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:9}}>
        <div style={{fontSize:10,letterSpacing:"0.14em",color:T.dim}}>YOUR AGE</div>
        <input type="number" value={age} style={{background:"#0d1117",border:"1px solid #1e2a3a",borderRadius:8,color:T.br,fontFamily:T.fn,fontSize:13,padding:"7px 11px",width:100,textAlign:"center"}} onChange={e=>{setAge(+e.target.value);window.storage?.set("ba6_age",e.target.value);}}/>
        {overall&&<div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{position:"relative",width:50,height:50}}><GlowRing score={overall} size={50}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:gC(overall)}}>{overall}</div>
          </div>
          <div><div style={{fontSize:9,color:T.dim}}>OVERALL</div><div style={{fontSize:11,color:gC(overall)}}>{gL(overall)}</div></div>
        </div>}
      </div>
    </div>

    {/* CTA */}
    {ahCount===0&&<div style={{margin:"16px 26px 0",background:"rgba(0,255,163,0.03)",border:"1px solid rgba(0,255,163,0.1)",borderRadius:11,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div><div style={{fontFamily:T.dp,fontSize:13,fontWeight:700,color:T.br}}>📱 Connect Apple Health</div>
        <div style={{fontSize:11,color:T.dim,marginTop:2}}>Import VO₂ Max, RHR, BP, Glucose & Body Fat. Sex & age auto-detected.</div></div>
      <button style={{...BB2,padding:"8px 15px",fontSize:10}} onClick={()=>setShowImport(true)}>Import Now →</button>
    </div>}

    {/* Log */}
    {showLog&&<div style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:13,padding:"18px 22px",margin:"14px 26px 0"}}>
      <div style={{fontFamily:T.dp,fontSize:14,fontWeight:700,color:T.br,marginBottom:14}}>Log a Reading</div>
      <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:9}}>
        <select value={form.metricId} onChange={e=>setForm(f=>({...f,metricId:e.target.value}))} style={{...inp,flex:1}}>
          {MK.map(id=><option key={id} value={id}>{MB[id].label}</option>)}
        </select>
        <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/>
      </div>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <input type="number" placeholder={`Value (${getM(form.metricId,sex,eth)?.unit})`} value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} style={inp}/>
        {getM(form.metricId,sex,eth)?.secondary&&<input type="number" placeholder="Diastolic (mmHg)" value={form.secondary} onChange={e=>setForm(f=>({...f,secondary:e.target.value}))} style={inp}/>}
        <input type="text" placeholder="Note (optional)" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{...inp,flex:2}}/>
        <button style={BB2} onClick={logEntry}>{saved?"✓ Saved":"Save"}</button>
      </div>
    </div>}

    {/* Metric Cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,padding:"18px 26px"}}>
      {MK.map(id=>{
        const m=getM(id,sex,eth);const lat=getLatest(id);const hist=getHistory(id);
        const sc=lat?getScore(id,lat.value,sex,eth):null;const col=sc?gC(sc):"#1e2a3a";
        const trend=hist.length>=2?hist[hist.length-1].value-hist[hist.length-2].value:null;
        const tg=m.higherIsBetter?trend>0:trend<0;
        const ahN=hist.filter(e=>e.note==="Apple Health").length;
        return <div key={id} style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:13,padding:"18px 20px",cursor:"pointer",transition:"border 0.2s,box-shadow 0.2s",position:"relative",overflow:"hidden"}}
          onClick={()=>{setActiveMid(id);setView("metric");}}
          onMouseEnter={e=>{e.currentTarget.style.border=`1px solid ${col}44`;e.currentTarget.style.boxShadow=`0 0 24px ${col}08`;}}
          onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${T.bdr}`;e.currentTarget.style.boxShadow="none";}}>
          <div style={{position:"absolute",top:-44,right:-44,width:110,height:110,borderRadius:"50%",background:col,opacity:0.05,filter:"blur(24px)",pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:9,letterSpacing:"0.17em",textTransform:"uppercase",color:T.dim,marginBottom:3}}>
                {m.label}{ahN>0&&<span style={{fontSize:8,color:"#007744",background:"rgba(0,100,60,0.15)",border:"1px solid rgba(0,150,80,0.2)",borderRadius:4,padding:"1px 5px",marginLeft:7}}>⌘ {ahN}</span>}
              </div>
              {lat?<div style={{display:"flex",alignItems:"baseline",gap:3}}>
                <span style={{fontFamily:T.dp,fontSize:32,fontWeight:800,color:col,lineHeight:1.1,textShadow:`0 0 16px ${col}44`}}>{lat.value}</span>
                <span style={{fontSize:11,color:T.dim}}>{m.unit}</span>
                {m.secondary&&lat.secondary&&<span style={{fontSize:11,color:T.dim}}>/ {lat.secondary}</span>}
              </div>:<span style={{fontFamily:T.dp,fontSize:24,fontWeight:800,color:"#1e2a3a"}}>–</span>}
            </div>
            {sc&&<div style={{position:"relative",width:52,height:52}}><GlowRing score={sc} size={52}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:col}}>{Math.round(sc)}</div>
            </div>}
          </div>
          {sc?<div style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:9,letterSpacing:"0.07em",color:col,marginBottom:8}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}`}}/>
            {gL(sc)}{trend!==null&&<span style={{marginLeft:4,color:tg?T.gr:"#ff6b6b"}}>{tg?"↗":"↘"} {Math.abs(trend).toFixed(m.dp)}</span>}
          </div>:<div style={{fontSize:10,color:"#1e2a3a",marginBottom:8}}>No data — log or import Apple Health</div>}
          {lat&&<RangeBar m={m} compact={true}/>}
          {hist.length>1&&<div style={{marginTop:7,height:28}}>
            <ResponsiveContainer width="100%" height={28}>
              <LineChart data={hist.slice(-8).map(e=>({v:e.value}))}>
                <Line type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>}
          <div style={{position:"absolute",bottom:9,right:11,fontSize:8,color:"#1a2530",letterSpacing:"0.09em"}}>VIEW →</div>
        </div>;
      })}
    </div>

    {/* Impact + Recs */}
    <ImpactPanel entries={entries} age={age} sex={sex} eth={eth}/>

    {/* Bio Age Trajectory */}
    {bioTrend.length>1&&<div style={{margin:"0 26px 26px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:13,padding:"18px 22px"}}>
      <div style={{fontFamily:T.dp,fontSize:13,fontWeight:700,color:T.br,marginBottom:3}}>Biological Age Trajectory</div>
      <div style={{fontSize:11,color:"#223344",marginBottom:12}}>Bio age vs. chronological age over time</div>
      <ResponsiveContainer width="100%" height={185}>
        <AreaChart data={bioTrend} margin={{top:4,right:4,left:-20,bottom:0}}>
          <defs><linearGradient id="btg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.gr} stopOpacity={0.18}/><stop offset="100%" stopColor={T.gr} stopOpacity={0}/>
          </linearGradient></defs>
          <CartesianGrid stroke="#0e1824" strokeDasharray="3 3"/>
          <XAxis dataKey="date" tick={{fill:T.dim,fontSize:10,fontFamily:T.fn}}/>
          <YAxis tick={{fill:T.dim,fontSize:10,fontFamily:T.fn}}/>
          <Tooltip content={<CTip/>}/>
          <Area type="monotone" dataKey="Bio Age" stroke={T.gr} fill="url(#btg)" strokeWidth={2} dot={{fill:T.gr,r:3}}/>
          <Line type="monotone" dataKey="Chrono" stroke="#1e3a4a" strokeWidth={1.5} strokeDasharray="5 4" dot={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>}

    <div style={{padding:"0 26px 28px",fontSize:9,color:"#1a2530",lineHeight:2}}>
      VO₂ Max: ACSM by sex/age · Body Fat: ACE by sex · RHR: AHA · BP: AHA 2017 · Glucose: ADA + Attia · Ethnicity: WHO 2004, ADA, Lancet 2020 · Not medical advice
    </div>
  </div>;
}

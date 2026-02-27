import React, { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Analytics } from "@vercel/analytics/react";

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

// ── KDM Biological Age (Klemera-Doubal Method, adapted) ───────────────────
// Each biomarker is modelled as a linear function of chronological age (CA)
// in the general population (calibrated from NHANES III / FRIEND Registry /
// ACSM / AHA / ADA population norms, sex-stratified).
//   k  = regression slope of biomarker on CA (units per year)
//   q  = regression intercept (expected value at CA = 0 via linear fit)
//   s  = residual SD of biomarker regressed on CA in the reference population
//
// Formula (Klemera & Doubal 2006, Mech Ageing Dev):
//   implied_age_j = (x_j - q_j) / k_j          ← age this biomarker implies
//   weight_j      = k_j² / s_j²                 ← precision of biomarker–age link
//   BA = (Σ implied_j·w_j + CA·w_CA) / (Σ w_j + w_CA)
//   where w_CA = 1/s_BA²,  s_BA ≈ 7 yrs (between-person biological age SD)
//
// Properties vs. the old average-score formula:
//   ✓ Bio age can be OLDER than chronological age (poor metrics → BA > CA)
//   ✓ Anchors toward CA when data is sparse (avoids wild swings from 1 metric)
//   ✓ Each biomarker weighted by how tightly it tracks age in the population
//   ✓ No arbitrary ±15 yr ceiling — range is ±20 yr (rare extremes only)
//   ✓ Works correctly for any chronological age, including young adults
const KDM_P = {
  vo2max:  { female:{ k:-0.38, q:49.0, s:6.0  }, male:{ k:-0.46, q:60.0, s:7.5  } },
  rhr:     { female:{ k:0.07,  q:67.2, s:10.5 }, male:{ k:0.07,  q:67.2, s:10.5 } },
  bp:      { female:{ k:0.45,  q:104.8,s:15.0 }, male:{ k:0.45,  q:104.8,s:15.0 } },
  glucose: { female:{ k:0.28,  q:78.0, s:13.0 }, male:{ k:0.28,  q:78.0, s:13.0 } },
  bodyfat: { female:{ k:0.30,  q:15.5, s:7.0  }, male:{ k:0.25,  q:8.0,  s:6.5  } },
};
const KDM_S_BA=7.0; // between-person bio-age SD (years), from NHANES literature
const KDM_W_CA=1/(KDM_S_BA*KDM_S_BA);

// Core KDM computation — pass explicit latest values map {metricId:rawValue}
function _kdm(valMap, CA, sex){
  let sumWI=0,sumW=0,n=0;
  Object.entries(valMap).forEach(([id,val])=>{
    const p=KDM_P[id]; if(!p||val==null) return;
    const{k,q,s}=p[sex]||p.female; if(!k) return;
    sumWI+=((val-q)/k)*((k*k)/(s*s));
    sumW+=(k*k)/(s*s); n++;
  });
  if(!n) return null;
  const BA=(sumWI+CA*KDM_W_CA)/(sumW+KDM_W_CA);
  return Math.max(CA-20,Math.min(CA+20,+BA.toFixed(1)));
}

function getBioAge(entries,age,sex){
  const vm={};
  MK.forEach(id=>{const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];if(l)vm[id]=l.value;});
  return _kdm(vm,age,sex);
}

// Hypothetical BA if metric targetId reaches its best optimal boundary
function getHypoBioAge(entries,age,sex,eth,targetId){
  const vm={};
  MK.forEach(id=>{
    const p=KDM_P[id]; if(!p) return;
    if(id===targetId){
      const m=getM(id,sex,eth);
      vm[id]=m.higherIsBetter?m.opt.max:m.opt.min;
    } else {
      const l=entries.filter(e=>e.metricId===id).sort((a,b)=>b.date.localeCompare(a.date))[0];
      if(l) vm[id]=l.value;
    }
  });
  return _kdm(vm,age,sex);
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
// No seed data — the app starts empty. Health entries are never pre-loaded or faked.
// Entries are session-only and cleared when the browser tab is closed.

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

// ── Google Fit Takeout parser ─────────────────────────────────────────────
// Handles Google Takeout ZIPs:  Takeout/Fit/All Data/*.json
// Each file has a "Data Points" array; each point has dataTypeName + fitValue[].
const GFT={
  "com.google.heart_rate.bpm":"rhr",
  "com.google.blood_pressure":"bp",
  "com.google.blood_glucose.level":"glucose",
  "com.google.body.fat.percentage":"bodyfat",
  "com.google.fitness.vo2max":"vo2max",
  "com.google.vo2max":"vo2max",
};
// Detect whether a ZIP is a Google Fit Takeout (returns bool).
// Peeks at central-directory filenames without decompressing.
async function isGoogleFitZip(file){
  try{
    const ab=await file.slice(0,Math.min(file.size,2*1024*1024)).arrayBuffer();
    const view=new DataView(ab);const bytes=new Uint8Array(ab);
    const u32=o=>view.getUint32(o,true);const u16=o=>view.getUint16(o,true);
    const tdec=new TextDecoder();
    // scan local file headers to find a Fit JSON quickly
    let p=0;
    while(p<bytes.length-30){
      if(u32(p)!==0x04034b50){p++;continue;}
      const fnLen=u16(p+26),exLen=u16(p+28);
      const fname=tdec.decode(bytes.subarray(p+30,p+30+fnLen)).toLowerCase();
      if(fname.includes("fit")&&fname.endsWith(".json"))return true;
      p+=30+fnLen+exLen+u32(p+18); // skip compressed data
    }
    return false;
  }catch{return false;}
}
async function parseGF(file,onProgress){
  const byMD={},bpByDate={};
  const msFromNano=ns=>{
    if(typeof BigInt!=="undefined"){try{return Number(BigInt(String(ns))/1000000n);}catch{}}
    return Math.floor(Number(ns)/1000000);
  };
  const procJSON=(json,fname)=>{
    let data;try{data=JSON.parse(json);}catch{return;}
    const pts=data["Data Points"]||data.dataPoints||[];
    pts.forEach(pt=>{
      const dtn=pt.dataTypeName||"";
      let mid=GFT[dtn];
      if(!mid){
        // filename fallback for unlabelled data
        if(fname.includes("heart_rate"))mid="rhr";
        else if(fname.includes("blood_pressure"))mid="bp";
        else if(fname.includes("blood_glucose"))mid="glucose";
        else if(fname.includes("body_fat")||fname.includes("body.fat"))mid="bodyfat";
        else if(fname.includes("vo2"))mid="vo2max";
      }
      if(!mid)return;
      const ns=pt.startTimeNanos||pt.endTimeNanos||"";if(!ns)return;
      const date=new Date(msFromNano(ns)).toISOString().substring(0,10);
      const fv=pt.fitValue||[];if(!fv.length)return;
      if(mid==="bp"){
        const sys=fv[0]?.fpVal;const dia=fv[1]?.fpVal;
        if(sys&&sys>0){if(!bpByDate[date])bpByDate[date]=[];bpByDate[date].push({sys:Math.round(sys),dia:dia?Math.round(dia):undefined});}
      }else{
        let val=fv[0]?.fpVal??fv[0]?.intVal;if(val==null||isNaN(val))return;
        if(mid==="glucose"&&val<25)val=Math.round(val*18.0182); // mmol/L → mg/dL
        if(mid==="bodyfat"&&val<=1)val=parseFloat((val*100).toFixed(2)); // fraction → %
        if(!byMD[mid])byMD[mid]={};
        if(!byMD[mid][date])byMD[mid][date]=[];
        byMD[mid][date].push(val);
      }
    });
  };

  // ── Native ZIP reader (same approach as parseAH) ──────────────────────
  const ab=await file.arrayBuffer();
  const dv=new DataView(ab);const bytes=new Uint8Array(ab);
  const u32=o=>dv.getUint32(o,true);const u16=o=>dv.getUint16(o,true);
  const u64=o=>Number(dv.getBigUint64(o,true));const tdec=new TextDecoder();
  let eocd=-1;
  for(let i=ab.byteLength-22;i>=Math.max(0,ab.byteLength-65558);i--){
    if(u32(i)===0x06054b50){eocd=i;break;}
  }
  if(eocd===-1)throw new Error("Not a valid ZIP file.");
  let cdOffset=u32(eocd+16),cdSize=u32(eocd+12);
  if(eocd>=20&&u32(eocd-20)===0x07064b50){
    const z64loc=eocd-20,z64off=u64(z64loc+8);
    if(z64off<ab.byteLength&&u32(z64off)===0x06064b50){cdSize=u64(z64off+40);cdOffset=u64(z64off+48);}
  }
  // Collect all Fit JSON entries from central directory
  const fitFiles=[];let pos=cdOffset;
  while(pos<cdOffset+cdSize){
    if(u32(pos)!==0x02014b50)break;
    let compSize=u32(pos+20),uncompSize=u32(pos+24),localOff=u32(pos+42);
    const compression=u16(pos+10),fnLen=u16(pos+28),extraLen=u16(pos+30),commentLen=u16(pos+32);
    const fname=tdec.decode(bytes.subarray(pos+46,pos+46+fnLen));
    if(compSize===0xFFFFFFFF||uncompSize===0xFFFFFFFF||localOff===0xFFFFFFFF){
      let ep=pos+46+fnLen,epEnd=ep+extraLen;
      while(ep+4<=epEnd){
        const eid=u16(ep),esz=u16(ep+2);ep+=4;
        if(eid===0x0001){
          if(uncompSize===0xFFFFFFFF){uncompSize=u64(ep);ep+=8;}
          if(compSize===0xFFFFFFFF){compSize=u64(ep);ep+=8;}
          if(localOff===0xFFFFFFFF){localOff=u64(ep);}break;
        }ep+=esz;
      }
    }
    const lname=fname.toLowerCase();
    const inFitFolder=lname.includes("all data")||(lname.includes("fit")&&lname.includes("/"));
    if(inFitFolder&&lname.endsWith(".json")&&compSize>0)fitFiles.push({fname,compression,compSize,localOff});
    pos+=46+fnLen+extraLen+commentLen;
  }
  if(!fitFiles.length)throw new Error("No Google Fit data files found.\n\nPlease export from: Google Takeout → Fit → Include All Data → Download ZIP.");

  // Decompress and process each JSON file
  for(let i=0;i<fitFiles.length;i++){
    const{fname,compression,compSize,localOff}=fitFiles[i];
    if(onProgress)onProgress(Math.min(95,Math.round((i/fitFiles.length)*95)));
    if(u32(localOff)!==0x04034b50)continue;
    const lfnLen=u16(localOff+26),lextraLen=u16(localOff+28);
    const dataStart=localOff+30+lfnLen+lextraLen;
    const compSlice=bytes.subarray(dataStart,dataStart+compSize);
    let jsonText="";
    if(compression===0){jsonText=tdec.decode(compSlice);}
    else if(compression===8){
      const ds=new DecompressionStream("deflate-raw");
      const writer=ds.writable.getWriter();const reader=ds.readable.getReader();
      const chunks=[];
      await Promise.all([
        (async()=>{await writer.write(compSlice);await writer.close();})(),
        (async()=>{while(true){const{value,done}=await reader.read();if(done)break;chunks.push(value);}})(),
      ]);
      const total=chunks.reduce((a,b)=>a+b.length,0);
      const combined=new Uint8Array(total);let off=0;
      chunks.forEach(c=>{combined.set(c,off);off+=c.length;});
      jsonText=tdec.decode(combined);
    }else continue;
    procJSON(jsonText,fname.toLowerCase());
  }

  // Fold BP into byMD
  Object.entries(bpByDate).forEach(([date,vals])=>{if(!byMD.bp)byMD.bp={};byMD.bp[date]=vals;});
  const entries=[];
  Object.entries(byMD).forEach(([mid,byDate])=>{
    Object.entries(byDate).forEach(([date,vals])=>{
      if(mid==="bp"){vals.forEach(v=>{if(v.sys)entries.push({id:`gf_bp_${date}_${v.sys}`,metricId:"bp",value:v.sys,secondary:v.dia,date,note:"Google Fit"});});}
      else{const avg=vals.reduce((a,b)=>a+b,0)/vals.length;entries.push({id:`gf_${mid}_${date}`,metricId:mid,value:parseFloat(avg.toFixed(MB[mid]?.dp??1)),date,note:"Google Fit"});}
    });
  });
  const counts={};entries.forEach(e=>{counts[e.metricId]=(counts[e.metricId]||0)+1;});
  if(!entries.length)throw new Error("No matching health records found.\n\nMake sure your Google Fit export includes Heart Rate, Blood Pressure, Glucose, Body Fat, or VO₂ Max.");
  return{entries,counts,dSex:null,dDOB:null};
}

// ── Canvas snapshot ───────────────────────────────────────────────────────
function rrect(ctx,x,y,w,h,r=6){
  r=Math.min(r,w/2,h/2);ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
// ── Single source of truth for snapshot period ─────────────────────────
// ALL graphs in the snapshot (bio age trajectory + all 5 metric sparklines)
// derive their date window from this one function. Any future change to the
// period logic here automatically applies to every chart — no divergence possible.
function computeSnapshotPeriod(entries, months){
  const now=new Date();
  // Calendar month subtraction: "6 months" = exactly 6 calendar months back from today
  const cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-months);
  let cStr=cutoff.toISOString().substring(0,10);
  const pLabel=months===1?"Last 1 Month":months===3?"Last 3 Months":"Last 6 Months";
  // Fallback applied ONCE here so bio age trajectory and metric sparklines
  // always see the same window — they can never diverge from each other.
  const hasWindowData=entries.length>0&&entries.some(e=>e.date>=cStr);
  if(!hasWindowData&&entries.length>0) cStr=entries.map(e=>e.date).sort()[0];
  const windowNote=hasWindowData?"":` (all-time — no data in ${pLabel})`;
  // periodDays and numWeeks derived from the final cStr (post-fallback),
  // so the bio age weekly-point loop covers exactly the same range as metric sparklines.
  const cutoffActual=new Date(cStr);
  const periodDays=Math.max(1,Math.round((now-cutoffActual)/(1000*60*60*24)));
  const numWeeks=Math.ceil(periodDays/7);
  return{now,cStr,pLabel,periodDays,numWeeks,windowNote};
}

function renderSnapshot(entries,sex,eth,bioAge,chronoAge,months){
  const W=1500,H=1320;const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const ctx=cv.getContext("2d");
  // All period values come from the single shared helper — guaranteed consistent
  const{now,cStr,pLabel,periodDays,numWeeks,windowNote}=computeSnapshotPeriod(entries,months);
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
  const weekPts=[];
  for(let w=numWeeks;w>=0;w--){
    const d=new Date(now);d.setDate(d.getDate()-w*7);
    const dStr=d.toISOString().substring(0,10);
    if(dStr<cStr)continue;
    const ba=getBioAge(entries.filter(e=>e.date>=cStr&&e.date<=dStr),chronoAge,sex);
    if(ba)weekPts.push({date:dStr.slice(0,7),ba:+ba.toFixed(1)});
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
  const curBAall=getBioAge(entries,chronoAge,sex);
  const topImpacts=validIds.map(id=>{
    const hypBA=getHypoBioAge(entries,chronoAge,sex,eth,id);
    const gain=curBAall!=null&&hypBA!=null?+(curBAall-hypBA).toFixed(1):0;
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
    ctx.fillText(period[0].date.slice(0,7),SX,SY+SH+12);
    const el=period[period.length-1].date.slice(0,7);ctx.fillText(el,SX+SW-ctx.measureText(el).width,SY+SH+12);
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
    const curBA=getBioAge(entries,age,sex);
    const hypBA=getHypoBioAge(entries,age,sex,eth,id);
    const gain=curBA!=null&&hypBA!=null?+(curBA-hypBA).toFixed(1):0;
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
  const [period,setPeriod]=useState(1);
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

  const fname=`bioage-${period===1?"1mo":period===3?"3mo":"6mo"}-${new Date().toISOString().substring(0,10)}.jpg`;

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
        <button style={pb(1)} onClick={()=>setPeriod(1)}>1 Month</button>
        <button style={pb(3)} onClick={()=>setPeriod(3)}>3 Months</button>
        <button style={pb(6)} onClick={()=>setPeriod(6)}>6 Months</button>
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
  const [step,setStep]=useState("instructions"); // instructions | loading | preview | done
  const [platform,setPlatform]=useState("apple"); // apple | google
  const [drag,setDrag]=useState(false);
  const [prog,setProg]=useState(0);
  const [preview,setPreview]=useState(null);
  const [err,setErr]=useState(null);
  const ref=useRef();

  const process=async f=>{
    setErr(null);setStep("loading");setProg(0);
    try{
      // Auto-detect format from ZIP contents — override the tab selection if needed
      let isGF=false;
      if(f.name.toLowerCase().endsWith(".zip"))isGF=await isGoogleFitZip(f);
      if(isGF)setPlatform("google");
      const r=isGF?await parseGF(f,p=>setProg(p)):await parseAH(f,p=>setProg(p));
      setPreview({...r,source:isGF?"Google Fit":"Apple Health"});
      setStep("preview");
    }catch(e){setErr(e.message);setStep("instructions");}
  };

  const OL={position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20};
  const BX={background:T.card,border:"1px solid #1a2a1a",borderRadius:16,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",padding:"30px 34px",position:"relative",animation:"fadeUp 0.22s ease"};
  const BB={background:T.gr,color:"#030a06",fontFamily:T.fn,fontWeight:700,fontSize:12,letterSpacing:"0.09em",border:"none",borderRadius:8,padding:"11px 26px",cursor:"pointer",boxShadow:"0 0 18px rgba(0,255,163,0.25)",width:"100%",marginTop:18};
  const SB={background:"transparent",color:T.dim,fontFamily:T.fn,fontSize:11,border:"1px solid #1e2a3a",borderRadius:8,padding:"9px 18px",cursor:"pointer",width:"100%",marginTop:8};
  const ptab=a=>({flex:1,padding:"8px 0",border:"none",cursor:"pointer",fontFamily:T.fn,fontSize:11,letterSpacing:"0.07em",transition:"all 0.18s",
    background:platform===a?"#0e2218":"transparent",color:platform===a?T.gr:"#334455",borderBottom:`2px solid ${platform===a?T.gr:"transparent"}`});

  if(step==="done")return <div style={OL}><div style={BX}><div style={{textAlign:"center",padding:"22px 0"}}>
    <div style={{fontSize:50,marginBottom:10}}>✅</div>
    <div style={{fontFamily:T.dp,fontSize:20,fontWeight:800,color:T.gr}}>Import Complete!</div>
    <div style={{fontSize:12,color:T.dim,marginTop:8,lineHeight:1.8}}>
      {preview?.source&&<span style={{display:"block"}}>Source: <b style={{color:T.br}}>{preview.source}</b></span>}
      {preview?.dSex&&<span>Detected sex: <b style={{color:T.br}}>{preview.dSex}</b> — ranges updated. </span>}
      Data merged into session.
    </div>
    <button style={{...BB,maxWidth:220,margin:"18px auto 0",display:"block"}} onClick={onClose}>Back to Dashboard</button>
  </div></div></div>;

  if(step==="loading")return <div style={OL}><div style={BX}><div style={{textAlign:"center",padding:"44px 0"}}>
    <div style={{fontSize:38,display:"inline-block",animation:"spin 1.2s linear infinite",marginBottom:14}}>⟳</div>
    <div style={{fontFamily:T.dp,fontSize:17,fontWeight:700,color:T.gr}}>Parsing Health Data…</div>
    <div style={{color:T.dim,fontSize:12,marginTop:8,marginBottom:18}}>
      {platform==="google"?"Processing Google Fit JSON files…":"Streaming in 64 KB chunks — large exports take 15–30s."}
    </div>
    <div style={{background:"#0d1117",borderRadius:5,height:5,overflow:"hidden",width:"100%",maxWidth:280,margin:"0 auto"}}>
      <div style={{height:"100%",background:T.gr,width:`${prog}%`,transition:"width 0.3s",boxShadow:"0 0 7px rgba(0,255,163,0.5)"}}/>
    </div>
    {prog>0&&<div style={{fontSize:11,color:T.dim,marginTop:7}}>{prog}%</div>}
  </div></div></div>;

  if(step==="preview"&&preview)return <div style={OL}><div style={BX}>
    <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <div style={{fontFamily:T.dp,fontSize:18,fontWeight:800,color:T.br}}>Import Preview</div>
      <span style={{fontSize:9,padding:"2px 8px",borderRadius:4,border:"1px solid rgba(0,255,163,0.25)",color:T.gr,background:"rgba(0,255,163,0.07)",letterSpacing:"0.09em"}}>
        {preview.source==="Google Fit"?"📊 GOOGLE FIT":"⌘ APPLE HEALTH"}
      </span>
    </div>
    <div style={{fontSize:11,color:T.dim,marginBottom:18,lineHeight:1.8}}>
      Found <b style={{color:T.gr}}>{preview.entries.length} readings</b>.
      {preview.dSex&&<span> Sex: <b style={{color:T.br}}>{preview.dSex}</b>.</span>}
      {preview.dDOB&&<span> Age: <b style={{color:T.br}}>{new Date().getFullYear()-new Date(preview.dDOB).getFullYear()}</b>.</span>}
    </div>
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

  // ── Instructions screen ──────────────────────────────────────────────────
  const AH_STEPS=[
    {t:"Health app → Profile photo → Export All Health Data",d:"Confirm export. Large exports (>500 MB) take 30–60s to prepare."},
    {t:"Share export.zip to your computer",d:"Tap Share → Save to Files, or AirDrop to Mac."},
    {t:"Drop the ZIP or XML below",d:"Parsed in 64 KB chunks entirely in your browser."},
  ];
  const GF_STEPS=[
    {t:"Go to takeout.google.com",d:"Sign in with your Google account."},
    {t:"Deselect all → select Fit only → choose 'All Fit data'",d:"Export format: ZIP. Any file size is supported."},
    {t:"Download and drop the ZIP below",d:"We'll find all Health data JSON files automatically."},
  ];
  const steps=platform==="apple"?AH_STEPS:GF_STEPS;

  return <div style={OL}><div style={BX}>
    <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
    <div style={{fontFamily:T.dp,fontSize:20,fontWeight:800,color:T.br,marginBottom:4}}>Import Health Data</div>
    <div style={{fontSize:11,color:T.dim,marginBottom:16,lineHeight:1.8}}>All parsing is local — your data never leaves this device.</div>

    {/* Platform tabs */}
    <div style={{display:"flex",borderBottom:"1px solid #1e2a3a",marginBottom:22,gap:0}}>
      <button style={ptab("apple")} onClick={()=>setPlatform("apple")}>📱 Apple Health</button>
      <button style={ptab("google")} onClick={()=>setPlatform("google")}>📊 Google Fit</button>
    </div>

    {platform==="google"&&<div style={{marginBottom:14,padding:"9px 13px",background:"rgba(96,192,240,0.04)",border:"1px solid rgba(96,192,240,0.15)",borderRadius:7,fontSize:11,color:"#60c0f0",lineHeight:1.8}}>
      📌 Google Fit VO₂ Max is device-dependent. If unavailable, log it manually after importing.
    </div>}

    {steps.map((s,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:14}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:"#0e2218",border:"1px solid #00ffa3",color:"#00ffa3",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>{i+1}</div>
      <div style={{fontSize:12,color:"#8899aa",lineHeight:1.7}}><span style={{color:T.br,display:"block",fontWeight:500}}>{s.t}</span>{s.d}</div>
    </div>)}

    <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)process(f);}} onClick={()=>ref.current?.click()}
      style={{border:`2px dashed ${drag?"#00ffa3":"#1e2a3a"}`,borderRadius:10,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:drag?"rgba(0,255,163,0.04)":"transparent",transition:"all 0.2s",marginTop:4}}>
      <div style={{fontSize:30,marginBottom:8}}>{platform==="google"?"📊":"⬆"}</div>
      <div style={{fontSize:13,color:T.dim}}>
        Drop your <b style={{color:T.br}}>{platform==="google"?"takeout-*.zip":"export.zip"}</b> here
        <span style={{color:"#00ffa3",display:"block",fontSize:11,marginTop:3}}>or click to browse · format auto-detected</span>
      </div>
      <input ref={ref} type="file" accept=".zip,.xml" style={{display:"none"}} onChange={e=>{if(e.target.files[0])process(e.target.files[0]);}}/>
    </div>
    <div style={{marginTop:10,padding:"9px 13px",background:"rgba(0,100,255,0.03)",borderRadius:7,border:"1px solid rgba(40,60,120,0.2)",fontSize:10,color:T.dim,lineHeight:1.7}}>
      🔒 Privacy: Parsed 100% in-browser via WebStreams API. Nothing is uploaded.
    </div>
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

// ── Landing Page (About tab) ──────────────────────────────────────────────
const LP_CSS=`
.lp{font-family:'DM Sans',sans-serif;color:#e0eeff;background:#060a10;min-height:100vh;overflow-x:hidden;}
.lp-grid{position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(0,255,163,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,163,.022) 1px,transparent 1px);
  background-size:60px 60px;}
.lp *{position:relative;z-index:1;}
.lp-sec{padding:88px 24px;max-width:1080px;margin:0 auto;}
.lp-lbl{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#00ffa3;margin-bottom:14px;display:flex;align-items:center;gap:10px;}
.lp-lbl::after{content:'';flex:1;height:1px;background:#162030;max-width:56px;}
.lp h2{font-family:'Syne',sans-serif;font-size:clamp(28px,4.5vw,50px);font-weight:800;line-height:1.08;letter-spacing:-.02em;margin-bottom:14px;}
.lp-sub{font-size:15px;color:#7a9aaa;max-width:500px;line-height:1.72;margin-bottom:52px;}
.lp-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,255,163,.07);border:1px solid rgba(0,255,163,.22);border-radius:20px;padding:6px 18px;margin-bottom:34px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#00ffa3;}
.lp-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#00ffa3;box-shadow:0 0 8px #00ffa3;animation:lpPulse 2s infinite;}
@keyframes lpPulse{0%,100%{opacity:1}50%{opacity:.35}}
.lp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2px;}
.lp-step{background:#0a0e16;padding:30px 26px;border:1px solid #0e1824;transition:border-color .2s,transform .2s;position:relative;overflow:hidden;}
.lp-step:hover{border-color:rgba(0,255,163,.22);transform:translateY(-3px);}
.lp-step::before{content:attr(data-n);position:absolute;top:-14px;right:12px;font-family:'Syne',sans-serif;font-size:86px;font-weight:900;color:rgba(0,255,163,.035);line-height:1;pointer-events:none;}
.lp-step h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin:12px 0 8px;}
.lp-step p{font-size:13px;color:#6a8a9a;line-height:1.7;}
.lp-feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:13px;}
.lp-feat{background:#0a0e16;border:1px solid #0e1824;border-radius:12px;padding:24px 22px;transition:border-color .2s,box-shadow .2s;}
.lp-feat:hover{border-color:rgba(0,255,163,.18);box-shadow:0 0 26px rgba(0,255,163,.05);}
.lp-feat-ic{width:38px;height:38px;border-radius:9px;background:rgba(0,255,163,.07);border:1px solid rgba(0,255,163,.14);display:flex;align-items:center;justify-content:center;font-size:17px;margin-bottom:14px;}
.lp-feat h3{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:6px;}
.lp-feat p{font-size:12.5px;color:#6a8a9a;line-height:1.7;}
.lp-ftag{display:inline-block;margin-top:11px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#00ffa3;background:rgba(0,255,163,.07);border:1px solid rgba(0,255,163,.14);border-radius:4px;padding:3px 8px;}
.lp-priv{background:linear-gradient(135deg,rgba(0,255,163,.04) 0%,rgba(0,100,80,.025) 100%);border:1px solid rgba(0,255,163,.14);border-radius:14px;padding:40px 46px;display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;}
.lp-priv h3{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:9px;}
.lp-priv p{font-size:13px;color:#7a9aaa;line-height:1.78;}
.lp-ptags{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.lp-ptag{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:#00ffa3;background:rgba(0,255,163,.07);border:1px solid rgba(0,255,163,.14);border-radius:20px;padding:4px 12px;}
.lp-mtbl{display:flex;flex-direction:column;gap:2px;}
.lp-mrow{display:grid;grid-template-columns:190px 1fr 180px;background:#0a0e16;border:1px solid #0e1824;transition:border-color .2s;}
.lp-mrow:first-child{border-radius:11px 11px 0 0;}
.lp-mrow:last-child{border-radius:0 0 11px 11px;}
.lp-mrow:hover{border-color:#162030;}
.lp-mrow>div{padding:18px 20px;border-right:1px solid #0e1824;}
.lp-mrow>div:last-child{border-right:none;}
.lp-mn{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:3px;}
.lp-mu{font-family:'DM Mono',monospace;font-size:10px;color:#4a6070;}
.lp-mw{font-size:12.5px;color:#7a9aaa;line-height:1.65;}
.lp-ms{font-family:'DM Mono',monospace;font-size:10px;color:#4a6070;line-height:1.85;}
.lp-strip{display:flex;justify-content:center;border-top:1px solid #0e1824;border-bottom:1px solid #0e1824;background:rgba(10,14,22,.65);overflow-x:auto;}
.lp-pill{display:flex;flex-direction:column;align-items:center;padding:18px 34px;border-right:1px solid #0e1824;white-space:nowrap;flex-shrink:0;}
.lp-pill:last-child{border-right:none;}
.lp-pill .lv{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;}
.lp-pill .ll{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.13em;color:#4a6070;text-transform:uppercase;margin-top:4px;}
.lp-pill .ls{font-size:9px;color:#2a3a4a;margin-top:1px;}
.lp-rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;}
.lp-paper{background:#0a0e16;border:1px solid #0e1824;border-radius:11px;padding:20px 18px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s,transform .2s;}
.lp-paper:hover{border-color:#162030;transform:translateY(-2px);}
.lp-pmeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.lp-pt{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;padding:3px 7px;border-radius:4px;border:1px solid;white-space:nowrap;}
.lp-tvo2{color:#00ffa3;border-color:rgba(0,255,163,.3);background:rgba(0,255,163,.06);}
.lp-thr{color:#f0c060;border-color:rgba(240,192,96,.3);background:rgba(240,192,96,.06);}
.lp-tbp{color:#ff6b6b;border-color:rgba(255,107,107,.3);background:rgba(255,107,107,.06);}
.lp-tgl{color:#7feba1;border-color:rgba(127,235,161,.3);background:rgba(127,235,161,.06);}
.lp-tbf{color:#a78bfa;border-color:rgba(167,139,250,.3);background:rgba(167,139,250,.06);}
.lp-tba{color:#60c0f0;border-color:rgba(96,192,240,.3);background:rgba(96,192,240,.06);}
.lp-pyr{font-family:'DM Mono',monospace;font-size:10px;color:#4a6070;}
.lp-paper h4{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;line-height:1.3;color:#e0eeff;}
.lp-pauth{font-family:'DM Mono',monospace;font-size:10px;color:#4a6070;}
.lp-pp{font-size:12.5px;color:#7a9aaa;line-height:1.7;}
.lp-pf{font-size:11.5px;color:#00ffa3;font-family:'DM Mono',monospace;background:rgba(0,255,163,.05);border-left:2px solid rgba(0,255,163,.38);padding:7px 10px;border-radius:0 5px 5px 0;line-height:1.6;}
.lp-paper a{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;color:#4a6070;text-decoration:none;text-transform:uppercase;display:inline-flex;align-items:center;gap:4px;transition:color .2s;margin-top:auto;}
.lp-paper a:hover{color:#00ffa3;}
.lp-paper a::after{content:'↗';}
.lp-cta{text-align:center;padding:100px 24px;background:radial-gradient(ellipse 80% 55% at 50% 0%,rgba(0,255,163,.06) 0%,transparent 70%);border-top:1px solid #0e1824;}
.lp-cta h2{font-size:clamp(30px,5.5vw,64px);margin-bottom:16px;}
.lp-cta p{font-size:15px;color:#7a9aaa;max-width:440px;margin:0 auto 38px;line-height:1.72;}
.lp-disc{padding:28px 48px;border-top:1px solid #0e1824;font-size:11px;color:#2a3a4a;line-height:1.65;max-width:900px;margin:0 auto;}
@media(max-width:820px){.lp-mrow{grid-template-columns:1fr;}.lp-mrow>div{border-right:none;border-bottom:1px solid #0e1824;}.lp-mrow>div:last-child{border-bottom:none;}.lp-priv{padding:26px 22px;}}
.lp-faq{display:flex;flex-direction:column;gap:0;}
.lp-faq-q{background:#0a0e16;border:1px solid #0e1824;margin-bottom:2px;border-radius:8px;overflow:hidden;transition:border-color .2s;}
.lp-faq-q:hover{border-color:#162030;}
.lp-faq-q.open{border-color:rgba(0,255,163,.18);}
.lp-faq-hdr{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;cursor:pointer;gap:16px;}
.lp-faq-hdr h4{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#e0eeff;margin:0;line-height:1.3;}
.lp-faq-icon{font-family:'DM Mono',monospace;font-size:14px;color:#00ffa3;flex-shrink:0;transition:transform .2s;}
.lp-faq-q.open .lp-faq-icon{transform:rotate(45deg);}
.lp-faq-body{padding:0 24px 22px;font-size:13px;color:#7a9aaa;line-height:1.85;}
.lp-faq-body p{margin:0 0 12px;}
.lp-faq-body p:last-child{margin-bottom:0;}
.lp-faq-body .faq-cite{display:inline-flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#00ffa3;background:rgba(0,255,163,.07);border:1px solid rgba(0,255,163,.2);border-radius:4px;padding:2px 7px;margin-left:4px;text-decoration:none;vertical-align:middle;}
.lp-faq-body .faq-cite:hover{background:rgba(0,255,163,.14);}
.lp-faq-body .faq-hl{color:#e0eeff;font-weight:600;}
.lp-faq-body ul{margin:8px 0 12px 16px;padding:0;}
.lp-faq-body li{margin-bottom:7px;}

`;

function FAQ(){
  const [open,setOpen]=React.useState(null);
  const qs=[
    {
      id:"meaning",
      q:"What does it mean if my bio age is higher or lower than my real age?",
      a:<>
        <p>Think of biological age as a measure of how well your body is actually functioning — not just how many birthdays you've had. Two people who are both 50 years old can have very different bodies on the inside depending on their lifestyle, genetics, and health history.</p>
        <p><span className="faq-hl">If your bio age is lower than your chronological age</span> — say you're 50 but your bio age comes back as 44 — that's a genuinely good sign. It means the measurable health markers used here (cardiorespiratory fitness, heart rate, blood pressure, blood sugar, and body fat) are performing like those of a healthier, physiologically younger person. Research shows this correlates strongly with lower risk of heart disease, diabetes, and early death. <a className="faq-cite" href="https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428" target="_blank" rel="noopener">Mandsager 2018 ↗</a></p>
        <p><span className="faq-hl">If your bio age is higher than your chronological age</span> — say you're 50 but your bio age comes back as 57 — it means one or more of your key health markers are underperforming for your age group. This is a signal to pay attention, not a diagnosis. The good news: these markers are changeable. Cardiorespiratory fitness alone, for example, is more responsive to lifestyle intervention than almost any other health metric. <a className="faq-cite" href="https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428" target="_blank" rel="noopener">Mandsager 2018 ↗</a></p>
        <p>The important thing is that this number is a direction-finder, not a verdict. A bio age that's currently older than your real age is telling you which levers to pull — and the Impact Plan below the dashboard tells you exactly which ones move the needle most for you personally.</p>
      </>
    },
    {
      id:"formula",
      q:"How is bio age actually calculated — and why are some metrics weighted more than others?",
      a:<>
        <p>The formula used here is based on the <span className="faq-hl">Klemera-Doubal Method (KDM)</span>, which is the most well-validated algorithm for computing biological age from clinical biomarkers. It consistently outperforms simpler approaches like averaging scores or using principal component analysis. <a className="faq-cite" href="https://pubmed.ncbi.nlm.nih.gov/16318865/" target="_blank" rel="noopener">Klemera & Doubal 2006 ↗</a></p>
        <p>Here's the core idea in plain English: each of the five metrics is first modelled against how it typically changes with age in the general population. For example, VO₂ Max (cardiorespiratory fitness) tends to decline by about 0.38–0.46 mL/kg/min every year in adults. Blood pressure tends to rise by about 0.45 mmHg per year. These age-tracking curves come from large population studies including NHANES III, the FRIEND Registry, and ACSM/AHA/ADA reference data.</p>
        <p>Your individual reading is then compared to that curve: <span className="faq-hl">what age does your VO₂ Max value imply? What age does your glucose imply?</span> Each metric produces its own "implied age". Those implied ages are combined into one number — but not with equal weight. A metric is given more influence if it tracks age more precisely in the population (smaller variability around the regression line), and less influence if it's noisier.</p>
        <p>This is why <span className="faq-hl">VO₂ Max carries the most weight</span>: it is the single strongest predictor of all-cause mortality ever measured in a large population study, outperforming blood pressure, cholesterol, diabetes, and even smoking. A one-unit improvement in VO₂ Max reduces all-cause mortality risk by roughly 13%. <a className="faq-cite" href="https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428" target="_blank" rel="noopener">Mandsager 2018 ↗</a></p>
        <p>Finally, the formula anchors the estimate toward your actual chronological age when data is sparse — so if you've only logged two of the five metrics, the result is appropriately conservative rather than wildly skewed.</p>
      </>
    },
    {
      id:"personalization",
      q:"How does age, sex, and ethnicity change my results?",
      a:<>
        <p>The reference ranges and targets are not one-size-fits-all. Three dimensions of your profile adjust the calculation:</p>
        <p><span className="faq-hl">Age:</span> The KDM formula is age-aware by design — it compares your biomarker values against population norms for your age decade, not against a single universal reference. A VO₂ Max of 32 mL/kg/min means something different for a 30-year-old than a 65-year-old. The ACSM publishes sex- and age-stratified fitness norms used here. <a className="faq-cite" href="https://acsm.org/education-resources/books/guidelines-exercise-testing-prescription/" target="_blank" rel="noopener">ACSM 2022 ↗</a></p>
        <p><span className="faq-hl">Sex:</span> Several metrics have meaningfully different reference ranges for females vs. males. Women naturally carry more essential body fat (due to hormonal and reproductive function), have different VO₂ Max norms, and have historically had lower rates of hypertension in younger age groups. All ranges and optimal targets in this app are sex-specific. ACE, ACSM, and AHA all publish sex-stratified norms. <a className="faq-cite" href="https://www.acefitness.org/education-and-resources/lifestyle/blog/112/what-are-the-guidelines-for-percentage-of-body-fat-loss/" target="_blank" rel="noopener">ACE norms ↗</a></p>
        <p><span className="faq-hl">Ethnicity:</span> Research shows that cardiometabolic risk develops at different thresholds across ethnic groups — and that applying Western population norms universally can miss real risk. Three key adjustments are made based on peer-reviewed evidence:</p>
        <ul>
          <li><span className="faq-hl">South Asian and East Asian:</span> WHO and Lancet research shows these groups develop insulin resistance and cardiovascular disease at lower body fat levels than European populations. Optimal body fat and glucose targets are adjusted tighter. <a className="faq-cite" href="https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(03)15268-3/fulltext" target="_blank" rel="noopener">WHO 2004 ↗</a> <a className="faq-cite" href="https://www.thelancet.com/journals/landia/article/PIIS2213-8587(20)30203-4/fulltext" target="_blank" rel="noopener">Lancet 2020 ↗</a></li>
          <li><span className="faq-hl">Black / African American:</span> AHA and ACC evidence documents earlier onset and higher severity of hypertension in this group. The optimal blood pressure target is adjusted to a tighter ceiling. <a className="faq-cite" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7301145/" target="_blank" rel="noopener">Ferdinand 2020 ↗</a></li>
          <li><span className="faq-hl">Hispanic / Latino:</span> ADA data shows the highest rates of type 2 diabetes prevalence in this group, supporting a tighter optimal glucose range. <a className="faq-cite" href="https://diabetesjournals.org/care/issue/46/Supplement_1" target="_blank" rel="noopener">ADA 2023 ↗</a></li>
        </ul>
        <p>These are population-level adjustments, not individual diagnoses. Always discuss your personal health thresholds with a physician.</p>
      </>
    },
    {
      id:"plan",
      q:"How is my priority action plan personalised for me?",
      a:<>
        <p>The priority ranking isn't generic advice — it's computed specifically from your data. Here's how it works:</p>
        <p>For each metric where you have data, the app asks: <span className="faq-hl">"If this one metric improved to its optimal target, how many years younger would my bio age become?"</span> It computes this by running the KDM bio age formula twice — once with your actual readings, and once with that one metric swapped to its optimal value while everything else stays the same. The difference is your potential gain in years for that metric.</p>
        <p>The metric with the largest potential gain is ranked #1 in your Impact Plan. This means if your glucose is in the pre-diabetic range and your VO₂ Max is already excellent, glucose will appear at the top — even though in a general population sense, VO₂ Max is considered the most important metric. The ranking is always your ranking, not a generic one.</p>
        <p>The recommendations for each metric come in three tiers based on your current score — Good, Fair, or Needs Work — with protocols sourced from:</p>
        <ul>
          <li><span className="faq-hl">VO₂ Max:</span> ACSM Zone 2 and interval training protocols. Each 1 MET improvement reduces all-cause mortality by ~13%. <a className="faq-cite" href="https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428" target="_blank" rel="noopener">Mandsager 2018 ↗</a></li>
          <li><span className="faq-hl">Resting Heart Rate:</span> AHA sleep, alcohol, and endurance guidance. <a className="faq-cite" href="https://www.cmaj.ca/content/188/3/E53" target="_blank" rel="noopener">Zhang 2016 ↗</a></li>
          <li><span className="faq-hl">Blood Pressure:</span> DASH diet and sodium protocols from AHA/ACC and SPRINT trial. <a className="faq-cite" href="https://www.nejm.org/doi/full/10.1056/NEJMoa1511939" target="_blank" rel="noopener">SPRINT 2015 ↗</a></li>
          <li><span className="faq-hl">Fasting Glucose:</span> ADA dietary guidance and Peter Attia's longevity-focused targets. <a className="faq-cite" href="https://diabetesjournals.org/care/issue/46/Supplement_1" target="_blank" rel="noopener">ADA 2023 ↗</a></li>
          <li><span className="faq-hl">Body Fat:</span> ACE resistance training and protein targets. <a className="faq-cite" href="https://www.acefitness.org/education-and-resources/lifestyle/blog/112/what-are-the-guidelines-for-percentage-of-body-fat-loss/" target="_blank" rel="noopener">ACE norms ↗</a></li>
        </ul>
        <p>Nothing in the plan is a medical prescription. It is a translation of clinical guidelines into plain-English starting points. Always work with a healthcare professional on your specific situation.</p>
      </>
    },
  ];
  return <div className="lp-sec" style={{background:"rgba(7,10,17,.9)",padding:"88px 24px",maxWidth:"100%"}}>
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <div className="lp-lbl">FAQ</div>
      <h2>Questions, answered<br/>in plain English</h2>
      <p style={{fontSize:14,color:"#7a9aaa",lineHeight:1.8,maxWidth:580,marginBottom:44}}>No medical jargon. Just clear answers to the questions we get asked most — with the research linked so you can go deeper if you want.</p>
      <div className="lp-faq">
        {qs.map(item=><div key={item.id} className={`lp-faq-q${open===item.id?" open":""}`}>
          <div className="lp-faq-hdr" onClick={()=>setOpen(open===item.id?null:item.id)}>
            <h4>{item.q}</h4>
            <span className="lp-faq-icon">+</span>
          </div>
          {open===item.id&&<div className="lp-faq-body">{item.a}</div>}
        </div>)}
      </div>
    </div>
  </div>;
}

function LandingPage({onEnterApp}){
  const P=({cls,children,...r})=><div className={`lp-paper ${cls||""}`} {...r}>{children}</div>;
  const cta={display:"inline-block",background:"#00ffa3",color:"#030a06",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:500,letterSpacing:"0.11em",textTransform:"uppercase",padding:"15px 44px",borderRadius:8,border:"none",cursor:"pointer",transition:"all 0.22s",boxShadow:"0 0 50px rgba(0,255,163,0.3)"};
  return <div className="lp">
    <style>{LP_CSS}</style>
    <div className="lp-grid"/>

    {/* Hero */}
    <div style={{minHeight:"88vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"80px 24px 52px",position:"relative"}}>
      <div style={{position:"absolute",top:"18%",left:"50%",transform:"translateX(-50%)",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,163,.065) 0%,transparent 68%)",pointerEvents:"none"}}/>
      <div className="lp-badge">Free · Private · Science-backed · iOS &amp; Android</div>
      <h2 style={{fontSize:"clamp(48px,8vw,94px)",fontFamily:"'Syne',sans-serif",fontWeight:900,lineHeight:.94,letterSpacing:"-.03em",marginBottom:26}}>
        <span style={{color:"#00ffa3"}}>How old</span><br/>is your body<br/><span style={{color:"#4a6070",fontSize:"clamp(24px,3.8vw,42px)"}}>really?</span>
      </h2>
      <p style={{maxWidth:560,fontSize:17,color:"#7a9aaa",lineHeight:1.78,marginBottom:46}}>BioAge calculates your biological age from 5 clinically validated health metrics — then tells you which ones to fix and how, ranked by longevity impact.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button style={cta} onClick={onEnterApp}>Open Dashboard →</button>
        <a href="#lp-how" style={{background:"transparent",color:"#e0eeff",fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",padding:"15px 32px",borderRadius:8,textDecoration:"none",border:"1px solid #162030",transition:"all 0.2s",display:"inline-block"}}>How It Works</a>
      </div>
      <p style={{marginTop:24,fontFamily:"'DM Mono',monospace",fontSize:10,color:"#4a6070",letterSpacing:"0.08em"}}>🔒 Your health data <span style={{color:"#00ffa3"}}>never leaves your device</span> — parsed entirely in-browser</p>
    </div>

    {/* Metrics strip */}
    <div className="lp-strip">
      {[["VO₂ Max","Cardio Fitness","ACSM","#00ffa3"],["Heart Rate","Resting HR","AHA","#f0c060"],["Blood Pressure","Systolic/Diastolic","AHA 2017","#ff6b6b"],["Glucose","Fasting Blood Sugar","ADA + Attia","#7feba1"],["Body Fat %","Composition","ACE by Sex","#a78bfa"]].map(([v,l,s,c])=>
        <div key={v} className="lp-pill"><div className="lv" style={{color:c}}>{v}</div><div className="ll">{l}</div><div className="ls">{s}</div></div>)}
    </div>

    {/* How it works */}
    <div id="lp-how" className="lp-sec" style={{padding:"88px 24px"}}>
      <div className="lp-lbl">Process</div>
      <h2>From raw data to<br/>a single number</h2>
      <p className="lp-sub">BioAge turns your health metrics into one easy-to-understand score — your estimated biological age — with a full breakdown of what's driving it.</p>
      <div className="lp-steps">
        {[["📱","Import or Log","Drop your Apple Health ZIP or Google Fit Takeout ZIP into the browser — no upload, no account. Or manually log any reading. Sex and age are auto-detected from Apple Health exports.","1"],
          ["⚡","Score Each Metric","Each metric is scored 15–100 against sex-specific clinical ranges from ACSM, AHA, ADA, and ACE. Ethnicity-adjusted thresholds applied where evidence supports them.","2"],
          ["🧬","Estimate Bio Age","Each biomarker implies an age based on where your value sits relative to population regression curves (calibrated from NHANES, FRIEND Registry, ACSM and AHA data). These implied ages are combined using the Klemera-Doubal Method — a precision-weighted average that can show bio age both younger AND older than your chronological age. Missing metrics anchor the estimate toward your actual age rather than distorting the result.","3"],
          ["🎯","Prioritised Action Plan","Each metric is ranked by bio-age years you could recover at optimal. The 30-day plan gives specific, research-backed protocols — not generic health tips.","4"],
        ].map(([ic,title,desc,n])=>
          <div key={n} className="lp-step" data-n={n}><div style={{fontSize:24}}>{ic}</div><h3>{title}</h3><p>{desc}</p></div>)}
      </div>
    </div>

    {/* Features */}
    <div className="lp-sec" style={{background:"rgba(8,12,20,.55)",padding:"88px 24px",maxWidth:"100%"}}>
      <div style={{maxWidth:1080,margin:"0 auto"}}>
        <div className="lp-lbl">Features</div>
        <h2>Everything you need.<br/>Nothing you don't.</h2>
        <p className="lp-sub">Built for people who want real insight from their health data — without subscriptions, accounts, or privacy trade-offs.</p>
        <div className="lp-feats">
          {[["🧬","Biological Age Estimate","A single number derived from 5 biomarkers using the Klemera-Doubal Method (KDM) — the most validated biological age algorithm in peer-reviewed literature. Bio age can be younger OR older than your chronological age, and anchors correctly when data is sparse.","Core metric"],
            ["📊","Trend Tracking","Monthly bio age trajectory over 12 months. Per-metric sparklines show whether you're improving or declining — with optimal reference lines on every chart.","Visual analytics"],
            ["📱","iOS Import — Apple Health","Drop your export.zip into the browser. The streaming parser handles files of any size — even 600 MB+ exports — in 64 KB chunks. Nothing is uploaded.","Zero upload"],
            ["📊","Android Import — Google Fit","Drop your Google Takeout ZIP. BioAge automatically detects the format, walks the Fit/All Data JSON files, and merges your readings in seconds.","New"],
            ["🌐","Ethnicity-Adjusted Ranges","Evidence-based threshold adjustments for South Asian, Black/African American, Hispanic/Latino, and East Asian populations from WHO, ADA, AHA, and Lancet.","Personalised"],
            ["🎯","Impact-Ranked Action Plan","Each metric ranked by years of bio age you could recover at optimal. The 30-day plan gives one clear, evidence-backed protocol per metric.","Actionable"],
          ].map(([ic,title,desc,tag])=>
            <div key={title} className="lp-feat"><div className="lp-feat-ic">{ic}</div><h3>{title}</h3><p>{desc}</p><span className="lp-ftag">{tag}</span></div>)}
        </div>
      </div>
    </div>

    {/* The 5 metrics */}
    <div className="lp-sec" style={{background:"rgba(8,12,20,.55)",padding:"88px 24px",maxWidth:"100%"}}>
      <div style={{maxWidth:1080,margin:"0 auto"}}>
        <div className="lp-lbl">The Five Metrics</div>
        <h2>Why these five?</h2>
        <p className="lp-sub">The most predictive, routinely measurable biomarkers for longevity — each independently validated across decades of clinical research.</p>
        <div className="lp-mtbl">
          {[
            ["VO₂ Max","mL/kg/min · ACSM","#00ffa3","The maximum oxygen your body can use during intense exercise. The single strongest predictor of long-term survival — stronger than blood pressure, cholesterol, or smoking. Each 1-unit improvement reduces all-cause mortality risk by ~13%.","Apple Watch (outdoor run) · 12-min Cooper Run · Lab VO₂ Max test"],
            ["Resting Heart Rate","bpm · AHA","#f0c060","How many times your heart beats per minute at complete rest. A lower RHR means your heart pumps more blood per beat. RHR above 76 bpm is associated with significantly higher cardiovascular risk.","Apple Watch · Wear OS watch · 60-sec morning wrist count"],
            ["Blood Pressure","mmHg systolic · AHA 2017","#ff6b6b","The pressure blood exerts against artery walls. High BP silently damages arteries and organs for years. Keeping systolic below 120 mmHg dramatically reduces risk of heart attack, stroke, and kidney disease.","Omron/Withings cuff — syncs to Apple Health or Google Fit"],
            ["Fasting Glucose","mg/dL · ADA + Attia","#7feba1","Blood sugar after 8+ hrs without eating. Chronically elevated glucose accelerates cellular ageing even below the diabetic threshold. Optimal target 60–85 mg/dL — tighter than standard clinical guidelines.","ReliOn glucometer → Apple Health or Google Fit sync · CGM"],
            ["Body Fat %","% · ACE by sex","#a78bfa","The proportion of body weight that is fat. Excess fat — especially visceral fat — drives insulin resistance and inflammation. Unlike BMI, body fat % correctly separates muscle from fat mass.","Smart scale (Withings/Renpho) → Apple Health or Google Fit sync"],
          ].map(([n,u,c,w,s])=>
            <div key={n} className="lp-mrow">
              <div><div className="lp-mn" style={{color:c}}>{n}</div><div className="lp-mu">{u}</div></div>
              <div className="lp-mw">{w}</div>
              <div className="lp-ms">{s}</div>
            </div>)}
        </div>
      </div>
    </div>

    {/* FAQ */}
    <FAQ/>

    {/* Privacy */}
    <div className="lp-sec" style={{padding:"88px 24px"}}>
      <div className="lp-priv">
        <div style={{fontSize:42,flexShrink:0,marginTop:4}}>🔒</div>
        <div>
          <h3>Your health data never leaves your device</h3>
          <p>BioAge runs entirely in your browser. Apple Health ZIPs are decompressed via the browser's built-in DecompressionStream API; Google Fit ZIPs are parsed file-by-file in memory — no data is ever sent to a server. There are no accounts, no databases, and no analytics on your health information.</p>
          <p style={{marginTop:10}}>Health entries are <b style={{color:"#e0eeff"}}>session-only</b>: they live in memory while the tab is open and are permanently gone the moment you close it.</p>
          <div className="lp-ptags">
            {["Zero upload","No accounts","No server storage","Session-only health data","No health analytics"].map(t=><span key={t} className="lp-ptag">{t}</span>)}
          </div>
        </div>
      </div>
    </div>

    {/* Research */}
    <div className="lp-sec" style={{background:"rgba(7,11,18,.75)",padding:"88px 24px",maxWidth:"100%"}}>
      <div style={{maxWidth:1080,margin:"0 auto"}}>
        <div className="lp-lbl">Scientific Foundation</div>
        <h2>Built on peer-reviewed<br/>research</h2>
        <p style={{fontSize:14,color:"#7a9aaa",lineHeight:1.8,maxWidth:660,marginBottom:44}}>Every reference range, optimal target, and ethnicity adjustment is sourced directly from published clinical guidelines and medical research. Plain-English summaries — no medical background needed.</p>
        <div className="lp-rgrid">
          {[
            {tag:"tvo2",lbl:"VO₂ Max",yr:"2018 · JAMA",title:"VO₂ Max as a Predictor of All-Cause Mortality",auth:"Mandsager et al.",plain:"A study of 122,000 patients found that cardiorespiratory fitness predicts longevity more powerfully than blood pressure, diabetes, or smoking status. The least-fit group had 5× higher mortality risk than the most fit.",find:"Why VO₂ Max is the highest-weighted metric in the bio age score.",href:"https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428",domain:"jamanetwork.com"},
            {tag:"tvo2",lbl:"VO₂ Max",yr:"2022/2024 · ACSM",title:"ACSM Guidelines for Exercise Testing and Prescription (11th Ed.)",auth:"American College of Sports Medicine",plain:"The gold-standard reference for fitness classification, providing sex-specific VO₂ max ranges — Poor to Excellent — for all adult age groups.",find:"Source of all VO₂ Max reference ranges and optimal targets.",href:"https://acsm.org/education-resources/books/guidelines-exercise-testing-prescription/",domain:"acsm.org"},
            {tag:"thr",lbl:"Resting HR",yr:"2016 · CMAJ",title:"Resting Heart Rate and Long-Term Survival",auth:"Zhang et al.",plain:"Analysis of 3+ million people: RHR above 80 bpm is independently associated with higher cardiovascular mortality. Each 10 bpm increase correlates with ~18% higher cardiovascular death risk.",find:"Evidence basis for RHR as a longevity metric and risk-tier boundaries.",href:"https://www.cmaj.ca/content/188/3/E53",domain:"cmaj.ca"},
            {tag:"tbp",lbl:"Blood Pressure",yr:"2017 · AHA/ACC",title:"ACC/AHA High Blood Pressure Clinical Practice Guideline",auth:"Whelton et al.",plain:"The landmark 2017 guideline that lowered the hypertension threshold from 140/90 to 130/80 mmHg, based on the SPRINT trial. Reclassified nearly half of American adults as hypertensive.",find:"Source of all BP reference ranges (Normal/Elevated/Stage 1/Stage 2).",href:"https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065",domain:"ahajournals.org"},
            {tag:"tbp",lbl:"Blood Pressure",yr:"2015 · NEJM",title:"SPRINT Trial: Systolic Blood Pressure Intervention",auth:"SPRINT Research Group",plain:"RCT of 9,000+ adults: targeting systolic BP below 120 mmHg reduced cardiovascular events by 25% and all-cause mortality by 27%. The trial was halted early due to how compelling the results were.",find:"Evidence for the stricter 120 mmHg optimal BP ceiling used in the dashboard.",href:"https://www.nejm.org/doi/full/10.1056/NEJMoa1511939",domain:"nejm.org"},
            {tag:"tgl",lbl:"Glucose",yr:"2023 · ADA",title:"Standards of Medical Care in Diabetes",auth:"American Diabetes Association",plain:"Annual clinical guidelines defining fasting glucose categories: Normal (<100), Pre-diabetic (100–125), Diabetic (≥126 mg/dL). Includes population-specific risk guidance for Hispanic/Latino and Black adults.",find:"Source of glucose reference ranges and ethnicity-specific risk adjustments.",href:"https://diabetesjournals.org/care/issue/46/Supplement_1",domain:"diabetesjournals.org"},
            {tag:"tgl",lbl:"Glucose",yr:"2022 · Longevity",title:"Outlive: The Science and Art of Longevity",auth:"Peter Attia, MD",plain:"A longevity physician's synthesis arguing that even 'normal' fasting glucose (85–99 mg/dL) carries meaningful long-term risk. Advocates a tighter optimal range of 72–85 mg/dL based on CGM and insulin-sensitivity data.",find:"Basis for the tighter Optimal glucose range (60–85 mg/dL) alongside ADA tiers.",href:"https://peterattiamd.com/category/metabolic-health/glucose-and-insulin/",domain:"peterattiamd.com"},
            {tag:"tbf",lbl:"Body Fat",yr:"2022 · ACE",title:"Body Fat Percentage Norms for Adults",auth:"American Council on Exercise",plain:"Widely used reference ranges stratified by sex — Essential, Athletic, Fit, Average, Obese. Correctly accounts for women naturally carrying more essential fat than men for hormonal and reproductive reasons.",find:"Source of all body fat % reference ranges, with separate female and male targets.",href:"https://www.acefitness.org/education-and-resources/lifestyle/blog/112/what-are-the-guidelines-for-percentage-of-body-fat-loss/",domain:"acefitness.org"},
            {tag:"tbf",lbl:"Body Fat · Ethnicity",yr:"2004 · Lancet",title:"Appropriate BMI for Asian Populations — WHO Expert Consultation",auth:"WHO Expert Consultation",plain:"A WHO review of 10 Asian countries found East and South Asian populations develop type 2 diabetes and cardiovascular disease at significantly lower body fat levels than Western populations.",find:"Basis for lower body fat optimal thresholds for East/South Asian ethnicity selections.",href:"https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(03)15268-3/fulltext",domain:"thelancet.com"},
            {tag:"tbp",lbl:"BP · Ethnicity",yr:"2020 · Hypertension",title:"Hypertension in Black Adults: Disparities and Clinical Considerations",auth:"Ferdinand & Nasser",plain:"Clinical review documenting that Black and African American adults develop hypertension earlier, at higher rates, and with more severe organ damage. Earlier, more aggressive BP intervention is recommended.",find:"Basis for the lower BP optimal threshold for Black/African American ethnicity.",href:"https://pmc.ncbi.nlm.nih.gov/articles/PMC7301145/",domain:"pmc.ncbi.nlm.nih.gov"},
            {tag:"tba",lbl:"Bio Age Formula",yr:"2006 · Mech Ageing Dev",title:"A New Approach to the Concept and Computation of Biological Age",auth:"Klemera & Doubal",plain:"The foundational paper introducing KDM — Klemera-Doubal Method. Instead of simple averages, KDM treats each biomarker as a regression on chronological age, weights it by how precisely it tracks age in the population, and combines implied ages into a single estimate that can be younger OR older than chronological age.",find:"The mathematical basis of the bio age formula used in this dashboard. Consistently outperforms simple averaging, PCA, and multiple linear regression in mortality prediction.",href:"https://pubmed.ncbi.nlm.nih.gov/16318865/",domain:"pubmed.ncbi.nlm.nih.gov"},
            {tag:"tba",lbl:"Metabolic · Ethnicity",yr:"2020 · Lancet D&E",title:"Ethnic Differences in Metabolic Risk at Lower BMI",auth:"The Lancet Diabetes & Endocrinology",plain:"Large review confirming East and South Asian individuals develop insulin resistance and cardiovascular disease at body fat levels well below thresholds derived from European populations.",find:"Supports lower glucose and body fat optimal thresholds for East/South Asian selections.",href:"https://www.thelancet.com/journals/landia/article/PIIS2213-8587(20)30203-4/fulltext",domain:"thelancet.com"},
          ].map(p=><div key={p.title} className="lp-paper">
            <div className="lp-pmeta"><span className={`lp-pt lp-${p.tag}`}>{p.lbl}</span><span className="lp-pyr">{p.yr}</span></div>
            <h4>{p.title}</h4>
            <div className="lp-pauth">{p.auth}</div>
            <p className="lp-pp">{p.plain}</p>
            <div className="lp-pf">→ {p.find}</div>
            <a href={p.href} target="_blank" rel="noopener">{p.domain}</a>
          </div>)}
        </div>
      </div>
    </div>

    {/* CTA */}
    <div className="lp-cta">
      <h2>Start tracking your<br/><span style={{color:"#00ffa3"}}>real age today.</span></h2>
      <p>Free, private, science-backed. No sign-up. No upload. Your health data never leaves your device.</p>
      <button style={{...cta,fontSize:13,padding:"17px 50px",boxShadow:"0 0 60px rgba(0,255,163,.32)"}} onClick={onEnterApp}>Open Dashboard →</button>
      <p style={{marginTop:18,fontFamily:"'DM Mono',monospace",fontSize:10,color:"#4a6070",letterSpacing:"0.1em"}}>Works on desktop &amp; mobile · Import Apple Health or Google Fit · Or log manually</p>
    </div>

    <div className="lp-disc">Not medical advice. BioAge is an informational tool based on published clinical guidelines. Reference ranges are population-level norms and may not apply to every individual. Always consult a qualified healthcare provider before making changes to your health regime.</div>
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function BioAgeTracker(){
  // Entries are session-only — start empty every time, never stored between sessions
  const [entries,setEntries]=useState([]);
  const [view,setView]=useState("about");
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
    // Only restore display preferences — health entries are never persisted
    const a=await window.storage?.get("ba6_age");if(a?.value)setAge(+a.value);
    const s=await window.storage?.get("ba6_sex");if(s?.value)setSex(s.value);
    const e=await window.storage?.get("ba6_eth");if(e?.value)setEth(e.value);
  }catch{}})();},[]);

  // persist() only updates React state — no storage write. Entries are session-only.
  const persist=useCallback(e=>{setEntries(e);},[]);

  const handleImport=({entries:ne,dSex,dDOB})=>{
    const manual=entries.filter(e=>e.note!=="Apple Health"&&e.note!=="Google Fit");
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

  const bioAge=getBioAge(entries,age,sex);
  const delta=bioAge?+(age-bioAge).toFixed(1):null;
  const scores=MK.map(id=>{const l=getLatest(id);return l?getScore(id,l.value,sex,eth):null;}).filter(Boolean);
  const overall=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const importCount=entries.filter(e=>e.note==="Apple Health"||e.note==="Google Fit").length;
  const importSource=entries.some(e=>e.note==="Google Fit")?"Google Fit":entries.some(e=>e.note==="Apple Health")?"Apple Health":null;
  const ethDef=ETHNICITIES.find(e=>e.id===eth);

  // Monthly bio age trajectory — one point per month for last 12 months
  const bioTrend=(()=>{
    const pts=[];const now=new Date();
    for(let i=11;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const eom=new Date(d.getFullYear(),d.getMonth()+1,0); // last day of month
      const eStr=eom.toISOString().substring(0,10);
      const label=d.toLocaleDateString("en-US",{month:"short",year:"2-digit"});
      const ba=getBioAge(entries.filter(e=>e.date<=eStr),age,sex);
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
    const cd=hist.map(e=>({date:e.date,[m.label]:e.value,...(e.secondary?{Diastolic:e.secondary}:{})}));
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
              <XAxis dataKey="date" tick={{fill:T.dim,fontSize:9,fontFamily:T.fn}} tickFormatter={d=>{const p=d.split("-");return p.length>=2?new Date(+p[0],+p[1]-1,1).toLocaleDateString("en-US",{month:"short",year:"2-digit"}):"";}}/>
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
            <span style={{color:"#223344",flex:1}}>{e.note==="Apple Health"?<span style={{fontSize:9,color:"#007744",background:"rgba(0,100,60,0.15)",border:"1px solid rgba(0,150,80,0.2)",borderRadius:4,padding:"2px 7px"}}>⌘ Apple Health</span>:e.note==="Google Fit"?<span style={{fontSize:9,color:"#337755",background:"rgba(0,100,60,0.12)",border:"1px solid rgba(0,180,100,0.18)",borderRadius:4,padding:"2px 7px"}}>📊 Google Fit</span>:(e.note||"—")}</span>
            <span style={{color:c2,fontSize:10}}>{gL(s2)}</span>
          </div>;})}
          {!hist.length&&<div style={{fontSize:12,color:"#1e2a3a"}}>No entries yet.</div>}
        </div>
      </div>
    </div>;
  }

  // ── About / Landing Page tab ─────────────────────────────────────────────
  if(view==="about")return <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.fn,color:T.txt}}>
    <style>{FONTS}</style>
    {showImport&&<ImportPanel onImport={handleImport} onClose={()=>setShowImport(false)}/>}
    {showEth&&<EthModal eth={eth} setEth={e=>{setEth(e);window.storage?.set("ba6_eth",e);}} onClose={()=>setShowEth(false)}/>}
    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 22px",borderBottom:`1px solid ${T.bdr}`,background:"rgba(6,10,16,0.97)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:7}}>
      <button style={{fontFamily:T.dp,fontSize:17,fontWeight:800,color:T.br,background:"none",border:"none",cursor:"pointer",padding:0}} onClick={()=>setView("dashboard")}><span style={{color:T.gr}}>BIO</span>AGE</button>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        <button style={NB(false)} onClick={()=>setShowImport(true)}>⬆ Import</button>
        <button style={NB(true)}>ℹ About</button>
        <button style={{...NB(false),color:T.gr,border:"1px solid rgba(0,255,163,0.25)"}} onClick={()=>setView("dashboard")}>← Dashboard</button>
      </div>
    </nav>
    <LandingPage onEnterApp={()=>setView("dashboard")}/>
  </div>;

  // ── Dashboard ─────────────────────────────────────────────────────────
  return <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.fn,color:T.txt}}>
    <style>{FONTS}</style>
    {showImport&&<ImportPanel onImport={handleImport} onClose={()=>setShowImport(false)}/>}
    {showSnap&&<SnapshotModal entries={entries} sex={sex} eth={eth} bioAge={bioAge} chronoAge={age} onClose={()=>setShowSnap(false)}/>}
    {showEth&&<EthModal eth={eth} setEth={e=>{setEth(e);window.storage?.set("ba6_eth",e);}} onClose={()=>setShowEth(false)}/>}

    <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 22px",borderBottom:`1px solid ${T.bdr}`,background:"rgba(6,10,16,0.97)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:7}}>
      <button style={{fontFamily:T.dp,fontSize:17,fontWeight:800,color:T.br,background:"none",border:"none",cursor:"pointer",padding:0}} onClick={()=>setView("dashboard")}><span style={{color:T.gr}}>BIO</span>AGE</button>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",background:"#0a0e16",border:"1px solid #1e2a3a",borderRadius:7,overflow:"hidden"}}>
          {["female","male"].map(s=><button key={s} onClick={()=>{setSex(s);window.storage?.set("ba6_sex",s);}} style={{padding:"5px 10px",border:"none",cursor:"pointer",fontFamily:T.fn,fontSize:10,background:sex===s?"#0e2218":"transparent",color:sex===s?T.gr:"#334455",transition:"all 0.2s"}}>{s==="female"?"♀ Female":"♂ Male"}</button>)}
        </div>
        <button style={NB(eth!=="general")} onClick={()=>setShowEth(true)}>🌐 {eth==="general"?"Ethnicity":ethDef?.label}</button>
        {importCount>0&&<div style={{fontSize:10,color:T.gr,background:"rgba(0,255,163,0.08)",border:"1px solid rgba(0,255,163,0.18)",borderRadius:20,padding:"3px 9px"}}>{importSource==="Google Fit"?"📊":"⌘"} {importCount}</div>}
        <button style={NB(false)} onClick={()=>setShowSnap(true)}>📸 Snapshot</button>
        <button style={NB(false)} onClick={()=>setShowImport(true)}>⬆ Import</button>
        <button style={NB(view==="about")} onClick={()=>setView(v=>v==="about"?"dashboard":"about")}>ℹ About</button>
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
    {importCount===0&&<div style={{margin:"16px 26px 0",background:"rgba(0,255,163,0.03)",border:"1px solid rgba(0,255,163,0.1)",borderRadius:11,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div><div style={{fontFamily:T.dp,fontSize:13,fontWeight:700,color:T.br}}>📱 Import your health data</div>
        <div style={{fontSize:11,color:T.dim,marginTop:2}}>Apple Health (iOS) or Google Fit (Android) — VO₂ Max, RHR, BP, Glucose & Body Fat. Format auto-detected.</div></div>
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
        const gfN=hist.filter(e=>e.note==="Google Fit").length;
        const srcN=ahN+gfN;const srcLabel=gfN>0?"📊":"⌘";
        return <div key={id} style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:13,padding:"18px 20px",cursor:"pointer",transition:"border 0.2s,box-shadow 0.2s",position:"relative",overflow:"hidden"}}
          onClick={()=>{setActiveMid(id);setView("metric");}}
          onMouseEnter={e=>{e.currentTarget.style.border=`1px solid ${col}44`;e.currentTarget.style.boxShadow=`0 0 24px ${col}08`;}}
          onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${T.bdr}`;e.currentTarget.style.boxShadow="none";}}>
          <div style={{position:"absolute",top:-44,right:-44,width:110,height:110,borderRadius:"50%",background:col,opacity:0.05,filter:"blur(24px)",pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:9,letterSpacing:"0.17em",textTransform:"uppercase",color:T.dim,marginBottom:3}}>
                {m.label}{srcN>0&&<span style={{fontSize:8,color:"#007744",background:"rgba(0,100,60,0.15)",border:"1px solid rgba(0,150,80,0.2)",borderRadius:4,padding:"1px 5px",marginLeft:7}}>{srcLabel} {srcN}</span>}
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
          </div>:<div style={{fontSize:10,color:"#1e2a3a",marginBottom:8}}>No data — log or import Apple Health / Google Fit</div>}
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
    <Analytics />
  </div>;
}

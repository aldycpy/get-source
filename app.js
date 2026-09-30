/* Source Code & Deploy HTML tools — by AlzDevz */
const $=id=>document.getElementById(id);
const W="https://bitter-truth-75b7.maulanafaryd12.workers.dev"; // proxy
const enc=encodeURIComponent;
const ls={g(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v===null||v===undefined?d:v}catch(e){return d}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let files=[],cur=0,base="",host="";

/* ---------- bintang (satu elemen, banyak box-shadow) ---------- */
(function(){
  const n=innerWidth<640?28:60,a=[];
  for(let i=0;i<n;i++)a.push((Math.random()*innerWidth|0)+"px "+(Math.random()*innerHeight|0)+"px 0 "+(Math.random()>.8?1:0)+"px rgba(255,255,255,"+(.4+Math.random()*.6).toFixed(2)+")");
  $("stars").style.boxShadow=a.join(",");
})();

/* ---------- animasi berhenti saat tab tidak aktif ---------- */
document.addEventListener("visibilitychange",()=>document.body.classList.toggle("hidden",document.hidden));

/* ---------- Mode Ringan (default OFF = background bergerak) ---------- */
(function(){
  let v=!!ls.g("sct_lite",false);
  const ap=()=>{document.body.classList.toggle("lite",v);$("lite").textContent=v?"Mode Ringan: ON":"Mode Ringan: OFF"};
  $("lite").onclick=()=>{v=!v;ls.s("sct_lite",v);ap()};ap();
})();

/* ---------- tabs ---------- */
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x===b));
  $("tabs").dataset.i=b.dataset.i;
  ["t1","t2"].forEach(i=>$(i).classList.toggle("hide",i!==b.dataset.t));
});

/* ---------- fetch lewat proxy: worker sendiri + semua proxy publik DIADU sekaligus ---------- */
let LOG=[];
function tryFetch(name,mk,u){
  return new Promise(async(ok,no)=>{
    const c=new AbortController(),t=setTimeout(()=>{c.abort();LOG.push(name+": timeout");no()},15000);
    try{
      const v=mk(u);let x;
      if(typeof v==="string"){
        const r=await fetch(v,{signal:c.signal});
        if(!r.ok){clearTimeout(t);LOG.push(name+": "+r.status);return no()}
        x=await r.text();
      }else x=await v;
      clearTimeout(t);
      if(x&&x.trim().length>10)ok(x);else{LOG.push(name+": kosong");no()}
    }catch(e){clearTimeout(t);LOG.push(name+": gagal");no()}
  });
}
const PX=[
  ["worker",u=>W+"/?url="+enc(u)],
  ["worker-path",u=>W+"/"+u],
  ["worker-u",u=>W+"/?u="+enc(u)],
  ["allorigins",u=>"https://api.allorigins.win/raw?url="+enc(u)],
  ["allorigins-json",async u=>{const r=await fetch("https://api.allorigins.win/get?url="+enc(u));const j=await r.json();if(!j.contents)throw 0;return j.contents}],
  ["codetabs",u=>"https://api.codetabs.com/v1/proxy/?quest="+enc(u)],
  ["corsproxy",u=>"https://corsproxy.io/?url="+enc(u)],
  ["thingproxy",u=>"https://thingproxy.freeboard.io/fetch/"+u],
  ["cors.lol",u=>"https://api.cors.lol/?url="+enc(u)],
  ["yacdn",u=>"https://yacdn.org/proxy/"+u],
  ["cors.eu.org",u=>"https://cors.eu.org/"+u],
  ["jina",async u=>{const r=await fetch("https://r.jina.ai/"+u,{headers:{"X-Return-Format":"html"}});if(!r.ok)throw 0;return await r.text()}],
  ["direct",u=>u]
];
async function get(u){
  try{return await Promise.any(PX.map(([n,m])=>tryFetch(n,m,u)))}
  catch(e){throw new Error("Gagal mengambil "+u+" ["+LOG.slice(0,6).join(" | ")+"]")}
}

/* ---------- Source Web ---------- */
const say=(t,c)=>{const m=$("msg");m.textContent=t;m.className="msg "+(c||"")};
const prog=n=>$("fill").style.width=n+"%";
const abs=(h,b)=>{try{return new URL(h,b).href}catch(e){return null}};
const kb=n=>n>1024?(n/1024).toFixed(1)+" KB":n+" B";
const LIMIT=120000;

async function run(){
  let u=$("url").value.trim();if(!u)return;
  if(!/^https?:\/\//i.test(u))u="https://"+u;
  let U;try{U=new URL(u)}catch(e){return say("Invalid URL, cek lagi link-nya.","err")}
  $("go").disabled=true;$("bar").classList.remove("hide");prog(8);say("Fetching HTML…");
  $("res").classList.add("hide");
  try{
    LOG=[];const html=await get(U.href);prog(35);
    base=U.href;host=U.hostname;
    const doc=new DOMParser().parseFromString(html,"text/html");
    files=[{name:"index.html",code:html}];
    let i=0;
    doc.querySelectorAll("style").forEach(s=>{if(s.textContent.trim())files.push({name:"inline-"+(++i)+".css",code:s.textContent})});
    i=0;
    doc.querySelectorAll("script:not([src])").forEach(s=>{if(s.textContent.trim())files.push({name:"inline-"+(++i)+".js",code:s.textContent})});
    const ext=[
      ...[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map(e=>abs(e.getAttribute("href"),base)),
      ...[...doc.querySelectorAll("script[src]")].map(e=>abs(e.getAttribute("src"),base))
    ].filter(Boolean).slice(0,20);
    let n=0;
    await Promise.all(ext.map(async x=>{
      try{
        const code=await get(x);
        let nm=x.split("?")[0].split("/").pop()||"file";
        if(files.some(f=>f.name===nm))nm=files.length+"-"+nm;
        files.push({name:nm,code});
      }catch(e){}
      prog(35+Math.round(++n/ext.length*60));
    }));
    prog(100);cur=0;render();addHist(U.href);
    say("Done • "+files.length+" file","ok");
  }catch(e){say(e.message+". Try again atau cek link-nya.","err")}
  $("go").disabled=false;setTimeout(()=>$("bar").classList.add("hide"),700);
}
function render(){
  $("res").classList.remove("hide");
  $("fc").textContent="Files ("+files.length+")";
  const fr=document.createDocumentFragment();
  files.forEach((f,i)=>{
    const d=document.createElement("div");d.className="f"+(i===cur?" on":"");
    d.append(f.name+" ");const s=document.createElement("small");s.textContent=kb(f.code.length);d.append(s);
    d.onclick=()=>{cur=i;render()};fr.append(d);
  });
  $("files").replaceChildren(fr);
  const c=files[cur].code;
  $("code").textContent=c.length>LIMIT?c.slice(0,LIMIT)+"\n\n… (tampilan dipotong agar ringan, pakai Copy/Save/ZIP untuk kode lengkap)":c;
}
function addHist(u){const h=[{u,t:Date.now()},...ls.g("sct_h",[]).filter(x=>x.u!==u)].slice(0,10);ls.s("sct_h",h);showHist()}
function showHist(){
  const h=ls.g("sct_h",[]);const fr=document.createDocumentFragment();
  if(!h.length){const d=document.createElement("div");d.className="sub";d.textContent="Belum ada history.";fr.append(d)}
  h.forEach(x=>{const d=document.createElement("div");d.className="h";const s=document.createElement("span");s.textContent=x.u;d.append(s);d.onclick=()=>{$("url").value=x.u;run()};fr.append(d)});
  $("hist").replaceChildren(fr);
}
function dl(n,b){const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
function preview(html,b){
  $("fr").srcdoc=b?html.replace(/<head([^>]*)>/i,'<head$1><base href="'+b+'">'):html;
  $("pv").classList.add("on");
}
$("go").onclick=run;
$("url").onkeydown=e=>{if(e.key==="Enter")run()};
$("copy").onclick=async()=>{
  try{await navigator.clipboard.writeText(files[cur].code)}catch(e){const r=document.createRange();r.selectNodeContents($("code"));getSelection().removeAllRanges();getSelection().addRange(r);document.execCommand("copy")}
  $("copy").textContent="Tersalin ✓";setTimeout(()=>$("copy").textContent="Copy",1200);
};
$("save").onclick=()=>dl(files[cur].name,new Blob([files[cur].code],{type:"text/plain"}));
$("zip").onclick=async()=>{
  if(!window.JSZip)return say("Library ZIP gagal dimuat, cek koneksi.","err");
  const z=new JSZip();files.forEach(f=>z.file(f.name,f.code));
  const n=($("zn").value.trim()||host||"source").replace(/[^\w.\-]+/g,"_");
  dl(n+".zip",await z.generateAsync({type:"blob"}));
};
$("prev").onclick=()=>preview(files[0].code,base);
$("pvx").onclick=()=>{$("pv").classList.remove("on");$("fr").srcdoc=""};
$("clr").onclick=()=>{ls.s("sct_h",[]);showHist()};

/* ---------- Deploy ke Vercel (HTML / ZIP) ---------- */
const dsay=(t,c)=>{const m=$("dmsg");m.textContent=t;m.className="msg "+(c||"")};
const dprog=n=>$("dfill").style.width=n+"%";
const MAXZ=3*1024*1024;
let dfile=null;
const cleanName=v=>v.toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-+/,"").slice(0,52);
const finalName=v=>cleanName(v).replace(/-+$/,"");
function nameErr(n){
  if(!n||n.length<3)return"Project name minimal 3 karakter.";
  if(n.length>52)return"Project name maksimal 52 karakter.";
  if(!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(n))return"Pakai huruf kecil, angka, atau hyphen (-) aja.";
  return"";
}
$("proj").oninput=e=>{
  e.target.value=cleanName(e.target.value);
  const n=finalName(e.target.value),i=$("pinfo");
  if(!n){i.className="sub";i.innerHTML="Link: <b>project-name.vercel.app</b>";return}
  const er=nameErr(n);
  if(er){i.className="sub bad";i.textContent=er}else{i.className="sub good";i.textContent="Link: "+n+".vercel.app"}
};
function pickFile(f){
  if(!f)return;
  const n=f.name.toLowerCase();
  if(!/\.(html?|zip)$/.test(n))return dsay("Only .html atau .zip yang didukung.","err");
  if(n.endsWith(".zip")&&f.size>MAXZ)return dsay("ZIP too big ("+(f.size/1048576).toFixed(1)+" MB), max 3 MB.","err");
  dfile=f;$("drop").classList.add("has");
  $("dtitle").textContent=f.name;
  $("dsub").textContent=(f.size>1048576?(f.size/1048576).toFixed(2)+" MB":(f.size/1024).toFixed(1)+" KB")+" · "+(n.endsWith(".zip")?"ZIP":"HTML");
  dsay("");
  if(!n.endsWith(".zip")){const r=new FileReader();r.onload=()=>$("html").value=r.result;r.readAsText(f)}
  else $("html").value="";
}
const dz=$("drop");
dz.onclick=()=>$("file").click();
dz.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("file").click()}};
dz.ondragover=e=>{e.preventDefault();dz.classList.add("over")};
dz.ondragleave=()=>dz.classList.remove("over");
dz.ondrop=e=>{e.preventDefault();dz.classList.remove("over");pickFile(e.dataTransfer.files[0])};
$("file").onchange=e=>pickFile(e.target.files[0]);
$("dprev").onclick=()=>{
  if(dfile&&/\.zip$/i.test(dfile.name))return dsay("ZIP nggak bisa di-preview, langsung deploy aja.","err");
  if($("html").value.trim())preview($("html").value,"");
};

const b64=u8=>{let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
async function collectFiles(){
  if(dfile&&/\.zip$/i.test(dfile.name)){
    if(typeof JSZip==="undefined")throw new Error("Library ZIP gagal load, refresh halaman dulu.");
    const z=await JSZip.loadAsync(dfile);
    let ents=Object.values(z.files).filter(f=>!f.dir&&!/(^|\/)(__MACOSX|\.DS_Store)/.test(f.name));
    if(!ents.length)throw new Error("ZIP kosong.");
    if(!ents.some(f=>f.name==="index.html")){
      const first=ents[0].name.split("/")[0]+"/";
      if(ents.every(f=>f.name.startsWith(first)))ents=ents.map(f=>{f._n=f.name.slice(first.length);return f});
    }
    const out=[];let total=0;
    for(const f of ents){
      const u8=await f.async("uint8array");total+=u8.length;
      if(total>MAXZ)throw new Error("Isi ZIP too big setelah di-extract, max 3 MB.");
      out.push({file:f._n||f.name,data:b64(u8),encoding:"base64"});
    }
    if(!out.some(f=>f.file==="index.html")&&!out.some(f=>/\.html?$/i.test(f.file)))throw new Error("index.html nggak ketemu di dalam ZIP.");
    return out;
  }
  const txt=$("html").value.trim();
  if(!txt)throw new Error("Pilih file atau paste kode HTML dulu.");
  if(txt.length>MAXZ)throw new Error("HTML too big, max 3 MB.");
  return[{file:"index.html",data:txt,encoding:"utf-8"}];
}

/* panggil server deploy: domain sendiri dulu, lalu Worker */
async function dapi(method,qs,body){
  const eps=[];
  if(location.protocol.startsWith("http"))eps.push([location.origin+"/api/deploy","website ini"]);
  eps.push([W+"/deploy","Worker"]);
  const why=[];
  for(const [ep,who] of eps){
    try{
      const r=await fetch(ep+(qs||""),method==="POST"?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{});
      const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}
      if(j)return j;
      if(who==="Worker")why.push(/URL tidak valid/i.test(t)?"Worker masih kode lama (paste worker.js terbaru lalu Deploy)":"Worker balas HTTP "+r.status+" bukan JSON");
      else why.push(r.status===404||r.status===405?"/api/deploy nggak ada di website ini (hosting bukan Vercel?)":"/api/deploy balas HTTP "+r.status+" bukan JSON");
    }catch(e){
      why.push(who==="Worker"?"Worker nggak bisa dijangkau (workers.dev keblok / URL salah?)":"/api/deploy gagal connect");
    }
  }
  return{net:true,why};
}
const neterr=r=>"Server deploy nggak bisa dipakai. "+((r&&r.why)||[]).join(" • ");

function dstep(i,bad){
  $("dsteps").classList.remove("hide");
  ["s1","s2","s3","s4"].forEach((id,k)=>{const e=$(id);e.className=k<i?"ok":k===i?(bad?"bad":"on"):""});
}
function dreset(){
  dfile=null;$("file").value="";$("html").value="";$("proj").value="";$("proj").oninput({target:$("proj")});
  $("drop").classList.remove("has");$("dtitle").textContent="Upload HTML atau ZIP";$("dsub").textContent="Click atau drag file ke sini, ZIP max 3 MB";
  $("dres").classList.add("hide");$("dsteps").classList.add("hide");$("dbar").classList.add("hide");dsay("");
}

$("dep").onclick=async()=>{
  if($("dep").disabled)return;
  const n=finalName($("proj").value),er=nameErr(n);
  if(er)return dsay(er,"err");
  $("proj").value=n;
  $("dep").disabled=true;$("dres").classList.add("hide");$("dbar").classList.remove("hide");
  let step=0;
  try{
    dstep(0);dprog(10);dsay("Reading file…");
    const files=await collectFiles();
    step=1;dstep(1);dprog(30);dsay("Checking project name…");
    const c=await dapi("GET","?check="+enc(n));
    if(c.net)throw new Error(neterr(c));
    if(c.error)throw new Error(c.error);
    if(!c.available)throw new Error(c.reason||"Project name udah dipakai, coba nama lain.");
    step=2;dstep(2);dprog(55);dsay("Deploying ke Vercel, bisa sampai 15 detik…");
    const j=await dapi("POST","",{project:n,files});
    if(j.net)throw new Error(neterr(j));
    if(!j.url)throw new Error(j.error||"Deploy gagal, server nggak merespons.");
    dstep(4);dprog(100);dsay("Success, link-nya udah live.","ok");
    $("dlink").href=j.url;$("dlink").textContent=j.url;$("dres").classList.remove("hide");
    ls.s("sct_d",[{u:j.url,t:Date.now()},...ls.g("sct_d",[])].slice(0,10));showDH();
  }catch(e){dstep(step,true);dsay(e.message||"Gagal deploy","err")}
  $("dep").disabled=false;setTimeout(()=>$("dbar").classList.add("hide"),800);
};
$("dopen").onclick=()=>{const u=$("dlink").href;if(u)window.open(u,"_blank","noopener")};
$("dcopy").onclick=async()=>{try{await navigator.clipboard.writeText($("dlink").href);$("dcopy").textContent="Tersalin ✓";setTimeout(()=>$("dcopy").textContent="Copy link",1200)}catch(e){}};
$("dnew").onclick=dreset;
function showDH(){
  const h=ls.g("sct_d",[]);const fr=document.createDocumentFragment();
  if(!h.length){const d=document.createElement("div");d.className="sub";d.textContent="Belum ada deploy.";fr.append(d)}
  h.forEach(x=>{const d=document.createElement("div");d.className="h";const s=document.createElement("span");s.textContent=x.u;const t=document.createElement("small");t.textContent=new Date(x.t).toLocaleDateString("id-ID");d.append(s,t);d.onclick=()=>window.open(x.u,"_blank","noopener");fr.append(d)});
  $("dhist").replaceChildren(fr);
}
$("dclr").onclick=()=>{ls.s("sct_d",[]);showDH()};
showHist();showDH();

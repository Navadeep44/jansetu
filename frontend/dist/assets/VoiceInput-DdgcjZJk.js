import{a as e,n as t,t as n}from"./jsx-runtime-D3jfb0Ew.js";import{t as r}from"./mic-CxJiqrim.js";import{A as i,K as a,S as o,V as s}from"./index-nIBHxkD_.js";var c=e(t(),1),l=n();function u({lang:e,onTranscript:t,onAudio:n,labels:s={}}){let u=i(),d={speak:s.speak||u(`Tap to speak`),stop:s.stop||u(`Tap to stop`),listening:s.listening||u(`Listening… speak now`),unsupported:s.unsupported||u(`Voice typing does not work here. Your voice is still recorded and sent.`)},[f,p]=(0,c.useState)(!1),[m,h]=(0,c.useState)(``),g=(0,c.useRef)(null),_=(0,c.useRef)(null),v=(0,c.useRef)([]),y=typeof window<`u`&&(window.SpeechRecognition||window.webkitSpeechRecognition),b=typeof window<`u`&&!!navigator.mediaDevices?.getUserMedia;return(0,c.useEffect)(()=>()=>{g.current?.abort?.(),_.current?.stream?.getTracks().forEach(e=>e.stop())},[]),(0,l.jsxs)(`div`,{className:`stack`,style:{alignItems:`center`,textAlign:`center`},children:[(0,l.jsx)(`button`,{type:`button`,className:`mic-btn ${f?`recording`:``}`,onClick:f?()=>{g.current?.stop(),_.current?.state===`recording`&&_.current.stop(),p(!1)}:async()=>{if(h(``),b)try{let e=await navigator.mediaDevices.getUserMedia({audio:!0}),t=new MediaRecorder(e);v.current=[],t.ondataavailable=e=>e.data.size&&v.current.push(e.data),t.onstop=()=>{e.getTracks().forEach(e=>e.stop()),n?.(new Blob(v.current,{type:t.mimeType||`audio/webm`}))},t.start(),_.current=t}catch{}if(y){let n=new y;n.lang=o[e]||`en-IN`,n.interimResults=!0,n.continuous=!0;let r=``;n.onresult=e=>{let n=``;for(let t=e.resultIndex;t<e.results.length;t++)e.results[t].isFinal?r+=e.results[t][0].transcript+` `:n+=e.results[t][0].transcript;h(n),r&&=(t(r.trim()),``)},n.onend=()=>p(!1),n.onerror=()=>p(!1),n.start(),g.current=n}p(!0)},"aria-pressed":f,"aria-label":f?d.stop:d.speak,children:f?(0,l.jsx)(a,{size:32,"aria-hidden":`true`}):(0,l.jsx)(r,{size:36,"aria-hidden":`true`})}),(0,l.jsx)(`div`,{className:`small`,style:{fontWeight:600},"aria-live":`polite`,children:f?d.listening:d.speak}),m&&(0,l.jsx)(`div`,{className:`small muted`,children:m}),!y&&(0,l.jsx)(`div`,{className:`help`,children:d.unsupported})]})}function d({text:e,lang:t,label:n,className:r=`btn btn-sm`}){let u=i(),[d,f]=(0,c.useState)(!1);return(0,c.useEffect)(()=>()=>{try{window.speechSynthesis?.cancel()}catch{}},[]),!(typeof window<`u`&&`speechSynthesis`in window)||!e?null:(0,l.jsxs)(`button`,{type:`button`,className:r,onClick:()=>{let n=window.speechSynthesis;if(d){n.cancel(),f(!1);return}n.cancel();let r=new SpeechSynthesisUtterance(e);r.lang=o[t]||`en-IN`;let i=n.getVoices().find(e=>e.lang?.toLowerCase().startsWith(r.lang.slice(0,2).toLowerCase()));i&&(r.voice=i),r.rate=.92,r.onend=()=>f(!1),n.speak(r),f(!0)},"aria-pressed":d,children:[d?(0,l.jsx)(a,{size:16,"aria-hidden":`true`}):(0,l.jsx)(s,{size:16,"aria-hidden":`true`}),d?u(`Stop`):n||u(`Listen`)]})}var f=`
.cz-steph { display:flex; align-items:center; gap:12px; margin:0 0 14px; font-size:1.2rem; font-weight:700; }
.cz-num { width:36px; height:36px; flex:none; border-radius:50%; display:grid; place-items:center; background:var(--lp-navy,#0b1a33); color:#fff; font-size:1.05rem; font-weight:800; }
.cz-picker { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:10px; }
@media (max-width:1280px) and (min-width:561px) { .cz-picker { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.cz-tile { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; min-height:118px; padding:12px 8px; border:2px solid #e2e8f0; border-radius:18px; background:#fff; color:inherit; font:inherit; font-weight:700; font-size:1.05rem; cursor:pointer; transition:transform 120ms, border-color 120ms, box-shadow 120ms; }
.cz-tile:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(15,23,42,.08); }
.cz-tile:focus-visible { outline:3px solid #0369a1; outline-offset:2px; }
.cz-tile[aria-pressed="true"] { border-width:3px; box-shadow:0 8px 22px rgba(15,23,42,.12); }
.cz-ic { width:58px; height:58px; border-radius:16px; display:grid; place-items:center; }
.cz-check { position:absolute; top:8px; right:8px; }
.cz-say { display:grid; grid-template-columns:auto minmax(0,1fr); gap:16px; align-items:start; margin-top:16px; }
@media (max-width:560px) { .cz-picker { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } .cz-tile { min-height:100px; font-size:.95rem; border-radius:14px; } .cz-ic { width:48px; height:48px; } .cz-say { grid-template-columns:minmax(0,1fr); } .cz-tile.cz-other { grid-column:1 / -1; flex-direction:row; min-height:60px; } .cz-tile.cz-other .cz-ic { width:40px; height:40px; } }
.cz-bigid { font-size:clamp(2rem,9vw,3.1rem); font-weight:800; letter-spacing:.04em; line-height:1.1; word-break:break-all; font-variant-numeric:tabular-nums; }
.cz-next { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; list-style:none; padding:0; margin:0; }
.cz-next li { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; font-size:.92rem; font-weight:600; }
@media (max-width:560px) { .cz-next { grid-template-columns:minmax(0,1fr); } .cz-next li { flex-direction:row; text-align:left; } }
.cz-stepper { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:0; }
.cz-stepper li { position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:0 4px; font-size:.88rem; font-weight:600; color:#64748b; }
.cz-stepper li::before { content:''; position:absolute; top:24px; left:-50%; width:100%; height:4px; background:#e2e8f0; z-index:0; }
.cz-stepper li:first-child::before { display:none; }
.cz-stepper li.done::before, .cz-stepper li.now::before { background:#16a34a; }
.cz-dot { position:relative; z-index:1; width:48px; height:48px; border-radius:50%; display:grid; place-items:center; background:#f1f5f9; color:#94a3b8; border:3px solid #e2e8f0; }
.cz-stepper li.done { color:#15803d; } .cz-stepper li.done .cz-dot { background:#dcfce7; color:#15803d; border-color:#16a34a; }
.cz-stepper li.now { color:#0b1a33; } .cz-stepper li.now .cz-dot { background:#0369a1; color:#fff; border-color:#0369a1; box-shadow:0 0 0 6px #e0f2fe; }
.cz-stepper li.bad .cz-dot { background:#dc2626; border-color:#dc2626; box-shadow:0 0 0 6px #fee2e2; }
.cz-stepper .cz-when { font-size:.75rem; font-weight:500; color:#94a3b8; }
@media (max-width:640px) {
  .cz-stepper { grid-template-columns:minmax(0,1fr); gap:10px; }
  .cz-stepper li { flex-direction:row; text-align:left; gap:12px; padding:0; font-size:1rem; }
  .cz-stepper li::before { top:-10px; left:22px; width:4px; height:10px; }
  .cz-dot { width:44px; height:44px; flex:none; }
}
.cz-fix { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cz-fix .btn { min-height:64px; font-size:1.1rem; font-weight:700; justify-content:center; }
@media (max-width:420px) { .cz-fix { grid-template-columns:1fr; } }
.cz-help li { display:flex; gap:12px; align-items:flex-start; }
.cz-help { list-style:none; padding:0; margin:0; display:grid; gap:14px; }
.cz-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
@media (max-width:900px) { .cz-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .cz-stats .stat-value { font-size:1.6rem; } }
.cz-count { font-size:1.9rem; font-weight:800; line-height:1.1; }
.cz-words { font-size:.85rem; color:#475569; }
.cz-said { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:start; }
.cz-said .cz-lab { font-size:.75rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#64748b; }
.cz-arrow { display:flex; justify-content:center; color:#94a3b8; margin:-2px 0; }
.cz-chips { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
.cz-chips .btn { white-space:nowrap; }
details.cz-more > summary { cursor:pointer; min-height:44px; display:flex; align-items:center; gap:8px; font-weight:600; list-style:none; }
details.cz-more > summary::-webkit-details-marker { display:none; }
`,p=()=>(0,l.jsx)(`style`,{children:f});export{d as n,u as r,p as t};
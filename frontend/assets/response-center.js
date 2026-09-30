/* ===========================================================================
   CycloTrack India — Response Center logic
   ---------------------------------------------------------------------------
   Talks to the FastAPI backend's /api/v1/* routes (shelters, nearest-shelter
   search, risk assessment, alerts, data-source status). If the backend is
   unreachable (e.g. a static GitHub Pages deployment with no live server),
   every call falls back to the same built-in demo dataset the backend itself
   serves in "demo" mode, so the page keeps working offline.
   API base is overridable before this script loads:
       <script>window.CYCLOTRACK_API_BASE = "https://api.example.com";</script>
   ========================================================================= */
(function(){
"use strict";
var API_BASE=(typeof window!=="undefined"&&window.CYCLOTRACK_API_BASE)||"http://localhost:8000";
API_BASE=API_BASE.replace(/\/+$/,"");
var FETCH_TIMEOUT=6000;

function apiFetch(path,opts){
 var controller=(typeof AbortController!=="undefined")?new AbortController():null;
 var id=controller&&setTimeout(function(){controller.abort();},FETCH_TIMEOUT);
 opts=opts||{};
 if(controller)opts.signal=controller.signal;
 return fetch(API_BASE+path,opts).then(function(res){
  if(id)clearTimeout(id);
  if(!res.ok)throw new Error("HTTP "+res.status);
  return res.json();
 }).catch(function(err){
  if(id)clearTimeout(id);
  throw err;
 });
}

var shelters=[
{name:"Puri Coastal Shelter",district:"Puri",state:"Odisha",lat:19.8135,lng:85.8312,capacity:500,available:182,water:true,food:true,medical:true,accessible:true},
{name:"Gopalpur Cyclone Shelter",district:"Ganjam",state:"Odisha",lat:19.2676,lng:84.9050,capacity:420,available:96,water:true,food:true,medical:false,accessible:true},
{name:"Kakinada Relief Shelter",district:"Kakinada",state:"Andhra Pradesh",lat:16.9891,lng:82.2475,capacity:600,available:240,water:true,food:true,medical:true,accessible:false},
{name:"Srikakulam Safe Center",district:"Srikakulam",state:"Andhra Pradesh",lat:18.2969,lng:83.8973,capacity:350,available:140,water:true,food:false,medical:true,accessible:true},
{name:"Paradip Community Shelter",district:"Jagatsinghpur",state:"Odisha",lat:20.3160,lng:86.6080,capacity:450,available:210,water:true,food:true,medical:true,accessible:true},
{name:"Digha Emergency Shelter",district:"Purba Medinipur",state:"West Bengal",lat:21.6280,lng:87.5080,capacity:380,available:72,water:true,food:true,medical:false,accessible:true}
];
var sos=[
{id:"SOS-2026-000123",lat:19.80,lng:85.82,priority:"CRITICAL",people:6,medical:true,place:"Puri, Odisha"},
{id:"SOS-2026-000119",lat:19.28,lng:84.89,priority:"HIGH",people:12,medical:false,place:"Gopalpur, Odisha"},
{id:"SOS-2026-000131",lat:16.98,lng:82.25,priority:"MEDIUM",people:4,medical:false,place:"Kakinada, Andhra Pradesh"}
];
var map, markers={sos:[],shelters:[],risk:[],track:[]};
var dataMode="demo"; // flips to "live" once /api/v1/shelters answers successfully

function markerIcon(emoji){return L.divIcon({className:"rc-marker",html:'<div style="font-size:26px">'+emoji+'</div>',iconSize:[30,30],iconAnchor:[15,15]});}
function initMap(){
 if(!window.L||!document.getElementById("responseMap"))return;
 map=L.map("responseMap").setView([18.7,83.8],6);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap contributors"}).addTo(map);
 sos.forEach(function(s){var m=L.marker([s.lat,s.lng],{icon:markerIcon(s.priority==="CRITICAL"?"🔴":"🟠")}).addTo(map).bindPopup("<b>"+s.id+"</b><br>Priority: "+s.priority+"<br>People affected: "+s.people+"<br>"+s.place+"<br><b>Medical: "+(s.medical?"YES":"NO")+"</b>");markers.sos.push(m);});
 plotShelterMarkers(shelters);
 var cyclone=[{lat:15.8,lng:87.3},{lat:17.1,lng:86.0},{lat:18.4,lng:84.9},{lat:19.4,lng:84.0}];
 markers.track.push(L.polyline(cyclone,{dashArray:"8 8",weight:4}).addTo(map).bindPopup("<b>Predicted cyclone track</b><br>Demo ensemble · uncertainty not shown to scale"));
 L.marker(cyclone[0],{icon:markerIcon("🌀")}).addTo(map).bindPopup("<b>Active cyclone</b><br>Demo system · follow official IMD bulletins");
 var risk=L.polygon([[19.9,85.4],[19.6,86.3],[18.8,86.1],[18.7,85.5]],{color:"#d83a3a",fillOpacity:.16,weight:2}).addTo(map).bindPopup("<b>High impact risk zone</b><br>Demo layer");
 markers.risk.push(risk);
}
function plotShelterMarkers(list){
 if(!map)return;
 markers.shelters.forEach(function(m){map.removeLayer(m);});
 markers.shelters=[];
 list.forEach(function(s){var m=L.marker([s.lat,s.lng],{icon:markerIcon("🏠")}).addTo(map).bindPopup("<b>"+s.name+"</b><br>"+s.district+", "+s.state+"<br>Available: "+s.available+" / "+s.capacity+"<br>✓ Water · "+(s.food?"✓ Food":"✕ Food")+" · "+(s.medical?"✓ Medical":"✕ Medical"));markers.shelters.push(m);});
}
function setLayer(name){
 if(!map)return;
 ["sos","shelters","risk","track"].forEach(function(k){markers[k].forEach(function(m){if(name==="all"||name===k){if(!map.hasLayer(m))m.addTo(map)}else if(map.hasLayer(m))map.removeLayer(m);});});
 document.querySelectorAll(".map-controls button").forEach(function(b){b.classList.toggle("active",b.dataset.layer===name);});
}
function renderShelters(list){
 var box=document.getElementById("shelterList"); if(!box)return;
 box.innerHTML=list.map(function(s){var dist=(typeof s.distance_km==="number")?' · <b>'+s.distance_km+' km away</b>':(typeof s.distance==="number"?' · <b>'+s.distance.toFixed(1)+' km away</b>':'');return '<article class="shelter-card"><h3>'+s.name+'</h3><b>'+s.district+', '+s.state+dist+'</b><p>Capacity: '+s.capacity+' · Available: <strong>'+s.available+'</strong></p><div class="shelter-meta"><span class="tag">'+(s.water?"✓ Water":"✕ Water")+'</span><span class="tag">'+(s.food?"✓ Food":"✕ Food")+'</span><span class="tag">'+(s.medical?"✓ Medical":"✕ Medical")+'</span><span class="tag">'+(s.accessible?"✓ Accessible":"Standard")+'</span></div><button class="btn outline" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lng+'\',\'_blank\')">Get directions</button></article>';}).join("");
}
function distance(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;var q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}

/* ---------- Shelter registry: live backend with demo fallback ---------- */
function loadShelters(){
 apiFetch("/api/v1/shelters").then(function(data){
  if(data&&Array.isArray(data.shelters)&&data.shelters.length){
   shelters=data.shelters;
   dataMode=(data.mode==="live")?"live":"demo";
   renderShelters(shelters);
   plotShelterMarkers(shelters);
   var metricShelters=document.getElementById("metricShelters");
   if(metricShelters)metricShelters.textContent=shelters.length;
  }
 }).catch(function(){ /* keep built-in demo list */ });
}

/* ---------- Risk assessment: live backend with local-formula fallback ---------- */
function localRiskScore(wind,rain,surge,coast,vulnerability){
 var v=vulnerability==="high"?15:vulnerability==="medium"?8:0;
 var score=Math.min(100,(wind/2)+(rain/8)+(surge*10)+Math.max(0,30-coast)+v);
 var level=score>=75?"EXTREME":score>=55?"HIGH":score>=30?"MODERATE":"LOW";
 return {score:score,level:level};
}
function renderRisk(location,wind,rain,surge,coast,score,level){
 var r=document.getElementById("riskResult");
 r.innerHTML='<span class="risk-ring">'+Math.round(score)+'</span><div><b>Your prototype risk</b><h3>'+level+'</h3><p>Wind '+wind+' km/h · Rain '+rain+' mm · Surge '+surge+' m · Coast '+coast+' km.</p><p><strong>Action:</strong> Follow official IMD/NDMA and local authority instructions. Move to a designated shelter if ordered.</p><small>Prototype score — not an official warning.</small></div>';
 document.getElementById("metricRisk").textContent=level;
}
function assess(){
 var location=document.getElementById("riskLocation").value||"Unspecified location";
 var coast=+document.getElementById("coastDistance").value||0,wind=+document.getElementById("riskWind").value||0,rain=+document.getElementById("riskRain").value||0,surge=+document.getElementById("riskSurge").value||0,v=document.getElementById("vulnerability").value;
 return apiFetch("/api/v1/risk/assess",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({location:location,coast_distance_km:coast,wind_kmh:wind,rainfall_mm:rain,storm_surge_m:surge,vulnerability:v})
 }).then(function(data){
  renderRisk(location,wind,rain,surge,coast,data.score,data.level);
 }).catch(function(){
  var local=localRiskScore(wind,rain,surge,coast,v);
  renderRisk(location,wind,rain,surge,coast,local.score,local.level);
 });
}

/* ---------- Data-source status strip: live backend with static fallback ---------- */
function loadDataSourceStatus(){
 apiFetch("/api/v1/data-sources/status").then(function(data){
  var grid=document.querySelector(".status-grid");
  if(!grid||!Array.isArray(data.sources))return;
  var icons={"Satellite":"🛰️","Weather":"🌦️","Cyclone feed":"🌀","Ocean":"🌊"};
  grid.innerHTML=data.sources.map(function(s){return '<div><b>'+(icons[s.name]||"●")+' '+s.name+'</b><span>● '+s.status.charAt(0).toUpperCase()+s.status.slice(1)+' provider</span></div>';}).join("");
 }).catch(function(){ /* keep the static markup already in the page */ });
}

function init(){
 initMap(); renderShelters(shelters);
 loadShelters();
 loadDataSourceStatus();
 document.querySelectorAll(".map-controls button").forEach(function(b){b.onclick=function(){setLayer(b.dataset.layer)}});
 document.getElementById("riskForm").addEventListener("submit",function(e){
  e.preventDefault();
  var btn=e.target.querySelector('button[type="submit"]');
  if(typeof CycloLoader!=="undefined")CycloLoader.show("Assessing your risk…");
  Promise.resolve(assess()).finally(function(){if(typeof CycloLoader!=="undefined")CycloLoader.hide()});
 });
 document.getElementById("findShelters").onclick=function(){
  var q=document.getElementById("shelterSearch").value.toLowerCase().trim();
  if(typeof CycloLoader!=="undefined")CycloLoader.show("Finding shelters…");
  apiFetch("/api/v1/shelters"+(q?"?q="+encodeURIComponent(q):"")).then(function(data){
   renderShelters(Array.isArray(data.shelters)?data.shelters:[]);
  }).catch(function(){
   renderShelters(shelters.filter(function(s){return !q||s.name.toLowerCase().includes(q)||s.district.toLowerCase().includes(q)||s.state.toLowerCase().includes(q)}));
  }).finally(function(){
   if(typeof CycloLoader!=="undefined")CycloLoader.hide();
  });
 };
 document.getElementById("useLocation").onclick=function(){
  if(!navigator.geolocation)return alert("Location is not supported by this browser.");
  if(typeof CycloLoader!=="undefined")CycloLoader.show("Locating you…");
  navigator.geolocation.getCurrentPosition(function(pos){
   var lat=pos.coords.latitude,lng=pos.coords.longitude;
   apiFetch("/api/v1/shelters/nearest?lat="+lat+"&lng="+lng+"&limit=6").then(function(data){
    renderShelters(Array.isArray(data.shelters)?data.shelters:[]);
   }).catch(function(){
    renderShelters(shelters.map(function(s){return Object.assign({},s,{distance:distance(lat,lng,s.lat,s.lng)})}).sort(function(a,b){return a.distance-b.distance}));
   }).finally(function(){
    if(typeof CycloLoader!=="undefined")CycloLoader.hide();
   });
   if(map)map.setView([lat,lng],10);
  },function(){
   if(typeof CycloLoader!=="undefined")CycloLoader.hide();
   alert("Location permission was not granted. Search by district instead.");
  });
 };
 document.getElementById("enableNotifications").onclick=function(){var out=document.getElementById("notifyStatus");if(!("Notification" in window)){out.textContent="Browser notifications are not supported.";return}Notification.requestPermission().then(function(p){out.textContent=p==="granted"?"Browser alerts enabled on this device.":"Permission not granted.";if(p==="granted")new Notification("CycloTrack India",{body:"Alert notifications are enabled. Follow official warnings."})})};
 var lang=document.getElementById("botLanguage"),saved=localStorage.getItem("cyclotrack_bot_language");if(saved)lang.value=saved;lang.onchange=function(){localStorage.setItem("cyclotrack_bot_language",lang.value)};
}
document.addEventListener("DOMContentLoaded",init);
})();

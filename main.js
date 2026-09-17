import {Game} from "./game.js";
import {load,save,reset} from "./storage.js";
import {boardCanvas,preview,drawHold,renderStats} from "./ui.js";

const data=load();
const $=id=>document.getElementById(id);
let game;
const screens=[...document.querySelectorAll(".screen")];
function show(id){screens.forEach(s=>s.classList.toggle("active",s.id===id));if(id==="stats")renderStats(data,$("statsCards"),$("historyList"))}
function refresh(){if(!game)return;boardCanvas($("board"),game);preview($("nextCanvas"),game.queue);drawHold($("holdCanvas"),game.hold);$("score").textContent=game.score.toLocaleString();$("level").textContent=game.level;$("lines").textContent=game.lines}
function finish(){data.games++;data.highScore=Math.max(data.highScore,game.score);data.totalLines+=game.lines;data.level=Math.max(data.level,game.level);data.totalPieces+=game.board.flat().filter(Boolean).length;data.history.push({date:Date.now(),score:game.score});data.history=data.history.slice(-20);save(data)}
function start(){game=new Game(refresh,data.settings);show("game");$("overlay").classList.remove("show");game.start();refresh()}
$("playBtn").onclick=start;
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
document.querySelectorAll(".back").forEach(b=>b.onclick=()=>show("home"));
$("pauseBtn").onclick=()=>{if(game?.running){game.running=false;$("modalTitle").textContent="PAUSED";$("modalText").textContent="";$("resumeBtn").style.display="block";$("restartBtn").textContent="RESTART";$("overlay").classList.add("show")}};
$("resumeBtn").onclick=()=>{if(game&&!game.over){game.running=true;game.last=performance.now();requestAnimationFrame(t=>game.loop(t));$("overlay").classList.remove("show")}};
$("restartBtn").onclick=()=>start();
$("homeBtn").onclick=()=>{if(game&&!game.over)finish();$("overlay").classList.remove("show");show("home");updateHome()};
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{const a=b.dataset.action;if(!game)return;if(a==="left")game.move(-1);if(a==="right")game.move(1);if(a==="down")game.soft();if(a==="rotate")game.turn();if(a==="drop")game.hard();if(a==="hold")game.doHold()}));
window.addEventListener("keydown",e=>{if(!game)return; if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","c","C"].includes(e.key))e.preventDefault();if(e.key==="ArrowLeft")game.move(-1);if(e.key==="ArrowRight")game.move(1);if(e.key==="ArrowDown")game.soft();if(e.key==="ArrowUp")game.turn();if(e.key===" ")game.hard();if(e.key.toLowerCase()==="c")game.doHold();if(e.key==="Escape")$("pauseBtn").click()});
for(const id of ["soundToggle","musicToggle","vibeToggle","ghostToggle","animToggle"]){const key=id.replace("Toggle","");$(id).checked=data.settings[key];$(id).onchange=()=>{data.settings[key]=$(id).checked;save(data);if(game)game.settings=data.settings}}
$("resetData").onclick=()=>{if(confirm("Reset all saved Neon Blocks data?")){reset();location.reload()}}
function updateHome(){$("homeHigh").textContent=data.highScore.toLocaleString();$("homeLines").textContent=data.totalLines.toLocaleString()}
updateHome();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
window.addEventListener("resize",()=>game&&refresh());

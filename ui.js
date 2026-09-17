import {PIECES} from "./pieces.js";
import {W,H} from "./board.js";
export function boardCanvas(canvas,game){
 const c=canvas.getContext("2d"),w=canvas.clientWidth,h=canvas.clientHeight;
 const dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);
 const cw=w/W,ch=h/H;c.fillStyle="#071015";c.fillRect(0,0,w,h);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=game.board[y][x];cell(c,x,y,v,cw,ch)}
 if(game.settings.ghost&&!game.over){const gy=game.ghostY();game.piece.shape.forEach((r,y)=>r.forEach((v,x)=>v&&cell(c,game.piece.x+x,gy+y,game.piece.color+"55",cw,ch,true)))}
 if(!game.over)game.piece.shape.forEach((r,y)=>r.forEach((v,x)=>v&&cell(c,game.piece.x+x,game.piece.y+y,game.piece.color,cw,ch)));
}
function cell(c,x,y,color,w,h,ghost=false){if(y<0)return;c.fillStyle=color;c.fillRect(x*w+1,y*h+1,w-2,h-2);if(!ghost){c.fillStyle="#ffffff22";c.fillRect(x*w+2,y*h+2,w-4,Math.max(2,h*.1))}}
export function preview(canvas,types){const c=canvas.getContext("2d"),w=canvas.clientWidth,h=canvas.clientHeight;c.clearRect(0,0,w,h);let y=8;for(const t of types){const s=PIECES[t].shape;const size=18;const ox=(w-s[0].length*size)/2;s.forEach((r,yy)=>r.forEach((v,xx)=>v&&(c.fillStyle=PIECES[t].color,c.fillRect(ox+xx*size,y+yy*size,size-2,size-2))));y+=s.length*size+18;if(y>h-30)break}}
export function drawHold(canvas,type){const c=canvas.getContext("2d"),w=canvas.clientWidth,h=canvas.clientHeight;c.clearRect(0,0,w,h);if(!type)return;const s=PIECES[type].shape,size=20,ox=(w-s[0].length*size)/2,oy=(h-s.length*size)/2;s.forEach((r,y)=>r.forEach((v,x)=>v&&(c.fillStyle=PIECES[type].color,c.fillRect(ox+x*size,oy+y*size,size-2,size-2))))}
export function renderStats(data,el,hist){const vals=[["HIGH SCORE",data.highScore],["BEST LEVEL",data.level],["TOTAL LINES",data.totalLines],["GAMES",data.games],["TETRISES",data.tetrises],["BEST COMBO",data.bestCombo],["PIECES",data.totalPieces],["PLAY TIME",Math.floor(data.playTime/60)+"m"]];el.innerHTML=vals.map(v=>`<div class="stat-card"><small>${v[0]}</small><strong>${v[1]}</strong></div>`).join("");hist.innerHTML=data.history.slice(-8).reverse().map(g=>`<div class="history-row"><span>${new Date(g.date).toLocaleDateString()}</span><b>${g.score.toLocaleString()}</b></div>`).join("")||"<p>No games yet.</p>"}

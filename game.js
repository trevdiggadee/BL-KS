import {PIECES,randomType,rotate} from "./pieces.js";
import {W,H,emptyBoard,valid,merge,clearLines} from "./board.js";
import {beep} from "./audio.js";

export class Game{
 constructor(onUpdate,settings){this.cb=onUpdate;this.settings=settings;this.reset()}
 reset(){this.board=emptyBoard();this.queue=[];this.hold=null;this.canHold=true;this.score=0;this.level=1;this.lines=0;this.combo=0;this.running=false;this.over=false;this.last=0;this.dropTimer=0;for(let i=0;i<5;i++)this.queue.push(randomType());this.spawn()}
 spawn(){const t=this.queue.shift();this.queue.push(randomType());const d=PIECES[t];this.piece={type:t,color:d.color,shape:d.shape.map(r=>r.slice()),x:Math.floor((W-d.shape[0].length)/2),y:-1};this.canHold=true;if(!valid(this.board,this.piece))this.end()}
 start(){this.running=true;this.over=false;this.last=performance.now();requestAnimationFrame(t=>this.loop(t))}
 loop(t){if(!this.running)return;const dt=t-this.last;this.last=t;this.dropTimer+=dt;const speed=Math.max(80,800-(this.level-1)*65);if(this.dropTimer>speed){this.dropTimer=0;if(!valid(this.board,this.piece,0,1))this.lock();else this.piece.y++}this.cb();requestAnimationFrame(x=>this.loop(x))}
 move(dx){if(this.running&&valid(this.board,this.piece,dx,0)){this.piece.x+=dx;beep(220,.025);this.cb()}}
 soft(){if(this.running&&valid(this.board,this.piece,0,1)){this.piece.y++;this.score++;this.cb()}}
 hard(){if(!this.running)return;let d=0;while(valid(this.board,this.piece,0,1)){this.piece.y++;d++}this.score+=d*2;this.lock()}
 turn(){if(!this.running)return;const s=rotate(this.piece.shape);if(valid(this.board,this.piece,0,0,s))this.piece.shape=s;else if(valid(this.board,this.piece,-1,0,s)){this.piece.x--;this.piece.shape=s}else if(valid(this.board,this.piece,1,0,s)){this.piece.x++;this.piece.shape=s}beep(440,.04);this.cb()}
 doHold(){if(!this.running||!this.canHold)return;const old=this.piece.type;if(!this.hold){this.hold=old;this.spawn()}else{const t=this.hold;this.hold=old;const d=PIECES[t];this.piece={type:t,color:d.color,shape:d.shape.map(r=>r.slice()),x:Math.floor((W-d.shape[0].length)/2),y:-1}}this.canHold=false;this.cb()}
 lock(){merge(this.board,this.piece);const n=clearLines(this.board);this.lines+=n;if(n){this.combo++;const base=[0,100,300,500,800][n];this.score+=base*this.level*(this.combo>1?this.combo:1);if(n===4)beep(900,.14);else beep(650,.08);this.level=Math.floor(this.lines/10)+1}else this.combo=0;this.spawn();this.cb()}
 end(){this.running=false;this.over=true;this.cb()}
 ghostY(){let y=this.piece.y;while(valid(this.board,{...this.piece,y},0,1))y++;return y}
}
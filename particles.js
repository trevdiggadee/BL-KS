/**
 * Style-aware visual FX: each block style gets its own language of particles.
 * Neon = electricity, Glass = sparkle/caustics, Voxel = dust/chunks,
 * Chrome = metal sparks, Holo = pixels/spectral shards.
 */
const Particles = (() => {
  let particles = [], shocks = [], beams = [];
  const MAX_PARTICLES = 650;
  const style = () => document.documentElement.dataset.blockStyle || 'neon';

  function hexToRgb(hex) {
    const h=(hex||'#ffffff').replace('#','');
    if(h.length!==6) return {r:255,g:255,b:255};
    return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
  }
  function rgba(hex,a){const c=hexToRgb(hex);return `rgba(${c.r},${c.g},${c.b},${a})`;}
  function push(p){ if(particles.length<MAX_PARTICLES) particles.push(p); }

  function spawnLineClearBurst(rows, cols, cellSize, colors, big=false){
    const st=style(), per=big?8:5, boardWidth=cols*cellSize;
    rows.forEach((y,idx)=>{
      for(let i=0;i<cols;i++){
        const x=i*cellSize+cellSize/2, color=colors[(i+idx)%colors.length];
        for(let n=0;n<per;n++){
          const a=Math.random()*Math.PI*2, speed=(big?3.2:2)+Math.random()*(big?7:4.5);
          const p={x,y:y+cellSize/2,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-(big?2.4:1.2),life:1,decay:.012+Math.random()*.016,size:(big?3:2)+Math.random()*(big?6:3.5),color,grav:true,kind:st};
          if(st==='voxel'){p.vx*=.75;p.vy*=.55;p.size=Math.max(2,Math.round(p.size));}
          if(st==='glass'){p.grav=false;p.kind='sparkle';p.decay*=.8;}
          if(st==='holo'){p.kind='glitch';p.grav=false;p.vx*=1.5;}
          if(st==='chrome'){p.size*=.7;p.vy-=1;}
          if(st==='neon'){p.kind='electric';}
          push(p);
        }
      }
      shocks.push({y:y+cellSize/2,width:boardWidth,height:6,maxHeight:big?60:34,life:1,color:colors[idx%colors.length],kind:st});
    });
  }

  function spawnBurstAt(x,y,color,count=14){
    const st=style();
    for(let n=0;n<count;n++){
      const a=Math.random()*Math.PI*2;
      let speed=1.5+Math.random()*3;
      const p={x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:1,decay:.025+Math.random()*.02,size:2+Math.random()*3,color,grav:true,kind:st};
      if(st==='glass'){p.grav=false;p.kind='sparkle';}
      if(st==='holo'){p.grav=false;p.kind='glitch';}
      if(st==='voxel'){p.size=Math.max(2,Math.round(p.size));p.vx*=.7;p.vy*=.7;}
      if(st==='chrome'){p.size*=.65;p.vy-=1.2;}
      if(st==='neon'){p.kind='electric';}
      push(p);
    }
  }

  function spawnDropBeam(x,yTop,yBottom,color,width){ beams.push({x,yTop,yBottom,color,width,life:1,kind:style()}); }

  function update(){
    particles=particles.filter(p=>p.life>0);
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.grav)p.vy+=0.12;if(p.kind==='electric')p.vx*=.992;p.life-=p.decay;});
    shocks=shocks.filter(s=>s.life>0); shocks.forEach(s=>{s.height+=(s.maxHeight-s.height)*.22;s.life-=.055;});
    beams=beams.filter(b=>b.life>0); beams.forEach(b=>{b.life-=.1;});
  }

  function drawElectric(ctx,p,a){
    ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.lineWidth=Math.max(1,p.size*.45);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.vx*2,p.y+p.vy*2);ctx.lineTo(p.x+p.vx*3.2+(Math.random()-.5)*4,p.y+p.vy*3.2+(Math.random()-.5)*4);ctx.stroke();ctx.restore();
  }
  function drawSparkle(ctx,p,a){
    ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#fff';ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.lineWidth=Math.max(1,p.size*.3);const s=p.size*1.5;ctx.beginPath();ctx.moveTo(p.x-s,p.y);ctx.lineTo(p.x+s,p.y);ctx.moveTo(p.x,p.y-s);ctx.lineTo(p.x,p.y+s);ctx.stroke();ctx.restore();
  }
  function drawVoxel(ctx,p,a){
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=3;const s=Math.max(2,Math.round(p.size));ctx.fillRect(Math.round(p.x-s/2),Math.round(p.y-s/2),s,s);ctx.restore();
  }
  function drawChrome(ctx,p,a){
    ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#fff';ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.lineWidth=Math.max(1,p.size*.35);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*1.8,p.y-p.vy*1.8);ctx.stroke();ctx.restore();
  }
  function drawHolo(ctx,p,a){
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;const s=p.size*(.6+Math.random()*.7);ctx.fillRect(p.x-s,p.y-s*.35,s*2,s*.7);ctx.restore();
  }

  function drawAmbientStyle(ctx, w, h){
    const st=style();
    const t=performance.now()*.001;
    ctx.save();
    if(st==='fire'){
      for(let i=0;i<18;i++){ const x=(Math.sin(i*12.7)*.5+.5)*w; const y=(h-((t*(18+i%5*5)+i*31)%h)); const a=.08+.07*Math.sin(t*5+i); ctx.globalAlpha=Math.max(0,a); ctx.fillStyle=i%3?'#ff6b1f':'#ffe08a'; ctx.shadowColor='#ff3b18'; ctx.shadowBlur=7; ctx.beginPath(); ctx.arc(x,y,1.1+(i%3)*.5,0,Math.PI*2); ctx.fill(); }
    } else if(st==='crystal' || st==='glass'){
      for(let i=0;i<12;i++){ const x=(Math.sin(i*9.1)*.5+.5)*w; const y=(Math.cos(t*.7+i)*.35+.5)*h; const a=.12+.12*Math.sin(t*3+i); ctx.globalAlpha=Math.max(0,a); ctx.strokeStyle='#dffcff'; ctx.shadowColor='#65eaff'; ctx.shadowBlur=8; const s=2+(i%3); ctx.beginPath(); ctx.moveTo(x-s,y);ctx.lineTo(x+s,y);ctx.moveTo(x,y-s);ctx.lineTo(x,y+s);ctx.stroke(); }
    } else if(st==='voxel'){
      for(let i=0;i<16;i++){ const x=(i*47+ t*(5+i%3))%w; const y=(i*71+t*(8+i%4))%h; ctx.globalAlpha=.12; ctx.fillStyle='#d7c7a1'; ctx.fillRect(x,y,2+(i%3),2+(i%2)); }
    } else if(st==='chrome'){
      ctx.globalAlpha=.08; ctx.strokeStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12; const sweep=(t*80)% (w+120)-120; ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(sweep,0);ctx.lineTo(sweep+100,h);ctx.stroke();
    } else if(st==='holo'){
      ctx.globalAlpha=.09; ctx.strokeStyle='#b75cff'; ctx.lineWidth=1; for(let y=(t*20)%18;y<h;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    } else {
      ctx.globalAlpha=.08; ctx.fillStyle='#fff'; for(let i=0;i<20;i++){const x=(Math.sin(i*8.2)*.5+.5)*w,y=(Math.cos(t*.3+i)*.5+.5)*h;ctx.beginPath();ctx.arc(x,y,1+(i%2),0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }

  function draw(ctx){
    drawAmbientStyle(ctx, ctx.canvas.clientWidth || ctx.canvas.width || 1, ctx.canvas.clientHeight || ctx.canvas.height || 1);
    shocks.forEach(s=>{const a=Math.max(0,s.life)*.5;const g=ctx.createLinearGradient(0,s.y-s.height/2,0,s.y+s.height/2);g.addColorStop(0,rgba(s.color,0));g.addColorStop(.5,rgba(s.color,a));g.addColorStop(1,rgba(s.color,0));ctx.fillStyle=g;ctx.fillRect(0,s.y-s.height/2,s.width,s.height);});
    beams.forEach(b=>{const a=Math.max(0,b.life);if(a<=.01)return;const g=ctx.createLinearGradient(0,b.yTop,0,b.yBottom);g.addColorStop(0,rgba(b.color,0));g.addColorStop(.7,rgba(b.color,a*.5));g.addColorStop(1,rgba(b.color,a*.9));ctx.fillStyle=g;ctx.fillRect(b.x-b.width/2,b.yTop,b.width,Math.max(1,b.yBottom-b.yTop));});
    particles.forEach(p=>{const a=Math.max(0,p.life);if(a<=.01)return;switch(p.kind){case'electric':drawElectric(ctx,p,a);break;case'sparkle':drawSparkle(ctx,p,a);break;case'voxel':drawVoxel(ctx,p,a);break;case'chrome':drawChrome(ctx,p,a);break;case'glitch':drawHolo(ctx,p,a);break;default:ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);ctx.restore();}});
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }
  function clear(){particles=[];shocks=[];beams=[];} function count(){return particles.length;}
  return {spawnLineClearBurst,spawnBurstAt,spawnDropBeam,update,draw,clear,count};
})();

/* Final menu behavior: background artwork is the Play button; floating pieces are tetrominoes. */
(function () {
  'use strict';
  var T = {
    I:[[0,0],[1,0],[2,0],[3,0]], O:[[0,0],[1,0],[0,1],[1,1]],
    T:[[0,0],[1,0],[2,0],[1,1]], L:[[0,0],[0,1],[0,2],[1,2]],
    S:[[1,0],[2,0],[0,1],[1,1]], Z:[[0,0],[1,0],[1,1],[2,1]]
  };
  var order=['I','O','T','L','S','Z'];
  var faces='<i class="cf cf--front"></i><i class="cf cf--back"></i><i class="cf cf--right"></i><i class="cf cf--left"></i><i class="cf cf--top"></i><i class="cf cf--bottom"></i>';
  function mode(){ try{return (JSON.parse(localStorage.getItem('neonblock-visuals-v2')||'{}').gameMode)||'standard';}catch(e){return 'standard';} }
  function start(){ if(window.Audio_?.sfx?.uiTap) Audio_.sfx.uiTap(); if(window.Game?.startCountdown) Game.startCountdown(mode()); }
  function apply(){
    document.querySelectorAll('.start-top').forEach(function(n){n.remove();});
    var stage=document.getElementById('btn-play') || document.querySelector('.hero-stage');
    if(stage){
      stage.id='btn-play'; stage.setAttribute('role','button'); stage.setAttribute('tabindex','0');
      stage.setAttribute('aria-label','Play BLØKS — tap the background scene to start');
      stage.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();stage.click();}});
    }
    document.querySelectorAll('.hero-piece').forEach(function(hp,i){
      hp.innerHTML='';
      T[order[i%order.length]].forEach(function(c){
        var cube=document.createElement('div'); cube.className='cube3d';
        cube.style.left='calc(var(--cube-size) * '+c[0]+')';
        cube.style.top='calc(var(--cube-size) * '+c[1]+')';
        cube.innerHTML=faces; hp.appendChild(cube);
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();

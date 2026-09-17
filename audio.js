let ctx;
export function beep(freq=500,duration=.05){
  try{ctx??=new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.type="square";g.gain.value=.025;o.connect(g);g.connect(ctx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);o.stop(ctx.currentTime+duration)}catch{}
}
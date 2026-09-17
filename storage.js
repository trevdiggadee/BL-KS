const KEY="neon_blocks_save_v1";
const defaults={highScore:0,level:1,totalLines:0,games:0,tetrises:0,bestCombo:0,totalPieces:0,playTime:0,history:[],settings:{sound:true,music:false,vibration:true,ghost:true,animations:true}};
function clone(x){return JSON.parse(JSON.stringify(x))}
export function load(){try{return {...clone(defaults),...JSON.parse(localStorage.getItem(KEY)||"{}"),settings:{...defaults.settings,...(JSON.parse(localStorage.getItem(KEY)||"{}").settings||{})}}}catch{return clone(defaults)}}
export function save(data){localStorage.setItem(KEY,JSON.stringify(data))}
export function reset(){localStorage.removeItem(KEY)}
export {defaults};
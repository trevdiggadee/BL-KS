export const PIECES={
 I:{color:"#29d8ff",shape:[[1,1,1,1]]},
 O:{color:"#ffe04b",shape:[[1,1],[1,1]]},
 T:{color:"#b45cff",shape:[[0,1,0],[1,1,1]]},
 S:{color:"#55f07d",shape:[[0,1,1],[1,1,0]]},
 Z:{color:"#ff5d6c",shape:[[1,1,0],[0,1,1]]},
 J:{color:"#5578ff",shape:[[1,0,0],[1,1,1]]},
 L:{color:"#ff9a3d",shape:[[0,0,1],[1,1,1]]}
};
export const TYPES=Object.keys(PIECES);
export function randomType(){return TYPES[Math.floor(Math.random()*TYPES.length)]}
export function rotate(shape){return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse())}
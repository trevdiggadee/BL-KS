export const W=10,H=20;
export function emptyBoard(){return Array.from({length:H},()=>Array(W).fill(null))}
export function valid(board,piece,dx=0,dy=0,shape=piece.shape){
  for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++)if(shape[y][x]){
    const nx=piece.x+x+dx,ny=piece.y+y+dy;
    if(nx<0||nx>=W||ny>=H)return false;
    if(ny>=0&&board[ny][nx])return false;
  }return true
}
export function merge(board,piece){piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v&&piece.y+y>=0)board[piece.y+y][piece.x+x]=piece.color}))}
export function clearLines(board){
  let n=0;
  for(let y=H-1;y>=0;y--)if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(null));n++;y++}
  return n;
}
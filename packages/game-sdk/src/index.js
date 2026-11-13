/**
 * @typedef {{score:number,elapsed:number,won:boolean,steps?:number,mistakes?:number,[key:string]:unknown}} GameResult
 * @typedef {{update:(dt:number)=>void,draw:(ctx:CanvasRenderingContext2D)=>void,input:(type:string,payload?:object)=>void,getState:()=>object,destroy:()=>void}} GameInstance
 * @typedef {{seed:number|string,level?:object,onFinish?:(result:GameResult)=>void,sound?:(kind?:string)=>void}} GameOptions
 * @typedef {{id:string,title:string,limit:number|null,canvas?:{width:number,height:number},campaign?:{version:number,total:number,recordPolicy?:'steps'|'elapsed'|'action',presentation?:object},controls:string,rules:string[]}} GameManifest
 */
export function hash(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
export function label(
  ctx,
  value,
  x,
  y,
  size = 16,
  color = '#233c39',
  align = 'center',
  weight = 600,
) {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x, y);
}
export function beijingDate(now = Date.now()) {
  return new Date(Number(now) + 8 * 3600000).toISOString().slice(0, 10);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

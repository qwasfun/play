import './art.css';
import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function towerArt(){
  const blocks=[[174,267,234,35,'#8baa8b','#688c75'],[181,224,220,35,'#e8c779','#b69a5a'],[192,181,206,35,'#e99c83','#b97265'],[204,138,191,35,'#9abec8','#7097a6']];
  let floors='';
  for(const[x,y,w,h,top,side]of blocks){
    floors+=`<g><rect x="${x}" y="${y+7}" width="${w}" height="${h}" rx="8" fill="${side}"/><rect x="${x}" y="${y}" width="${w}" height="${h-1}" rx="8" fill="${top}"/><path d="M${x+15} ${y+7}H${x+w-17}" stroke="#fff0d0" stroke-width="3" stroke-linecap="round" opacity=".4"/><rect x="${x+24}" y="${y+13}" width="17" height="13" rx="4" fill="#fff5db" opacity=".7"/><rect x="${x+w-43}" y="${y+13}" width="17" height="13" rx="4" fill="#fff5db" opacity=".7"/></g>`;
  }
  return svg(`<rect width="600" height="360" fill="#f2dfcc"/><circle cx="299" cy="176" r="148" fill="#ead0bd"/>${cloud(65,65,.67,'#fff4de')}${cloud(431,177,.6,'#f9eddb')}<circle cx="468" cy="77" r="24" fill="#edca81"/><ellipse cx="297" cy="320" rx="153" ry="16" fill="#d4bca4" opacity=".55"/><rect x="151" y="306" width="285" height="15" rx="7" fill="#baa688"/><rect x="151" y="299" width="285" height="14" rx="7" fill="#d4bea0"/>${floors}<path d="M216 128V80M383 128V80" stroke="#b7a993" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round"/><g transform="translate(254 88)"><rect y="6" width="179" height="34" rx="8" fill="#b77d81"/><rect width="179" height="33" rx="8" fill="#d6a1a0"/><path d="M15 7H162" stroke="#f4ceba" stroke-width="3" stroke-linecap="round"/><rect x="24" y="13" width="17" height="12" rx="4" fill="#ffe5cd"/><rect x="137" y="13" width="17" height="12" rx="4" fill="#ffe5cd"/></g><path d="M222 52H384M231 44L222 52L231 60M375 44L384 52L375 60" fill="none" stroke="#bda085" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M114 273v-24m-8 12h16M479 261v-19m-6 9h12" stroke="#c8ad8a" stroke-width="3" stroke-linecap="round"/>${spark(103,132,11,'#fff3ce')}${spark(483,304,10,'#e8c289')}<path d="M120 321q11-25 24-7-11 22-24 7M464 314q10-20 22-6-10 20-22 6" fill="#b4bd91"/>`);
}
export {towerArt as art};

import './art.css';
import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function mergeArt() {
  let tiles='';
  const values=[2,4,8,0,4,8,16,2,0,16,32,4,2,0,64,128];
  const palette={0:'#e5d8b9',2:'#fff2d8',4:'#f6dfae',8:'#efc18e',16:'#ecab8e',32:'#e99e8d',64:'#d88f88',128:'#be7d7b'};
  for(let i=0;i<16;i++){
    const x=158+i%4*72,y=53+Math.floor(i/4)*65,v=values[i];
    tiles+=`<rect x="${x}" y="${y+3}" width="64" height="57" rx="11" fill="#c6b18c"/><rect x="${x}" y="${y}" width="64" height="57" rx="11" fill="${palette[v]}"/>${v?`<text x="${x+32}" y="${y+29}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="750" font-size="${v===128?25:29}" fill="${v>=64?'#fff5df':'#8b6b4c'}">${v}</text>`:''}`;
  }
  return svg(`<rect width="600" height="360" fill="#f3e8d1"/><circle cx="300" cy="176" r="155" fill="#ecddbd"/><ellipse cx="301" cy="327" rx="159" ry="16" fill="#d7c5a2" opacity=".5"/><rect x="143" y="43" width="310" height="281" rx="25" fill="#c7b18c"/><rect x="143" y="35" width="310" height="281" rx="25" fill="#d3bf9b"/>${tiles}${spark(107,113,14,'#e7bb78')}${spark(493,252,12,'#dbad83')}<path d="M106 241h18m-9-9v18M484 91h14m-7-7v14" stroke="#dac49c" stroke-width="3" stroke-linecap="round"/><circle cx="480" cy="154" r="4" fill="#d1bd95"/><circle cx="115" cy="291" r="3" fill="#d1bd95"/>`);
}
export {mergeArt as art};

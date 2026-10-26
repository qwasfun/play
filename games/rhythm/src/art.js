import './art.css';
import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function rhythmArt() {
  const colors=['#d69bb9','#f0c775','#9ebf9c','#9bbbd4'];
  const symbols=['←','↑','↓','→'];
  let lanes='';
  for(let i=0;i<4;i++){
    const x=156+i*75;
    lanes+=`<rect x="${x}" y="50" width="66" height="258" rx="13" fill="#544968"/><path d="M${x+33} 65V275" stroke="#6c5e7d" stroke-width="2" stroke-dasharray="3 7"/><rect x="${x+4}" y="264" width="58" height="37" rx="10" fill="${colors[i]}"/><text x="${x+33}" y="290" text-anchor="middle" fill="#473d58" font-size="27" font-weight="650" font-family="system-ui,sans-serif">${symbols[i]}</text>`;
  }
  const notes=[[0,157],[1,98],[2,211],[3,127],[0,69],[3,220]];
  let blocks='';
  for(const[lane,y]of notes){const x=162+lane*75;blocks+=`<g transform="translate(${x} ${y})"><rect y="3" width="54" height="25" rx="8" fill="#3c3450"/><rect width="54" height="25" rx="8" fill="${colors[lane]}"/><path d="M10 5H28" stroke="#fff5dd" stroke-width="3" stroke-linecap="round" opacity=".65"/><circle cx="40" cy="13" r="3" fill="#fff7df"/></g>`;}
  return svg(`<rect width="600" height="360" fill="#3c3451"/><circle cx="300" cy="178" r="152" fill="#443a5b"/><ellipse cx="300" cy="328" rx="156" ry="13" fill="#302b43"/><rect x="143" y="38" width="317" height="283" rx="25" fill="#29283d"/>${lanes}<path d="M149 251H454" stroke="#f3d892" stroke-width="3" opacity=".75"/>${blocks}<g transform="translate(106 188) rotate(-13)"><path d="M-3-10V15M-3-10L16-15V8" fill="none" stroke="#c2a3c0" stroke-width="5" stroke-linecap="round"/><ellipse cx="-10" cy="17" rx="9" ry="6" fill="#c2a3c0"/><ellipse cx="9" cy="10" rx="9" ry="6" fill="#c2a3c0"/></g><g transform="translate(495 127) rotate(12) scale(.75)"><path d="M0-16V18M0-16Q22-13 14 3" fill="none" stroke="#a7c5ce" stroke-width="6" stroke-linecap="round"/><ellipse cx="-8" cy="21" rx="11" ry="7" fill="#a7c5ce"/></g>${spark(103,83,11,'#edcd83')}${spark(492,266,13,'#b8a2ca')}<circle cx="492" cy="203" r="4" fill="#79688e"/><circle cx="107" cy="281" r="3" fill="#79688e"/>`);
}
export {rhythmArt as art};

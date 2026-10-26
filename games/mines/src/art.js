import './art.css';
import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function minesArt(){
  let tiles='';
  const revealed=new Set([0,1,2,4,5,8]);
  const numbers={1:1,2:1,5:2,8:1};
  for(let i=0;i<16;i++){
    const x=171+i%4*65,y=48+Math.floor(i/4)*65;
    const open=revealed.has(i);
    tiles+=`<g transform="translate(${x} ${y})"><rect y="4" width="58" height="58" rx="11" fill="${open?'#c2c6a0':'#92aa7b'}"/><rect width="58" height="57" rx="11" fill="${open?'#f3efd6':'#bad09a'}"/>`;
    if(numbers[i])tiles+=`<text x="29" y="39" text-anchor="middle" font-size="30" font-weight="750" font-family="system-ui,sans-serif" fill="${numbers[i]===2?'#bf8e64':'#7e9b82'}">${numbers[i]}</text>`;
    else if(i===0||i===4)tiles+=flower(29,25,.43,'#e7c78b','#fff0b5');
    else if(i===10){tiles+='<path d="M24 40V13M18 44H36" stroke="#6f8963" stroke-width="3" stroke-linecap="round"/><path d="M26 14L44 21L26 29Z" fill="#dd977d"/>';}
    else if(!open)tiles+='<path d="M17 15H34" stroke="#d4e1b2" stroke-width="3" stroke-linecap="round"/>';
    tiles+='</g>';
  }
  return svg(`<rect width="600" height="360" fill="#e7ebd3"/><circle cx="300" cy="177" r="151" fill="#d9dfbc"/><ellipse cx="299" cy="325" rx="154" ry="15" fill="#c5cda9" opacity=".55"/><rect x="158" y="39" width="279" height="277" rx="25" fill="#9aac83"/><rect x="158" y="32" width="279" height="277" rx="25" fill="#aebe94"/>${tiles}<g transform="translate(107 206)"><path d="M-8 9L-7-13L1-24L9-13L10 9Z" fill="#dfaf7c"/><rect x="-15" y="6" width="32" height="43" rx="9" fill="#8dac8c"/><path d="M-6 16L6 39M6 16L-6 39" stroke="#729772" stroke-width="3" stroke-linecap="round"/></g><g transform="translate(485 166)"><path d="M-7 7V-28" stroke="#80966f" stroke-width="4" stroke-linecap="round"/><path d="M-5-27L19-18L-5-8Z" fill="#e4a18a"/><ellipse cx="-7" cy="15" rx="22" ry="7" fill="#c2cba2"/></g>${spark(105,97,11,'#fff4cf')}${spark(484,273,12,'#f8edc1')}<path d="M111 298q9-22 23-8-7 19-23 8M470 89q9-17 20-5-9 17-20 5" fill="#adbc91"/>`);
}
export {minesArt as art};

import './art.css';
import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function constellationArt(){
  const nodes=[[174,126],[253,76],[356,107],[426,201],[345,282],[235,257],[165,205]];
  let dots='';
  for(let i=0;i<nodes.length;i++){
    const[x,y]=nodes[i];
    dots+=`<g transform="translate(${x} ${y})"><circle r="21" fill="#4f506d"/><circle r="14" fill="${i<5?'#f1d58f':'#b8b6cc'}"/><circle cx="-4" cy="-5" r="4" fill="#fff4c8"/>${i===0?'<circle r="25" fill="none" stroke="#cbb77e" stroke-width="2" stroke-dasharray="3 5"/>':''}</g>`;
  }
  return svg(`<rect width="600" height="360" fill="#303950"/><circle cx="301" cy="179" r="151" fill="#39445d"/><circle cx="301" cy="179" r="126" fill="none" stroke="#515e76" stroke-width="1.5" stroke-dasharray="3 8"/><path d="M174 126L253 76L356 107L426 201L345 282L235 257L165 205L174 126M174 126L345 282M253 76L235 257" fill="none" stroke="#67728a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M174 126L253 76L356 107L426 201L345 282L174 126" fill="none" stroke="#e7c983" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}<g transform="translate(469 67)"><circle r="22" fill="#ead59a"/><circle cx="10" cy="-7" r="21" fill="#303950"/></g><g transform="translate(361 300) rotate(-31)"><path d="M-21-5L20-5L35 7L20 19L-21 19Z" fill="#b4c6d3"/><rect x="-27" y="-5" width="14" height="24" rx="5" fill="#83a6b6"/><path d="M20-5L35 7L20 19Z" fill="#fff3d5"/><path d="M30 2L35 7L30 12Z" fill="#d4b875"/><path d="M-10 0H15" stroke="#dce8df" stroke-width="3" stroke-linecap="round"/></g>${spark(111,84,9,'#a3b6c5')}${spark(482,252,12,'#d4c99f')}${spark(99,247,8,'#b8b1cd')}<circle cx="101" cy="168" r="3" fill="#92a7ba"/><circle cx="488" cy="160" r="3" fill="#92a7ba"/><circle cx="389" cy="48" r="2.5" fill="#b8bdc7"/><circle cx="278" cy="320" r="3" fill="#889db3"/>`);
}
export {constellationArt as art};

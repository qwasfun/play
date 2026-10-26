import {svg,spark,cloud,envelope,flower} from '@playground/game-sdk/art';
function lightsArt() {
  let lamps='';
  for(let y=0;y<4;y++)for(let x=0;x<4;x++) {
    const lit=[0,2,5,6,8,9,11,14].includes(y*4+x);
    lamps+=`<g transform="translate(${201+x*56} ${92+y*56})"><rect x="-21" y="-21" width="43" height="43" rx="12" fill="${lit?'#ffe29a':'#8174a2'}"/><circle cy="-2" r="10" fill="${lit?'#fff9d8':'#a69bbd'}"/><path d="M-5 10H5M-4 14H4" stroke="${lit?'#bf944b':'#6a5b89'}" stroke-width="3" stroke-linecap="round"/></g>`;
  }
  return svg(`<rect width="600" height="360" fill="#e8e1f0"/><circle cx="488" cy="80" r="75" fill="#ded2e9"/><circle cx="103" cy="286" r="72" fill="#ded2e9"/><ellipse cx="301" cy="304" rx="162" ry="21" fill="#cec2dd"/><g transform="rotate(-7 300 174)"><rect x="159" y="54" width="262" height="258" rx="32" fill="#695c83"/><rect x="159" y="40" width="262" height="258" rx="32" fill="#9b8bb2"/><rect x="174" y="55" width="232" height="227" rx="21" fill="#796991"/>${lamps}</g>${spark(109,117,16,'#b7a6c9')}${spark(471,249,21,'#c7b8d5')}${spark(438,53,9,'#f5d681')}<circle cx="107" cy="190" r="6" fill="#b7a6c9"/><circle cx="499" cy="184" r="5" fill="#b7a6c9"/><path d="M79 251l-10 6m14 5-5 10M469 123l14-5m-12 17 13 4" stroke="#b3a1c4" stroke-width="4" stroke-linecap="round"/>`);
}
export {lightsArt as art};

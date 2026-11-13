import './art.css';
import { svg, spark, flower } from '@playground/game-sdk/art';
function pipesArt() {
  let tiles = '';
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      tiles += `<rect x="${166 + x * 68}" y="${46 + y * 68}" width="62" height="62" rx="12" fill="#f7f5e7" stroke="#dbe6de" stroke-width="1.5"/>`;
  const route = 'M143 77H197V145H333V213H401V263';
  return svg(
    `<rect width="600" height="360" fill="#dfebed"/><circle cx="300" cy="176" r="151" fill="#d2e1e1"/><rect x="153" y="34" width="292" height="292" rx="25" fill="#bccfd0"/>${tiles}<g fill="none" stroke="#c6d5cd" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path d="M265 50V76H291M333 50V76H359M401 50V104M169 213H197V187M265 187V213H291M169 281H225M265 254V281H291M333 254V309"/></g><path d="${route}" fill="none" stroke="#85aeb8" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="${route}" fill="none" stroke="#b9e0e6" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M153 77H184M197 96V124M218 145H248M284 145H312M333 164V192M354 213H378" fill="none" stroke="#e7f4ed" stroke-width="3" stroke-linecap="round"/><g fill="#83a9b1"><rect x="184" y="110" width="26" height="8" rx="3"/><rect x="296" y="132" width="8" height="26" rx="3"/><rect x="320" y="179" width="26" height="8" rx="3"/><rect x="364" y="200" width="8" height="26" rx="3"/></g><g transform="translate(142 76)"><path d="M-14 2V-12H7" fill="none" stroke="#739b9f" stroke-width="12" stroke-linecap="round"/><path d="M-14-23v10m-8-10h16" stroke="#517f83" stroke-width="4" stroke-linecap="round"/><path d="M12-14V8" stroke="#a4bdb7" stroke-width="7" stroke-linecap="round"/></g><path d="M265 100a23 23 0 0 1 23 23m0-9 0 9-9-2" fill="none" stroke="#c7ae79" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(400 288)"><path d="M-19 6L-14 29H14L19 6Z" fill="#e2aa8c"/><rect x="-21" y="1" width="42" height="9" rx="4" fill="#efc1a2"/>${flower(0, -20, 0.58, '#e99d8c', '#f3ce7a')}</g><path d="M401 257v9" stroke="#a8d7df" stroke-width="5" stroke-linecap="round"/>${spark(111, 235, 10, '#f0db9e')}${spark(486, 111, 11, '#f5ecd0')}<circle cx="474" cy="271" r="4" fill="#b5ccca"/>`,
  );
}
export { pipesArt as art };

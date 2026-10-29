import './art.css';
import { svg, spark, flower } from '@playground/game-sdk/art';
function pairsArt() {
  const front = (x, y, angle, petal) =>
    `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-47" y="-58" width="94" height="116" rx="14" fill="#bbc99b"/><rect x="-47" y="-63" width="94" height="116" rx="14" fill="#fff9e7"/><rect x="-38" y="-54" width="76" height="98" rx="9" fill="none" stroke="#e8e8cf" stroke-width="1.5"/>${flower(0, -5, 0.87, petal)}<circle cx="-29" cy="-44" r="3" fill="#d7dfbc"/><circle cx="29" cy="33" r="3" fill="#d7dfbc"/></g>`;
  const back = (x, y, angle) =>
    `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-47" y="-58" width="94" height="116" rx="14" fill="#a3b686"/><rect x="-47" y="-63" width="94" height="116" rx="14" fill="#c6d69f"/><rect x="-38" y="-54" width="76" height="98" rx="9" fill="none" stroke="#dce6bf" stroke-width="2"/><path d="M-15-4Q0-25 15-4Q0 20-15-4Z" fill="#a7bd84"/><path d="M0-21Q22-4 0 12Q-22-4 0-21Z" fill="#a7bd84"/><circle cy="-4" r="5" fill="#e9edcc"/></g>`;
  return svg(
    `<rect width="600" height="360" fill="#e1e8ca"/><circle cx="299" cy="176" r="139" fill="#d4dfb8"/><ellipse cx="300" cy="317" rx="142" ry="16" fill="#bccca3" opacity=".45"/>${back(370, 114, 9)}${back(231, 248, -6)}${front(234, 114, -10, '#e99d89')}${front(370, 248, 9, '#e99d89')}<path d="M290 112Q313 88 334 105M292 239Q314 264 338 249" fill="none" stroke="#a9bc8b" stroke-width="2" stroke-dasharray="4 6"/>${spark(132, 119, 12, '#f8f4d4')}${spark(471, 248, 13, '#f8f4d4')}<path d="M116 261q12-22 25-5-12 19-25 5M463 91q10-20 22-5-10 16-22 5" fill="#b5c798"/><circle cx="458" cy="161" r="4" fill="#aabe8c"/><circle cx="154" cy="209" r="3" fill="#aabe8c"/>`,
  );
}
export { pairsArt as art };

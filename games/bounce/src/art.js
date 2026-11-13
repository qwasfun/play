import './art.css';
import { svg, spark } from '@playground/game-sdk/art';
function bounceArt() {
  let bricks = '';
  const colors = ['#a4d5bf', '#dce7af', '#efc786'];
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 4; x++) {
      if (y === 2 && x === 2) continue;
      const px = 176 + x * 64,
        py = 65 + y * 40;
      bricks += `<rect x="${px}" y="${py + 4}" width="56" height="29" rx="9" fill="#23465b"/><rect x="${px}" y="${py}" width="56" height="29" rx="9" fill="${colors[y]}"/><path d="M${px + 10} ${py + 7}h30" stroke="#fffdf1" stroke-width="3" opacity=".35" stroke-linecap="round"/>`;
    }
  return svg(
    `<rect width="600" height="360" fill="#243e55"/><circle cx="313" cy="173" r="152" fill="#29485e"/><path d="M139 42V309M460 42V309" stroke="#3a596c" stroke-width="2" stroke-dasharray="4 10"/>${bricks}<path d="M286 271L350 211L307 174" fill="none" stroke="#86afba" stroke-width="2" stroke-dasharray="5 8"/><circle cx="350" cy="211" r="16" fill="#baded9"/><circle cx="345" cy="206" r="5" fill="#f6f8df"/><path d="M359 189l5-10m4 18 10-4" stroke="#c7dfcb" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-5 296 288)"><rect x="236" y="282" width="120" height="24" rx="12" fill="#172f45"/><rect x="236" y="276" width="120" height="24" rx="12" fill="#a9d6c3"/><path d="M251 283h54" stroke="#d9edda" stroke-width="3" stroke-linecap="round"/><rect x="307" y="276" width="23" height="24" fill="#80bba7"/></g>${spark(113, 107, 9, '#eecb83')}${spark(478, 247, 10, '#a6c8c6')}<circle cx="494" cy="79" r="3" fill="#6f8f9b"/><circle cx="117" cy="277" r="3" fill="#7698a2"/><path d="M99 197h14m-7-7v14M485 154h11m-6-5v10" stroke="#56778a" stroke-width="2" stroke-linecap="round"/><rect x="275" y="326" width="47" height="3" rx="1.5" fill="#4c6c7d"/>`,
  );
}
export { bounceArt as art };

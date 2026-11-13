import './art.css';
import { svg, spark, flower } from '@playground/game-sdk/art';
function boxesArt() {
  let floor = '';
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 6; x++)
      floor += `<rect x="${151 + x * 49}" y="${54 + y * 49}" width="46" height="46" rx="6" fill="${(x + y) % 2 ? '#f7e6d5' : '#f2decd'}"/>`;
  const hedge = (x, y) =>
    `<g><rect x="${x}" y="${y + 5}" width="46" height="46" rx="9" fill="#839d77"/><rect x="${x}" y="${y}" width="46" height="43" rx="9" fill="#acc192"/><path d="M${x + 10} ${y + 11}h20" stroke="#c9d7ae" stroke-width="3" stroke-linecap="round"/></g>`;
  const box = (x, y) =>
    `<g transform="translate(${x} ${y})"><rect x="-20" y="-17" width="40" height="40" rx="6" fill="#ad7f55"/><rect x="-20" y="-22" width="40" height="40" rx="6" fill="#d9a775"/><rect x="-14" y="-16" width="28" height="28" rx="2" fill="none" stroke="#b98a5c" stroke-width="3"/><path d="M-12-14L12 10M12-14L-12 10" stroke="#b98a5c" stroke-width="4" stroke-linecap="round"/></g>`;
  return svg(
    `<rect width="600" height="360" fill="#efdad4"/><circle cx="300" cy="177" r="151" fill="#e8cec6"/><ellipse cx="299" cy="326" rx="157" ry="15" fill="#d5bab0" opacity=".45"/><rect x="140" y="43" width="316" height="271" rx="23" fill="#d6b6a3"/>${floor}${hedge(151, 54)}${hedge(200, 54)}${hedge(396, 54)}${hedge(151, 103)}${hedge(396, 152)}${hedge(151, 250)}${hedge(200, 250)}${hedge(396, 250)}<g transform="translate(370 224)"><rect x="-22" y="-24" width="44" height="44" rx="8" fill="#d3dbad"/><path d="M-13-15l26 26m-26 0 26-26" stroke="#adc18b" stroke-width="2"/>${flower(0, -5, 0.46, '#e8aa94', '#f4d47d')}</g><g transform="translate(321 126)"><rect x="-22" y="-24" width="44" height="44" rx="8" fill="#d3dbad"/>${flower(0, -5, 0.46, '#e8aa94', '#f4d47d')}</g>${box(272, 224)}${box(321, 175)}<path d="M307 222h26m-7-7 7 7-7 7" fill="none" stroke="#c9ac8c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(222 181)"><ellipse cy="28" rx="16" ry="5" fill="#d5c0a7"/><rect x="-11" y="1" width="22" height="25" rx="7" fill="#82a58b"/><circle cy="-8" r="16" fill="#efc37e"/><ellipse cy="-14" rx="21" ry="6" fill="#c69558"/><path d="M-14-15v-7q14-10 28 0v7" fill="#dfb56c"/><circle cx="-5" cy="-6" r="1.9" fill="#715b42"/><circle cx="5" cy="-6" r="1.9" fill="#715b42"/></g>${spark(103, 140, 11, '#fff0ce')}${spark(488, 231, 12, '#f6edcf')}<path d="M474 100q8-16 18-4-8 14-18 4" fill="#b9bd92"/>`,
  );
}
export { boxesArt as art };

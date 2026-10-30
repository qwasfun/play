import './art.css';
import { svg, spark } from '@playground/game-sdk/art';
function slideArt() {
  const x = 168,
    y = 43,
    size = 83,
    gap = 7;
  const pieces = [
    '<path d="M42 75L83 34V83H42Z" fill="#e4a17c"/><path d="M42 75L83 34" stroke="#ad7860" stroke-width="6" stroke-linejoin="round"/>',
    '<path d="M0 34L42 0L83 34V83H0Z" fill="#e4a17c"/><path d="M0 34L42 0L83 34" fill="none" stroke="#ad7860" stroke-width="6" stroke-linejoin="round"/><rect x="53" y="12" width="12" height="15" rx="2" fill="#ad7860"/>',
    '<path d="M0 34L41 75V83H0Z" fill="#e4a17c"/><path d="M0 34L41 75" stroke="#ad7860" stroke-width="6" stroke-linejoin="round"/>',
    '<path d="M42 0H83V83H42Z" fill="#f5dfaf"/><path d="M42 0V83" stroke="#bd9e6c" stroke-width="4"/><path d="M55 29H83V58H55Z" fill="#a6c8c3"/><path d="M69 29V58M55 43H83" stroke="#fdf3d6" stroke-width="3"/>',
    '<rect width="83" height="83" fill="#f5dfaf"/><path d="M23 83V37Q42 17 61 37V83" fill="#95ac91"/><circle cx="53" cy="65" r="3" fill="#f8e6b1"/>',
    '<path d="M0 0H41V83H0Z" fill="#f5dfaf"/><path d="M41 0V83" stroke="#bd9e6c" stroke-width="4"/><path d="M0 29H28V58H0Z" fill="#a6c8c3"/><path d="M14 29V58M0 43H28" stroke="#fdf3d6" stroke-width="3"/>',
    '<path d="M42 0H83V25H42Z" fill="#f5dfaf"/><path d="M42 25H83" stroke="#bd9e6c" stroke-width="4"/><path d="M0 42Q42 23 83 42V83H0Z" fill="#acc18e"/><path d="M36 57v-20m-9 10 9 5 10-10" stroke="#74946a" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="32" r="8" fill="#e9b78b"/>',
    '<path d="M0 0H83V25H0Z" fill="#f5dfaf"/><path d="M0 25H83" stroke="#bd9e6c" stroke-width="4"/><path d="M0 42Q42 23 83 42V83H0Z" fill="#acc18e"/><path d="M23 0H61L67 83H17Z" fill="#d6c49c"/><path d="M29 42H56M27 61H58" stroke="#f0deba" stroke-width="3" stroke-linecap="round"/>',
  ];
  let tiles = '';
  for (let i = 0; i < 9; i++) {
    const tx = x + (i % 3) * (size + gap),
      ty = y + Math.floor(i / 3) * (size + gap);
    if (i === 8) {
      tiles += `<rect x="${tx}" y="${ty}" width="83" height="83" rx="11" fill="#e1cfaa"/><path d="M${tx + 25} ${ty + 41}h32m-10-10 10 10-10 10" fill="none" stroke="#c2a875" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      continue;
    }
    tiles += `<g transform="translate(${tx} ${ty})"><rect y="4" width="83" height="83" rx="11" fill="#c4ab80"/><rect width="83" height="83" rx="11" fill="#fff1d0"/><g>${pieces[i]}</g><rect x="6" y="6" width="19" height="19" rx="6" fill="#fff6df" opacity=".9"/><text x="15.5" y="19.5" text-anchor="middle" font-size="12" font-weight="750" font-family="system-ui,sans-serif" fill="#a58a60">${i + 1}</text></g>`;
  }
  return svg(
    `<rect width="600" height="360" fill="#f4e8c9"/><circle cx="300" cy="179" r="151" fill="#ebdbb5"/><ellipse cx="300" cy="330" rx="155" ry="14" fill="#dac69c" opacity=".5"/><rect x="154" y="33" width="291" height="289" rx="26" fill="#c5ad83"/><rect x="154" y="28" width="291" height="289" rx="26" fill="#d6bf93"/>${tiles}${spark(112, 112, 13, '#fff7dc')}${spark(487, 259, 11, '#fff7dc')}<path d="M479 92l13 3m-16 8 10 9M116 251l-10 10m20-2-5 14" stroke="#d4b98a" stroke-width="3" stroke-linecap="round"/>`,
  );
}
export { slideArt as art };

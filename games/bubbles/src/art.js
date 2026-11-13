import './art.css';
import { svg, spark } from '@playground/game-sdk/art';
function bubblesArt() {
  const colors = ['#e99b88', '#efcd7e', '#9cbf94', '#a7cad8'];
  const bubbles = [
    [207, 113, 37, 0],
    [287, 103, 40, 0],
    [371, 113, 37, 1],
    [166, 189, 35, 2],
    [245, 186, 40, 0],
    [331, 187, 39, 1],
    [411, 189, 35, 1],
    [204, 263, 36, 2],
    [286, 269, 40, 3],
    [371, 263, 36, 3],
  ];
  const marks = [
    `<path d="M-12 0L0-12L12 0L0 12Z" fill="#fff5df"/>`,
    `<path d="M0-14L4-5L14-4L7 3L9 13L0 8L-9 13L-7 3L-14-4L-4-5Z" fill="#fff8de"/>`,
    `<path d="M-13 1Q-13-12 0-9Q13-12 13 1Q10 13 0 15Q-10 13-13 1Z" fill="#eef5d7"/>`,
    `<circle r="11" fill="none" stroke="#f7f7df" stroke-width="6"/>`,
  ];
  let circles = '';
  for (const [x, y, r, color] of bubbles)
    circles += `<g transform="translate(${x} ${y})"><circle cy="5" r="${r}" fill="${['#bc786b', '#c4a563', '#789d77', '#7ea7b7'][color]}"/><circle r="${r}" fill="${colors[color]}"/><path d="M${-r * 0.61} ${-r * 0.24}Q${-r * 0.5} ${-r * 0.65} ${-r * 0.1} ${-r * 0.69}" fill="none" stroke="#fff8e9" stroke-width="4" stroke-linecap="round" opacity=".8"/>${marks[color]}</g>`;
  return svg(
    `<rect width="600" height="360" fill="#d9e9e3"/><circle cx="290" cy="181" r="151" fill="#c7ddd5"/><ellipse cx="289" cy="325" rx="151" ry="13" fill="#b4cfc3" opacity=".55"/>${circles}<circle cx="443" cy="90" r="11" fill="none" stroke="#9dc3b3" stroke-width="3"/><circle cx="133" cy="277" r="8" fill="none" stroke="#9dc3b3" stroke-width="3"/><path d="M440 231l13-1m-10 11 10 7M135 119l-12-5m9 16-13 3" stroke="#94b9a8" stroke-width="3" stroke-linecap="round"/>${spark(448, 273, 12, '#f6e3a1')}${spark(130, 75, 10, '#f7eed2')}<path d="M236 49q-7-12 0-19m12 22 4-15" fill="none" stroke="#aecab8" stroke-width="3" stroke-linecap="round"/>`,
  );
}
export { bubblesArt as art };

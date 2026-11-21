import { cloud, svg } from '@playground/game-sdk/art';

const basket = (x, leaf, lifted = false) => {
  const y = lifted ? 181 : 212;
  const colors = ['#7da37c', '#8ead82', '#759b78', '#98b586'];
  return `<g transform="translate(${x} ${y})"><path d="M-48 12Q0-20 48 12L36 62Q0 79-36 62Z" fill="#c99a64" stroke="#6c765d" stroke-width="4"/><path d="M-38 21Q0 2 38 21M-34 37Q0 21 34 37M-29 52Q0 40 29 52" fill="none" stroke="#f1d7a2" stroke-width="5" opacity=".85"/><ellipse cy="5" rx="51" ry="20" fill="${colors[leaf]}" stroke="#5f795f" stroke-width="4"/><path d="M0 4Q-1-18 18-31" fill="none" stroke="#58705a" stroke-width="4" stroke-linecap="round"/></g>`;
};

const acorn = (x, y) =>
  `<g transform="translate(${x} ${y})"><ellipse cy="8" rx="18" ry="23" fill="#d99857" stroke="#6b5e4e" stroke-width="4"/><path d="M-19 0Q0-15 19 0L15 8Q0 1-15 8Z" fill="#8c6a4e"/><path d="M1-10q4-12 13-15" fill="none" stroke="#6b5e4e" stroke-width="4" stroke-linecap="round"/><circle cy="7" r="30" fill="#f7d879" opacity=".2"/></g>`;

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f4ede1"/>${cloud(46, 48, 0.4)}${cloud(468, 57, 0.34)}<circle cx="521" cy="54" r="28" fill="#ead287"/><path d="M0 239Q124 192 250 232t350-26v154H0Z" fill="#c7d9bd"/><path d="M0 291Q135 247 289 280t311-20v100H0Z" fill="#9dbb94"/><path d="M145 146C201 95 252 97 299 142M301 142c49-46 101-45 154 5" fill="none" stroke="#e1b86e" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 10"/><path d="M286 128l13 14-17 9M442 134l13 13-16 10" fill="none" stroke="#a87656" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${acorn(150, 242)}${basket(150, 0, true)}${basket(300, 2)}${basket(450, 1)}<text x="300" y="338" fill="#566c58" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">盯住叶篮，找到藏好的金色橡果</text>`,
  );

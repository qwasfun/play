import { cloud, svg } from '@playground/game-sdk/art';

const moth = (x, y) =>
  `<g transform="translate(${x} ${y})"><path d="M0 2C-20-28-55-28-62 3c18 3 31 14 42 31 6-8 12-18 20-32Z" fill="#f2c96f" stroke="#665d69" stroke-width="4"/><path d="M0 2c20-30 55-30 62 1-18 3-31 14-42 31C14 26 8 16 0 2Z" fill="#eeb57c" stroke="#665d69" stroke-width="4"/><ellipse cy="7" rx="8" ry="26" fill="#746478"/><path d="M-3-15q-6-15-18-19M3-15q6-15 18-19" fill="none" stroke="#665d69" stroke-width="3" stroke-linecap="round"/></g>`;

const light = (x, y) =>
  `<g transform="translate(${x} ${y})"><circle r="34" fill="#f8d86d" opacity=".2"/><circle r="23" fill="#f7ce62" stroke="#8c7761" stroke-width="4"/><path d="M0-14C13-6 14 8 0 16-14 8-13-6 0-14Z" fill="#fff4b4"/><circle r="5" fill="#f5a85e"/></g>`;

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#eee8e7"/>${cloud(42, 50, 0.34)}${cloud(458, 62, 0.28)}<circle cx="511" cy="52" r="30" fill="#e7cf86"/><path d="M0 118Q132 86 265 120t335-5v245H0Z" fill="#c5d7c4"/><path d="M0 176Q135 139 290 174t310-16" fill="none" stroke="#f7ead1" stroke-width="38" opacity=".78"/><path d="M0 253Q135 216 290 251t310-16" fill="none" stroke="#f7ead1" stroke-width="38" opacity=".78"/><path d="M0 329Q135 292 290 327t310-16" fill="none" stroke="#f7ead1" stroke-width="38" opacity=".78"/>${moth(142, 253)}${light(454, 177)}<path d="M492 239q32-31 65 0-32 31-65 0ZM492 315q32-31 65 0-32 31-65 0Z" fill="#9da9b1" opacity=".65"/><text x="300" y="344" fill="#59675e" font-family="system-ui,sans-serif" font-size="19" text-anchor="middle">换到亮灯花径，陪月蛾穿过晚风</text>`,
  );

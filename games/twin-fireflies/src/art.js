import { cloud, svg } from '@playground/game-sdk/art';

const flower = (x, y, color) =>
  `<g transform="translate(${x} ${y})" fill="${color}">${Array.from(
    { length: 6 },
    (_, index) => `<ellipse transform="rotate(${index * 60})" cy="-22" rx="9" ry="17"/>`,
  ).join('')}<circle r="11" fill="#f5d887"/></g>`;

const firefly = (x, y, color) =>
  `<g transform="translate(${x} ${y})"><circle r="25" fill="#fff1a8" opacity=".3"/><ellipse rx="11" ry="17" fill="${color}" stroke="#587062" stroke-width="3"/><ellipse cx="-10" cy="-2" rx="10" ry="6" fill="#f7f0d8" opacity=".85"/><ellipse cx="10" cy="-2" rx="10" ry="6" fill="#f7f0d8" opacity=".85"/><circle cy="9" r="5" fill="#ffe66f"/></g>`;

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3ecdf"/>${cloud(58, 42, 0.48)}${cloud(474, 66, 0.38)}<circle cx="517" cy="53" r="29" fill="#eed384"/><path d="M0 251Q116 207 235 243t365-30v147H0Z" fill="#bed4bd"/><path d="M0 294Q136 251 287 286t313-23v97H0Z" fill="#95b49a"/><path d="M300 58v238" stroke="#fff8d8" stroke-width="3" stroke-dasharray="7 12" opacity=".75"/>${flower(207, 129, '#d98a84')}${flower(393, 129, '#cb8da1')}<path d="M207 165v45M393 165v45" stroke="#739277" stroke-width="7" stroke-linecap="round"/>${firefly(226, 260, '#d99a62')}${firefly(374, 260, '#c78372')}<path d="M255 301h90" stroke="#f2d27b" stroke-width="6" stroke-linecap="round"/><path d="M278 290l-17 11 17 11M322 290l17 11-17 11" fill="none" stroke="#687b67" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="300" y="340" fill="#526b5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">收拢或展开，一起穿过双花门</text>`,
  );

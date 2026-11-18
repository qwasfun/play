import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3ecdf"/>${cloud(70, 54, 0.58)}<circle cx="522" cy="62" r="34" fill="#f2cf7a"/><path d="M0 244Q126 190 286 218t314-26v168H0Z" fill="#b7cfb4"/><path d="M0 250Q118 218 228 254t188-4q94-36 184-6v116H0Z" fill="#9bc5c1"/><g fill="none" stroke="#f3dfad" stroke-width="8" stroke-linecap="round"><path d="M150 104h130"/><path d="M150 112h130"/><path d="M280 112v98"/><path d="M288 112v98"/><path d="M288 210h148"/></g><g fill="#f7ead0" stroke="#6f8d7c" stroke-width="5">${[
      [146, 108, 3],
      [284, 108, 4],
      [284, 214, 4],
      [440, 214, 2],
    ]
      .map(
        ([x, y, value]) =>
          `<circle cx="${x}" cy="${y}" r="28"/><text x="${x}" y="${y + 7}" fill="#45675c" stroke="none" font-family="system-ui,sans-serif" font-weight="700" font-size="22" text-anchor="middle">${value}</text>`,
      )
      .join(
        '',
      )}</g><g fill="#e6a58c"><circle cx="100" cy="278" r="8"/><circle cx="476" cy="286" r="10"/><circle cx="518" cy="258" r="7"/></g><text x="300" y="342" fill="#526d5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">数一数小桥，让每块溪石都相连</text>`,
  );

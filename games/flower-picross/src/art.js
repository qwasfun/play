import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3ecdf"/>${cloud(72, 54, 0.62)}<circle cx="519" cy="67" r="35" fill="#efd184"/><path d="M0 230Q128 177 278 213t322-17v164H0Z" fill="#bfd2bd"/><rect x="141" y="55" width="318" height="274" rx="26" fill="#a67e5b"/><rect x="160" y="74" width="280" height="236" rx="18" fill="#fff8e8"/><g stroke="#d6c5a7" stroke-width="4">${Array.from({ length: 6 }, (_, index) => `<path d="M${160 + index * 56} 74v236"/><path d="M160 ${74 + index * 47.2}h280"/>`).join('')}</g><g fill="#d98278" stroke="#fff5df" stroke-width="2">${[
      [2, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [2, 3],
      [1, 4],
      [2, 4],
      [3, 4],
    ]
      .map(
        ([column, row]) =>
          `<g transform="translate(${188 + column * 56} ${97.6 + row * 47.2})"><ellipse rx="9" ry="18"/><ellipse rx="18" ry="9"/><circle r="6" fill="#efd074"/></g>`,
      )
      .join(
        '',
      )}</g><text x="300" y="349" fill="#526d5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">读数字提示，把花瓣点进木窗</text>`,
  );

import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3ecdf"/>${cloud(74, 49, 0.6)}<circle cx="521" cy="64" r="34" fill="#efd184"/><path d="M0 215Q122 164 278 199t322-13v174H0Z" fill="#bed2bd"/><ellipse cx="300" cy="229" rx="235" ry="111" fill="#acd2d2"/><ellipse cx="300" cy="229" rx="208" ry="88" fill="#c6e0dc"/><g fill="#79a386" stroke="#f6f0d5" stroke-width="4">${[
      [300, 125],
      [425, 229],
      [300, 333],
      [175, 229],
    ]
      .map(
        ([x, y], index) =>
          `<path d="M${x} ${y}m-48 0a48 31 0 1 0 96 0a48 31 0 0 0-96 0l48 0l${index % 2 ? 28 : -28}-${index % 2 ? 20 : -20}Z"/>`,
      )
      .join(
        '',
      )}</g><g transform="translate(300 229)"><path d="M0-25C19-3 22 8 22 19a22 22 0 1 1-44 0C-22 8-19-3 0-25Z" fill="#b9e3e7" stroke="#527b7d" stroke-width="4"/><circle cx="-7" cy="11" r="3" fill="#fff" opacity=".85"/></g><g transform="translate(425 229)" fill="#d98578">${Array.from({ length: 5 }, (_, index) => `<ellipse transform="rotate(${index * 72})" cy="-17" rx="8" ry="15"/>`).join('')}<circle r="10" fill="#ffe39a"/></g><path d="M318 229Q363 186 407 219" fill="none" stroke="#fff6d5" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 10"/><text x="300" y="346" fill="#526d5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">看清花蕊，向四方轻轻一跳</text>`,
  );

import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3ecdf"/>${cloud(76, 58, 0.58)}<circle cx="518" cy="64" r="36" fill="#f3cf78"/><path d="M0 250Q128 194 290 222t310-26v164H0Z" fill="#b8d1bb"/><g transform="translate(131 36)"><rect width="338" height="286" rx="32" fill="#8aa58d"/><rect x="16" y="16" width="306" height="254" rx="24" fill="#e9e3c8"/><g stroke="#c4b995" stroke-width="3">${Array.from({ length: 6 }, (_, index) => `<path d="M28 ${28 + index * 45}h282"/><path d="M${28 + index * 56.4} 28v225"/>`).join('')}</g><path d="M0 96h84l56 90h112l54-130h32" fill="none" stroke="#ffe7a1" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><g stroke="#607a70" stroke-width="9" stroke-linecap="round"><path d="M196 74l34 34"/><path d="M120 168l34-34"/><path d="M244 208l34-34"/></g><g fill="#d77f76">${[
      [84, 96],
      [140, 186],
      [252, 186],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="13"/><circle cx="${x - 13}" cy="${y}" r="8"/><circle cx="${x + 13}" cy="${y}" r="8"/>`,
      )
      .join(
        '',
      )}</g></g><text x="300" y="348" fill="#526d5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">转一转花镜，把晨光送到每朵花</text>`,
  );

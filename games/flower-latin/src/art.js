import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f4eddf"/>${cloud(74, 54, 0.6)}<circle cx="520" cy="68" r="35" fill="#efd080"/><path d="M0 235Q130 185 282 216t318-18v162H0Z" fill="#bfd1bd"/><g transform="translate(137 40) rotate(-2 163 137)"><rect width="326" height="276" rx="28" fill="#b88d66"/><rect x="15" y="15" width="296" height="246" rx="20" fill="#fff8e8"/><g stroke="#d7c5a7" stroke-width="4">${Array.from({ length: 5 }, (_, index) => `<path d="M35 ${35 + index * 48}h256"/><path d="M${35 + index * 64} 35v192"/>`).join('')}</g><g font-family="system-ui,sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#607260">${[1, 4, 2, 3, 3, 2, 4, 1, 4, 1, 3, 2, 2, 3, 1, 4].map((value, index) => `<g transform="translate(${67 + (index % 4) * 64} ${68 + Math.floor(index / 4) * 48})"><circle r="17" fill="${index % 3 === 0 ? '#efd08a' : '#e4b3a5'}" opacity=".7"/><text y="10">${value}</text></g>`).join('')}</g></g><text x="300" y="348" fill="#526d5b" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">每行每列，让四枚花序各就各位</text>`,
  );

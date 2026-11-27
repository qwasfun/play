import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f4eadb"/>${cloud(95, 54, 0.5)}<circle cx="510" cy="61" r="28" fill="#efc66d"/><path d="M0 284Q126 236 276 265t324-18v113H0Z" fill="#a8c6a0"/><path d="M258 333Q238 215 300 88q62 127 42 245Z" fill="#dce4bd" stroke="#8faa83" stroke-width="7"/><g transform="translate(300 111)"><circle r="48" fill="#fff7df" stroke="#d8908e" stroke-width="9"/><circle r="25" fill="#e9bd68"/><circle r="9" fill="#fff8dc"/></g><g transform="translate(300 302)"><path d="M-29 8Q-28-28 0-31 28-28 29 8 9 31 0 32-9 31-29 8Z" fill="#9a704d" stroke="#6e513d" stroke-width="5"/><path d="M-18-19Q0-37 18-19" fill="#76916c" stroke="#587353" stroke-width="5"/></g><path d="M300 272Q270 222 300 173" fill="none" stroke="#fff8dc" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 15"/><text x="300" y="342" fill="#655e55" font-family="system-ui,sans-serif" font-size="19" text-anchor="middle">轻轻一滑，让松果停在花心里</text>`,
  );

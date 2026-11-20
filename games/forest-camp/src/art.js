import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f3eadb"/>${cloud(92, 58, 0.5)}<circle cx="514" cy="62" r="32" fill="#efc875"/><path d="M0 218Q112 166 238 205t180-4q86-39 182 2v157H0Z" fill="#b7cfb2"/><path d="M0 260Q118 220 252 264t218-8q66-24 130-4v108H0Z" fill="#799b7d"/><g transform="translate(128 96)"><path d="M0 126 75 14l75 112Z" fill="#e7a878" stroke="#7f6753" stroke-width="7"/><path d="M75 14v112" stroke="#f8dfb4" stroke-width="6"/><path d="M75 126V72l38 54" fill="#f4cf99" stroke="#7f6753" stroke-width="5"/></g><g transform="translate(348 104)"><rect x="26" y="74" width="13" height="62" rx="5" fill="#765c43"/><circle cx="34" cy="62" r="48" fill="#73966f"/><circle cx="6" cy="74" r="31" fill="#88aa7c"/><circle cx="64" cy="78" r="34" fill="#8cae7f"/></g><g fill="#f6db83"><circle cx="84" cy="277" r="7"/><circle cx="303" cy="252" r="8"/><circle cx="514" cy="286" r="7"/></g><text x="300" y="337" fill="#526a57" font-family="system-ui,sans-serif" font-size="20" text-anchor="middle">数一数帐篷，给林间留出刚好的距离</text>`,
  );

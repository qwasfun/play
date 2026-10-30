import { svg } from '@playground/game-sdk/art';
export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#efe3cb"/><rect x="150" y="100" width="110" height="180" rx="22" fill="#fff9eb" stroke="#b98a61" stroke-width="6"/><rect x="330" y="60" width="130" height="220" rx="22" fill="#fff9eb" stroke="#b98a61" stroke-width="6"/><path d="M160 200h90v60h-90zM340 140h110v120H340z" fill="#9fc6b3"/><path d="M270 140h40m-15-15 15 15-15 15" fill="none" stroke="#849575" stroke-width="7"/>`,
  );

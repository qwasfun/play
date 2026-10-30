export const svg = (body, viewBox = '0 0 600 360') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
export const spark = (x, y, size = 12, fill = '#f8d975') =>
  `<path d="M${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y} Q${x} ${y} ${x} ${y - size}" fill="${fill}"/>`;
export const cloud = (x, y, s = 1, color = '#fffdf2') =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}"><path d="M0 25C-5 7 18-3 31 11C38-11 70-10 77 11C96 2 116 18 105 32H1Z"/></g>`;
export const envelope = (x, y, s = 1, rotate = -12) =>
  `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s})"><rect x="-46" y="-31" width="92" height="62" rx="10" fill="#ffdc82"/><path d="M-43-25L0 6L43-25M-44 26L-15 1M44 26L15 1" fill="none" stroke="#bc8b37" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="-12" r="7" fill="#ef947c"/></g>`;
export function flower(x, y, s = 1, petal = '#eaa18d', center = '#f6d275') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 9V34M0 30Q-25 12-27 27Q-14 39 0 34M0 23Q21 7 25 22Q14 32 0 28" fill="#96af7f" stroke="#96af7f" stroke-width="3" stroke-linecap="round"/><g fill="${petal}"><ellipse cy="-17" rx="10" ry="15"/><ellipse cx="17" cy="-4" rx="15" ry="10" transform="rotate(-18 17 -4)"/><ellipse cx="10" cy="14" rx="10" ry="15" transform="rotate(-28 10 14)"/><ellipse cx="-12" cy="13" rx="10" ry="15" transform="rotate(28 -12 13)"/><ellipse cx="-18" cy="-5" rx="15" ry="10" transform="rotate(18 -18 -5)"/></g><circle cy="-2" r="11" fill="${center}"/></g>`;
}

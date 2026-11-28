import { cloud, svg } from '@playground/game-sdk/art';

export const art = () =>
  svg(
    `<rect width="600" height="360" fill="#f4eadb"/>${cloud(92, 57, 0.5)}<circle cx="513" cy="59" r="27" fill="#efc66d"/><path d="M0 282Q126 235 270 267t330-19v112H0Z" fill="#a9c6a0"/><g transform="translate(154 73)"><rect width="292" height="232" rx="28" fill="#f8eed4" stroke="#789275" stroke-width="7"/><path d="M117 0v92H0m117 0h175M0 168h176m0-76v140" fill="none" stroke="#bf8f72" stroke-width="7"/><g fill="#e8b965" stroke="#fff8dc" stroke-width="3"><circle cx="55" cy="47" r="20"/><circle cx="198" cy="45" r="20"/><circle cx="63" cy="132" r="20"/><circle cx="235" cy="131" r="20"/><circle cx="93" cy="201" r="20"/></g><g fill="#705d51" font-family="system-ui,sans-serif" font-size="18" font-weight="700" text-anchor="middle"><text x="55" y="53">4</text><text x="198" y="51">6</text><text x="63" y="138">6</text><text x="235" y="137">6</text><text x="93" y="207">3</text></g></g><text x="300" y="338" fill="#655e55" font-family="system-ui,sans-serif" font-size="19" text-anchor="middle">一块一块，把花圃分得刚刚好</text>`,
  );

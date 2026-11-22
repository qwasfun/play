export const PETAL_FOLD = {
  size: 4,
  rounds: 6,
  score: 200,
  limit: 120,
};

export const FOLD_LABELS = {
  left: '左半向右折',
  right: '右半向左折',
  top: '上半向下折',
  bottom: '下半向上折',
};

function hashSeed(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function initialPaper(size = PETAL_FOLD.size) {
  return {
    width: size,
    height: size,
    cells: Array.from({ length: size * size }, (_, index) => [index]),
  };
}

export function foldPaper(paper, direction) {
  const { width, height, cells } = paper;
  if ((direction === 'left' || direction === 'right') && width % 2 !== 0)
    throw new Error('竖向折叠需要偶数列');
  if ((direction === 'top' || direction === 'bottom') && height % 2 !== 0)
    throw new Error('横向折叠需要偶数行');

  if (direction === 'left' || direction === 'right') {
    const nextWidth = width / 2;
    const next = [];
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < nextWidth; column++) {
        const keptColumn = direction === 'left' ? column + nextWidth : column;
        const foldedColumn = direction === 'left' ? nextWidth - 1 - column : width - 1 - column;
        next.push([...cells[row * width + keptColumn], ...cells[row * width + foldedColumn]]);
      }
    }
    return { width: nextWidth, height, cells: next };
  }

  if (direction === 'top' || direction === 'bottom') {
    const nextHeight = height / 2;
    const next = [];
    for (let row = 0; row < nextHeight; row++) {
      const keptRow = direction === 'top' ? row + nextHeight : row;
      const foldedRow = direction === 'top' ? nextHeight - 1 - row : height - 1 - row;
      for (let column = 0; column < width; column++) {
        next.push([...cells[keptRow * width + column], ...cells[foldedRow * width + column]]);
      }
    }
    return { width, height: nextHeight, cells: next };
  }

  throw new Error(`未知折叠方向：${direction}`);
}

export function unfoldPunch(operations, punch) {
  let paper = initialPaper();
  for (const direction of operations) paper = foldPaper(paper, direction);
  if (!Number.isInteger(punch) || punch < 0 || punch >= paper.cells.length)
    throw new Error('打孔位置超出折后花笺');
  return {
    width: paper.width,
    height: paper.height,
    solution: [...paper.cells[punch]].sort((a, b) => a - b),
  };
}

export function generateRounds(seed) {
  const next = random(seed);
  const vertical = next() < 0.5 ? ['left', 'right'] : ['right', 'left'];
  const horizontal = next() < 0.5 ? ['top', 'bottom'] : ['bottom', 'top'];
  const single = [...vertical, ...horizontal];
  const double = [
    [vertical[0], horizontal[0]],
    [horizontal[1], vertical[1]],
    [vertical[1], horizontal[0]],
    [horizontal[1], vertical[0]],
  ];
  const patterns = [
    [single[Math.floor(next() * single.length)]],
    [single[Math.floor(next() * single.length)]],
    ...double,
  ];

  return patterns.map((operations, index) => {
    let paper = initialPaper();
    for (const direction of operations) paper = foldPaper(paper, direction);
    const punch = (Math.floor(next() * paper.cells.length) + index) % paper.cells.length;
    return {
      operations,
      punch,
      width: paper.width,
      height: paper.height,
      solution: [...paper.cells[punch]].sort((a, b) => a - b),
    };
  });
}

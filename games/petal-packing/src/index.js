import { label, roundRect } from '@playground/game-sdk';
import { generatePuzzles, PETAL_PACKING, rotateCells } from './puzzles.js';

export { generatePuzzles, PETAL_PACKING, rotateCells } from './puzzles.js';

const BOARD_X = 54;
const BOARD_Y = 96;
const CELL = 56;
const TRAY_X = 370;
const TRAY_Y = 82;
const TRAY_W = 176;
const TRAY_H = 54;
const ROTATE = { x: 392, y: 370, width: 132, height: 44 };
const pieceNames = ['', '桃', '青', '桂', '紫', '露'];

const clonePlacement = (placement) => (placement ? { ...placement } : null);
const sameAction = (left, right) => left === right;

function boardCell(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const column = Math.floor((point.x - BOARD_X) / CELL);
  const row = Math.floor((point.y - BOARD_Y) / CELL);
  return row >= 0 && row < PETAL_PACKING.size && column >= 0 && column < PETAL_PACKING.size
    ? { row, column }
    : null;
}

function actionAt(point) {
  const cell = boardCell(point);
  if (cell) return `board:${cell.row}:${cell.column}`;
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return '';
  if (point.x >= TRAY_X && point.x <= TRAY_X + TRAY_W) {
    const index = Math.floor((point.y - TRAY_Y) / TRAY_H);
    if (index >= 0 && index < PETAL_PACKING.pieces) return `tray:${index}`;
  }
  if (
    point.x >= ROTATE.x &&
    point.x <= ROTATE.x + ROTATE.width &&
    point.y >= ROTATE.y &&
    point.y <= ROTATE.y + ROTATE.height
  )
    return 'rotate';
  return '';
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let steps = 0;
  let elapsed = 0;
  let finished = false;
  let won = false;
  let phase = 'play';
  let transition = 0;
  let puzzle;
  let placements;
  let rotations;
  let selected = 0;
  let trayCursor = 0;
  let boardCursor = { row: 0, column: 0 };
  let zone = 'tray';
  let pressed = '';
  let history = [];
  let message = '先选一枚花钿，再转到合适方向放进花匣';

  const pieceById = (id) => puzzle.pieces.find((piece) => piece.id === id);
  const cellsFor = (id, placement = placements[id]) => {
    if (!placement) return [];
    return rotateCells(pieceById(id).cells, placement.rotation).map(({ row, column }) => ({
      row: row + placement.row,
      column: column + placement.column,
    }));
  };
  const placedPieceAt = (cell) => {
    for (let id = 1; id <= PETAL_PACKING.pieces; id++)
      if (cellsFor(id).some(({ row, column }) => row === cell.row && column === cell.column))
        return id;
    return 0;
  };
  const occupiedKeys = (except = 0) => {
    const keys = new Set();
    for (let id = 1; id <= PETAL_PACKING.pieces; id++) {
      if (id === except) continue;
      for (const { row, column } of cellsFor(id)) keys.add(`${row}:${column}`);
    }
    return keys;
  };
  const canPlace = (id, row, column, rotation = rotations[id]) => {
    if (!id || !Number.isInteger(row) || !Number.isInteger(column)) return false;
    const occupied = occupiedKeys(id);
    return rotateCells(pieceById(id).cells, rotation).every((offset) => {
      const targetRow = row + offset.row;
      const targetColumn = column + offset.column;
      return (
        targetRow >= 0 &&
        targetRow < PETAL_PACKING.size &&
        targetColumn >= 0 &&
        targetColumn < PETAL_PACKING.size &&
        !occupied.has(`${targetRow}:${targetColumn}`)
      );
    });
  };

  function loadRound(index) {
    puzzle = puzzles[index];
    placements = Array.from({ length: PETAL_PACKING.pieces + 1 }, () => null);
    rotations = Array(PETAL_PACKING.pieces + 1).fill(0);
    for (const piece of puzzle.pieces) rotations[piece.id] = piece.initialRotation;
    selected = 0;
    trayCursor = 0;
    boardCursor = { row: 0, column: 0 };
    zone = 'tray';
    pressed = '';
    history = [];
  }

  loadRound(0);

  function snapshot() {
    return {
      placements: placements.map(clonePlacement),
      rotations: [...rotations],
      selected,
      trayCursor,
      boardCursor: { ...boardCursor },
      zone,
    };
  }

  function remember() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '这一匣还没有可撤销的摆放';
      return;
    }
    const state = history.pop();
    placements = state.placements.map(clonePlacement);
    rotations = [...state.rotations];
    selected = state.selected;
    trayCursor = state.trayCursor;
    boardCursor = { ...state.boardCursor };
    zone = state.zone;
    message = '已回退一步，计时和步数保留';
    sound('tap');
  }

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    selected = 0;
    pressed = '';
    onFinish({ score: rounds * 400, elapsed, won, rounds, steps });
  }

  function selectPiece(id) {
    const index = puzzle.pieces.findIndex((piece) => piece.id === id);
    if (index < 0) return;
    remember();
    const placement = placements[id];
    if (placement) {
      placements[id] = null;
      rotations[id] = placement.rotation;
      boardCursor = { row: placement.row, column: placement.column };
      steps++;
      message = `${pieceNames[id]}花钿已拾回，可以换个位置`;
    } else message = `${pieceNames[id]}花钿已拿起，回车或按钮可旋转`;
    selected = id;
    trayCursor = index;
    zone = 'board';
    sound('tap');
  }

  function rotateSelected() {
    if (!selected) {
      message = '先选一枚花钿，再来旋转';
      return;
    }
    remember();
    rotations[selected] = (rotations[selected] + 1) % 4;
    steps++;
    message = `${pieceNames[selected]}花钿轻轻转了四分之一圈`;
    sound('tap');
  }

  function completeIfReady() {
    if (placements.slice(1).some((placement) => !placement)) return;
    if (occupiedKeys().size !== PETAL_PACKING.size ** 2) return;
    rounds++;
    sound('win');
    history = [];
    if (rounds === PETAL_PACKING.rounds) {
      message = '三只花匣都铺得严丝合缝！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `第 ${rounds} 只花匣完成，下一匣马上打开`;
  }

  function placeSelected(cell) {
    if (!selected) {
      const id = placedPieceAt(cell);
      if (id) selectPiece(id);
      else message = '这里还是空的，先从右边选一枚花钿';
      return;
    }
    if (!canPlace(selected, cell.row, cell.column)) {
      message = '这里会越界或碰到别的花钿，再挪一格看看';
      sound('error');
      return;
    }
    remember();
    placements[selected] = {
      row: cell.row,
      column: cell.column,
      rotation: rotations[selected],
    };
    steps++;
    message = `${pieceNames[selected]}花钿稳稳放好了`;
    selected = 0;
    zone = 'tray';
    sound('collect');
    completeIfReady();
  }

  function perform(action) {
    if (!action) return;
    if (action === 'rotate') {
      rotateSelected();
      return;
    }
    if (action.startsWith('tray:')) {
      const index = Number(action.split(':')[1]);
      const piece = puzzle.pieces[index];
      if (piece) selectPiece(piece.id);
      return;
    }
    if (action.startsWith('board:')) {
      const [, row, column] = action.split(':').map(Number);
      boardCursor = { row, column };
      zone = 'board';
      placeSelected(boardCursor);
    }
  }

  function moveBoard(dr, dc) {
    boardCursor = {
      row: Math.max(0, Math.min(PETAL_PACKING.size - 1, boardCursor.row + dr)),
      column: Math.max(0, Math.min(PETAL_PACKING.size - 1, boardCursor.column + dc)),
    };
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, PETAL_PACKING.limit - elapsed);
      elapsed += step;
      if (phase === 'transition') {
        transition -= step;
        if (transition <= 0) {
          round = rounds;
          phase = 'play';
          loadRound(round);
          message = '新的花匣打开了，先看看五枚花钿的形状';
        }
      }
      if (!finished && elapsed >= PETAL_PACKING.limit) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = '';
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'undo') undo();
      if (type === 'primary-down') pressed = actionAt(payload);
      if (type === 'primary-up') {
        const action = actionAt(payload);
        if (sameAction(action, pressed)) perform(action);
        pressed = '';
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
        else if (key === 'r' || (zone === 'board' && selected && key === 'enter')) rotateSelected();
        else if (key === 'escape') {
          zone = 'tray';
          message = '回到花钿栏，可以重新挑选';
        } else if (zone === 'tray') {
          if (key === 'arrowup' || key === 'w' || key === 'arrowleft' || key === 'a')
            trayCursor = (trayCursor + PETAL_PACKING.pieces - 1) % PETAL_PACKING.pieces;
          if (key === 'arrowdown' || key === 's' || key === 'arrowright' || key === 'd')
            trayCursor = (trayCursor + 1) % PETAL_PACKING.pieces;
          if (key === ' ' || key === 'enter') selectPiece(puzzle.pieces[trayCursor].id);
        } else {
          if (key === 'arrowup' || key === 'w') moveBoard(-1, 0);
          if (key === 'arrowdown' || key === 's') moveBoard(1, 0);
          if (key === 'arrowleft' || key === 'a') moveBoard(0, -1);
          if (key === 'arrowright' || key === 'd') moveBoard(0, 1);
          if (key === ' ') placeSelected(boardCursor);
        }
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * 400,
        rounds,
        round,
        steps,
        finished,
        won,
        phase,
        selected,
        trayCursor,
        boardCursor: { ...boardCursor },
        zone,
        placements: placements.map(clonePlacement),
        rotations: [...rotations],
        occupied: occupiedKeys().size,
        extra: `${rounds} / ${PETAL_PACKING.rounds} · ${steps} 步`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f6eedc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花钿入匣', 300, 28, 27);
      label(ctx, `第 ${Math.min(rounds + 1, 3)} 匣 · 五枚花钿铺满 25 格`, 300, 59, 16);

      roundRect(ctx, BOARD_X - 12, BOARD_Y - 12, CELL * 5 + 24, CELL * 5 + 24, 22, '#cfb58f');
      const occupied = new Map();
      for (let id = 1; id <= PETAL_PACKING.pieces; id++)
        for (const cell of cellsFor(id)) occupied.set(`${cell.row}:${cell.column}`, id);
      for (let row = 0; row < PETAL_PACKING.size; row++)
        for (let column = 0; column < PETAL_PACKING.size; column++) {
          const x = BOARD_X + column * CELL;
          const y = BOARD_Y + row * CELL;
          const id = occupied.get(`${row}:${column}`) || 0;
          roundRect(
            ctx,
            x + 2,
            y + 2,
            CELL - 4,
            CELL - 4,
            9,
            id ? pieceById(id).color : '#fffaf0',
            zone === 'board' && boardCursor.row === row && boardCursor.column === column
              ? '#536f64'
              : '#dfd1b8',
          );
          if (id) {
            ctx.fillStyle = 'rgba(255,250,240,.6)';
            ctx.beginPath();
            ctx.arc(x + CELL / 2, y + CELL / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

      if (selected) {
        const valid = canPlace(selected, boardCursor.row, boardCursor.column);
        ctx.globalAlpha = 0.48;
        for (const offset of rotateCells(pieceById(selected).cells, rotations[selected])) {
          const row = boardCursor.row + offset.row;
          const column = boardCursor.column + offset.column;
          if (row < 0 || row >= 5 || column < 0 || column >= 5) continue;
          roundRect(
            ctx,
            BOARD_X + column * CELL + 5,
            BOARD_Y + row * CELL + 5,
            CELL - 10,
            CELL - 10,
            8,
            valid ? pieceById(selected).color : '#c76f62',
          );
        }
        ctx.globalAlpha = 1;
      }

      for (let index = 0; index < PETAL_PACKING.pieces; index++) {
        const piece = puzzle.pieces[index];
        const y = TRAY_Y + index * TRAY_H;
        const placed = Boolean(placements[piece.id]);
        roundRect(
          ctx,
          TRAY_X,
          y + 3,
          TRAY_W,
          TRAY_H - 7,
          13,
          selected === piece.id ? '#fff3d9' : placed ? '#e5e2d4' : '#fffaf0',
          zone === 'tray' && trayCursor === index ? '#536f64' : '#c7b28f',
        );
        const cells = rotateCells(piece.cells, rotations[piece.id]);
        const width = Math.max(...cells.map((cell) => cell.column)) + 1;
        const height = Math.max(...cells.map((cell) => cell.row)) + 1;
        const mini = 9;
        const startX = TRAY_X + 15 + (49 - width * mini) / 2;
        const startY = y + 7 + (39 - height * mini) / 2;
        ctx.globalAlpha = placed ? 0.42 : 1;
        for (const cell of cells)
          roundRect(
            ctx,
            startX + cell.column * mini,
            startY + cell.row * mini,
            mini - 1,
            mini - 1,
            2,
            piece.color,
          );
        ctx.globalAlpha = 1;
        label(
          ctx,
          `${pieceNames[piece.id]}花钿${placed ? ' · 已放' : ''}`,
          TRAY_X + 76,
          y + 27,
          14,
          placed ? '#8d8a7e' : '#4f675e',
          'left',
        );
      }

      roundRect(
        ctx,
        ROTATE.x,
        ROTATE.y,
        ROTATE.width,
        ROTATE.height,
        16,
        selected ? '#e9c877' : '#ded4c1',
        '#b99a67',
      );
      label(ctx, selected ? '↻ 旋转花钿' : '先选花钿', ROTATE.x + ROTATE.width / 2, 392, 16);
      label(ctx, message, 300, 440, 16, '#526f63');
      label(ctx, '点选与放置 · 回车旋转 · Z 撤销', 300, 466, 14, '#77766b');
    },
    destroy() {
      finished = true;
      pressed = '';
      selected = 0;
      history = [];
    },
  };
}

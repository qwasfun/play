import { roundRect } from '@playground/game-sdk';
export function cottage(ctx, x, y) {
  ctx.fillStyle = '#dbe9e7';
  ctx.fillRect(x, y, 360, 360);
  ctx.fillStyle = '#fff2c4';
  ctx.beginPath();
  ctx.arc(x + 276, y + 70, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6f5e3';
  roundRect(ctx, x + 31, y + 44, 91, 19, 10, '#f6f5e3');
  roundRect(ctx, x + 53, y + 31, 52, 22, 11, '#f6f5e3');
  ctx.fillStyle = '#b8c9a0';
  ctx.beginPath();
  ctx.moveTo(x, y + 271);
  ctx.quadraticCurveTo(x + 95, y + 226, x + 180, y + 263);
  ctx.quadraticCurveTo(x + 290, y + 213, x + 360, y + 258);
  ctx.lineTo(x + 360, y + 360);
  ctx.lineTo(x, y + 360);
  ctx.fill();
  roundRect(ctx, x + 91, y + 166, 179, 139, 7, '#fff0d3');
  ctx.fillStyle = '#c38273';
  ctx.beginPath();
  ctx.moveTo(x + 67, y + 175);
  ctx.lineTo(x + 181, y + 76);
  ctx.lineTo(x + 295, y + 175);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f2bd98';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x + 88, y + 169);
  ctx.lineTo(x + 181, y + 90);
  ctx.lineTo(x + 274, y + 169);
  ctx.stroke();
  roundRect(ctx, x + 217, y + 96, 20, 40, 3, '#cb9582');
  roundRect(ctx, x + 160, y + 225, 42, 80, 10, '#8aafa2');
  ctx.fillStyle = '#f3d48d';
  ctx.beginPath();
  ctx.arc(x + 192, y + 268, 3, 0, Math.PI * 2);
  ctx.fill();
  for (const wx of [112, 219]) {
    roundRect(ctx, x + wx, y + 204, 30, 37, 6, '#9fc9ce');
    ctx.strokeStyle = '#fff9e9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + wx + 15, y + 205);
    ctx.lineTo(x + wx + 15, y + 239);
    ctx.moveTo(x + wx + 1, y + 222);
    ctx.lineTo(x + wx + 29, y + 222);
    ctx.stroke();
  }
  ctx.fillStyle = '#dbc29c';
  ctx.beginPath();
  ctx.moveTo(x + 167, y + 305);
  ctx.lineTo(x + 197, y + 305);
  ctx.lineTo(x + 230, y + 360);
  ctx.lineTo(x + 134, y + 360);
  ctx.closePath();
  ctx.fill();
  for (const [fx, fy] of [
    [53, 292],
    [286, 287],
    [308, 324],
    [94, 333],
  ]) {
    ctx.strokeStyle = '#75946b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + fx, y + fy);
    ctx.lineTo(x + fx, y + fy + 21);
    ctx.stroke();
    ctx.fillStyle = '#edb2a0';
    for (let p = 0; p < 5; p++) {
      const a = (p * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(x + fx + Math.cos(a) * 6, y + fy + Math.sin(a) * 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f5da92';
    ctx.beginPath();
    ctx.arc(x + fx, y + fy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

import { generateDeck } from "../src/deck.js";

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};
const keys = {
  up: "ArrowUp",
  right: "ArrowRight",
  down: "ArrowDown",
  left: "ArrowLeft",
};
const vectors = {
  up: [0, -105],
  right: [105, 0],
  down: [0, 105],
  left: [-105, 0],
};

export async function play({ page, mobile, seed }) {
  const canvas = page.locator("#game-canvas");
  for (const [width, height] of [
    [375, 812],
    [812, 375],
    [390, 844],
    [844, 390],
    [320, 568],
    [568, 320],
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(80);
    if (await page.locator('[data-action="resume"]').isVisible())
      await page.locator('[data-action="resume"]').click();
    ensure(
      await canvas.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 100 && rect.left >= 0 && rect.right <= innerWidth + 1
        );
      }),
      "横竖屏画布越界",
    );
  }
  await page.setViewportSize({
    width: mobile ? 390 : 1280,
    height: mobile ? 844 : 900,
  });
  await page.clock.runFor(80);
  if (await page.locator('[data-action="resume"]').isVisible())
    await page.locator('[data-action="resume"]').click();

  await page.locator("#fullscreen-toggle").click();
  await page.clock.runFor(80);
  ensure(
    await page.locator('[data-action="resume"]').isVisible(),
    "进入全屏应暂停",
  );
  await page.locator("#fullscreen-toggle").click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator("#pause").click();
  const score = await page.locator("#live-score").innerText();
  await page.clock.runFor(1700);
  ensure(
    (await page.locator("#live-score").innerText()) === score,
    "暂停时不应超时或计分",
  );
  await page.locator('[data-action="resume"]').click();
  await page.locator("#restart").click();
  await page.locator('[data-action="again"]').click();
  await page.locator("#pause:enabled").waitFor();

  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  async function swipe(direction) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    ensure(box, "无法定位游戏画布");
    const scaleX = box.width / 600;
    const scaleY = box.height / 480;
    const start = { x: box.x + 300 * scaleX, y: box.y + 230 * scaleY };
    const vector = vectors[direction];
    const end = {
      x: start.x + vector[0] * scaleX,
      y: start.y + vector[1] * scaleY,
    };
    if (mobile) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: start.x, y: start.y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: end.x, y: end.y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 4 });
      await page.mouse.up();
    }
  }

  const deck = generateDeck(seed);
  for (let index = 0; index < deck.length; index++) {
    if (!mobile && index < 10) await page.keyboard.press(keys[deck[index]]);
    else await swipe(deck[index]);
    await page.clock.runFor(100);
  }
  await cdp?.detach();
  await page.locator(".result-card").waitFor();
  ensure(
    (await page.locator(".result-card h2").innerText()).includes("完成"),
    "未真实完成二十张花笺",
  );
  ensure(
    (await page.locator(".result-score").innerText()).includes("2000"),
    "结算分数不是 2000",
  );
  console.log(
    "petal-swipe: twenty seeded gestures, keyboard and drag, pause, restart, fullscreen, eight layouts",
    mobile ? "touch" : "desktop",
  );
}

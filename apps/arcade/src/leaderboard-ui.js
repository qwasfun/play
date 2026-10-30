import { byId, leaderboardPolicy } from '@playground/game-registry';
import { beijingDate, dailyGame, resultText, RULE_VERSION } from '@playground/game-registry/core';
import { nicknameError } from '@playground/game-registry/rules';

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const facts = (gameId, date) => ({
  game_id: gameId,
  mode: date ? 'daily' : 'normal',
  rules_version: RULE_VERSION,
});

export function mountLeaderboard(
  container,
  { client, gameId, date = '', track = () => {}, signal, submissions },
) {
  const card = el('section', undefined, 'side-card leaderboard-card');
  card.setAttribute('aria-label', '休闲排行榜');
  card.innerHTML =
    '<p class="eyebrow">A LITTLE FRIENDLY CHALLENGE</p><h3>休闲榜 <span class="badge">匿名参与</span></h3><p class="leaderboard-note">每人保留最佳成绩，来看看大家的小纪录。</p><button type="button" class="button secondary" data-open-board aria-expanded="false">查看排行榜 ↗</button><div class="leaderboard-panel" hidden></div>';
  container.prepend(card);
  const button = card.querySelector('[data-open-board]'),
    panel = card.querySelector('.leaderboard-panel');
  let opened = false,
    revision = 0,
    activeLoad,
    selection;
  const unsubscribe = submissions?.subscribe((event) => {
    if (
      event.type === 'accepted' &&
      event.receipt.eligible &&
      opened &&
      event.run.gameId === selection?.gameId &&
      event.run.mode === selection.mode &&
      event.run.date === selection.date
    )
      void activeLoad?.();
  });
  signal.addEventListener('abort', () => unsubscribe?.(), { once: true });
  button.addEventListener(
    'click',
    async () => {
      opened = !opened;
      panel.hidden = !opened;
      button.setAttribute('aria-expanded', String(opened));
      button.textContent = opened ? '收起排行榜 ↑' : '查看排行榜 ↗';
      if (opened) {
        track('leaderboard_view', facts(gameId, date));
        await render();
      }
    },
    { signal },
  );
  async function render() {
    const current = ++revision;
    panel.replaceChildren();
    const filters = el('form', undefined, 'leaderboard-filters');
    filters.noValidate = true;
    const modeLabel = el('label', '榜单');
    const mode = el('select');
    mode.setAttribute('aria-label', '榜单类型');
    mode.append(new Option('普通模式历史榜', 'normal'));
    if (leaderboardPolicy(gameId).daily) mode.append(new Option('每日挑战榜', 'daily'));
    mode.value = date ? 'daily' : 'normal';
    modeLabel.append(mode);
    const dayLabel = el('label', '挑战日期');
    const day = el('input');
    day.type = 'date';
    day.value = date || beijingDate();
    day.max = beijingDate();
    day.setAttribute('aria-label', '榜单挑战日期');
    dayLabel.append(day);
    dayLabel.hidden = mode.value !== 'daily';
    const refresh = el('button', '查看榜单', 'button secondary');
    refresh.type = 'submit';
    filters.append(modeLabel, dayLabel, refresh);
    const status = el('p', '正在连接休闲榜…', 'leaderboard-status');
    status.setAttribute('role', 'status');
    const content = el('div');
    const identity = el('div', undefined, 'leaderboard-identity');
    panel.append(filters, status, identity, content);
    mode.addEventListener(
      'change',
      () => {
        dayLabel.hidden = mode.value !== 'daily';
        load();
      },
      { signal },
    );
    filters.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        load();
      },
      { signal },
    );
    let queryRevision = 0;
    async function load() {
      const query = ++queryRevision;
      status.textContent = '正在读取榜单…';
      content.replaceChildren();
      refresh.disabled = true;
      try {
        if (mode.value === 'daily' && !day.value) throw Error('挑战日期：请选择有效日期');
        if (mode.value === 'daily' && day.value > beijingDate())
          throw Error('挑战日期：请选择今天或过去的日期');
        const id = mode.value === 'daily' ? dailyGame(day.value) : gameId;
        selection = { gameId: id, mode: mode.value, date: mode.value === 'daily' ? day.value : '' };
        const data = await client.board(selection);
        if (signal.aborted || current !== revision || query !== queryRevision) return;
        status.textContent = `${byId[id].title} · ${data.total} 位玩家${data.me ? ` · 我的名次：第 ${data.me.rank} 名` : ''}`;
        if (data.me)
          content.append(
            el(
              'p',
              `我的最佳：${resultText(id, data.me.result)} · 第 ${data.me.rank} 名`,
              'leaderboard-personal-best',
            ),
          );
        if (!data.entries.length) content.append(el('p', '还没有成绩，来留下第一份小纪录吧。'));
        else {
          const table = el('table', undefined, 'leaderboard-table');
          table.append(el('caption', '休闲榜 · 前 100 名'));
          const head = el('thead'),
            headRow = el('tr');
          for (const title of ['名次', '玩家', '成绩']) {
            const th = el('th', title);
            th.scope = 'col';
            headRow.append(th);
          }
          head.append(headRow);
          table.append(head);
          const rows = el('tbody');
          for (const row of data.entries) {
            const tr = el('tr');
            if (row.playerId === data.me?.playerId) tr.className = 'is-me';
            const score = el('td');
            score.append(
              el('strong', resultText(id, row.result)),
              el('small', `${row.result.elapsed.toFixed(2)} 秒`),
            );
            tr.append(el('td', String(row.rank)), el('td', row.nickname), score);
            rows.append(tr);
          }
          table.append(rows);
          content.append(table);
        }
        if (!identity.childNodes.length) await profile();
      } catch (error) {
        if (!signal.aborted && current === revision && query === queryRevision)
          status.textContent = error.message;
      } finally {
        if (query === queryRevision) refresh.disabled = false;
      }
    }
    async function profile() {
      try {
        const player = await client.me();
        if (signal.aborted || current !== revision || identity.childNodes.length) return;
        const form = el('form');
        form.noValidate = true;
        const label = el('label', '我的昵称');
        const name = el('input');
        name.value = player.nickname;
        name.autocomplete = 'nickname';
        name.setAttribute('aria-label', '我的昵称');
        name.maxLength = 24;
        label.append(name);
        const save = el('button', '保存昵称', 'button secondary');
        save.type = 'submit';
        const message = el('p');
        message.setAttribute('role', 'status');
        form.append(
          label,
          save,
          message,
          el(
            'small',
            '匿名身份保存在当前浏览器。清除数据或换设备后将成为新玩家，旧榜单纪录仍保留。',
          ),
        );
        identity.append(form);
        form.addEventListener(
          'submit',
          async (event) => {
            event.preventDefault();
            const error = nicknameError(name.value);
            if (error) {
              message.textContent = error;
              return;
            }
            save.disabled = true;
            try {
              const updated = await client.rename(name.value);
              name.value = updated.nickname;
              message.textContent = '昵称已保存';
              await load();
            } catch (error) {
              message.textContent = error.message;
            } finally {
              save.disabled = false;
            }
          },
          { signal },
        );
      } catch {
        /* A board remains readable if the profile request fails. */
      }
    }
    activeLoad = load;
    await load();
  }
}

export function mountSubmission(container, { run, gameId, result, reason, signal, submissions }) {
  const box = el('div', undefined, 'rank-result');
  const status = el('p');
  status.setAttribute('role', 'status');
  const retry = el('button', '重试提交', 'button secondary');
  retry.type = 'button';
  retry.hidden = true;
  box.append(status, retry);
  container.append(box);
  if (!run) {
    status.textContent = reason || '本局为本机游玩，成绩已保存在当前浏览器。';
    return;
  }
  function update(event) {
    if (signal.aborted || event.run?.id !== run.id) return;
    retry.hidden = true;
    if (event.type === 'accepted') {
      const receipt = event.receipt;
      status.textContent = !receipt.eligible
        ? `本机成绩已保存，${byId[gameId].rankingHint || '通关后即可上榜。'}`
        : `${receipt.improved ? '✦ 刷新休闲榜最佳纪录' : '成绩已收好'} · 提交时最佳第 ${receipt.rank} 名`;
    } else if (event.type === 'failed') {
      status.textContent =
        event.message + (event.retryable ? '；已保留待提交成绩，将在有效期内自动重试。' : '');
      retry.hidden = !event.retryable;
    } else status.textContent = '正在提交休闲榜…';
  }
  const unsubscribe = submissions.subscribe(update);
  signal.addEventListener('abort', unsubscribe, { once: true });
  retry.addEventListener(
    'click',
    () => {
      void submissions.retry();
    },
    { signal },
  );
  void submissions.add(run, result);
  const state = submissions.state(run.id);
  if (state) update(state);
}

export function mountPendingSubmissions(anchor, submissions) {
  const box = el('div', undefined, 'submission-notice');
  box.setAttribute('role', 'status');
  const message = el('span');
  const retry = el('button', '重试待提交成绩', 'button secondary');
  retry.type = 'button';
  box.append(message, retry);
  anchor.after(box);
  function update(event) {
    box.hidden = !submissions.count && event?.type !== 'failed';
    retry.hidden = !submissions.count;
    message.textContent = submissions.count
      ? `有 ${submissions.count} 局成绩等待提交，刷新或离开游戏后仍会在有效期内自动重试。${event?.type === 'failed' ? event.message : ''}`
      : event?.message || '';
  }
  retry.addEventListener('click', () => {
    void submissions.retry();
  });
  submissions.subscribe(update);
  update();
}

/**
 * 화면 렌더링 (유초윤)
 * ─────────────────────────────────────────────────────────
 * 각 render* 함수는 mount 엘리먼트에 innerHTML을 채우고 이벤트를 붙인다.
 * 데이터는 js/types.js 계약을 그대로 따른다. app.js가 상태·화면 전환을 담당하고,
 * 이 파일은 "주어진 데이터를 어떻게 보여줄지"만 안다 (pipeline.js를 직접 호출하지 않음).
 */

import { STAGE, STAGE_LABEL, PERSONAS, DISCLAIMER } from './types.js';

/** 간단한 HTML 이스케이프 — 사용자가 입력한 텍스트를 그대로 innerHTML에 꽂을 때 사용 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function chipList(items) {
  if (!items || items.length === 0) return '<span class="text-slate-500">없음</span>';
  return items
    .map((i) => `<span class="inline-block px-2 py-0.5 mr-1 mb-1 rounded bg-ink-700 text-xs text-slate-200">${esc(i)}</span>`)
    .join('');
}

// ═══════════════════════════════════════════════════════════
// 화면 1 · 온보딩
// ═══════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} mount
 * @param {{onSubmit: (profile: Partial<import('./types.js').Profile>) => void, demoProfile?: import('./types.js').Profile}} handlers
 */
export function renderOnboarding(mount, { onSubmit, demoProfile }) {
  mount.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-1">
      <h2 class="text-xl font-bold">먼저, 나에 대해 알려주세요</h2>
      ${demoProfile ? `<button type="button" id="btn-fill-demo-profile" class="shrink-0 text-xs text-brand-400 hover:underline">데모 데이터로 채우기</button>` : ''}
    </div>
    <p class="text-sm text-slate-400 mb-6">한 번만 입력하면 됩니다. 이후엔 활동을 이행할 때마다 자동으로 쌓여요.</p>

    <form id="form-onboarding" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-sm text-slate-300">학년</span>
          <select name="grade" class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm">
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
        </label>
        <label class="block">
          <span class="text-sm text-slate-300">나이 <span class="text-slate-500">(선택)</span></span>
          <input name="age" type="number" min="15" max="99" placeholder="예: 20"
            class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
        </label>
      </div>

      <label class="block">
        <span class="text-sm text-slate-300">학과</span>
        <input name="department" type="text" required placeholder="예: AI게임소프트웨어학과"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">보유 자격증 <span class="text-slate-500">(쉼표로 구분, 없으면 비워두세요)</span></span>
        <input name="certificates" type="text" placeholder="예: 컴활2급, 정보처리기능사"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">보유 기술 <span class="text-slate-500">(쉼표로 구분)</span></span>
        <input name="skills" type="text" placeholder="예: C#, Unity, HTML/CSS"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <button type="submit"
        class="w-full mt-2 rounded bg-brand-500 hover:bg-brand-400 transition-colors py-2.5 text-sm font-semibold text-white">
        시작하기
      </button>
    </form>
  `;

  const form = mount.querySelector('#form-onboarding');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const toList = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    onSubmit({
      grade: Number(fd.get('grade')),
      department: String(fd.get('department') || '').trim(),
      age: fd.get('age') ? Number(fd.get('age')) : null,
      certificates: toList(fd.get('certificates')),
      skills: toList(fd.get('skills')),
    });
  });

  const fillBtn = mount.querySelector('#btn-fill-demo-profile');
  if (fillBtn && demoProfile) {
    fillBtn.addEventListener('click', () => {
      form.grade.value = String(demoProfile.grade);
      form.age.value = demoProfile.age ?? '';
      form.department.value = demoProfile.department;
      form.certificates.value = (demoProfile.certificates || []).join(', ');
      form.skills.value = (demoProfile.skills || [])
        .map((s) => (typeof s === 'string' ? s : s.name))
        .join(', ');
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 화면 2 · 목표 설정
// ═══════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} mount
 * @param {{onSubmit: (target: {companyOrRole: string, globalInterest: boolean, activityPreference: string|null}) => void, demoTargets?: Array}} handlers
 */
export function renderTarget(mount, { onSubmit, demoTargets }) {
  mount.innerHTML = `
    <h2 class="text-xl font-bold mb-1">어떤 목표를 향해 가고 있나요?</h2>
    <p class="text-sm text-slate-400 mb-6">기업명을 정확히 몰라도 괜찮습니다. 직군이나 분야만 적어도 됩니다.</p>

    ${
      demoTargets && demoTargets.length
        ? `<div class="mb-5">
            <p class="text-xs text-slate-500 mb-2">빠른 선택</p>
            <div class="flex flex-wrap gap-2">
              ${demoTargets
                .map(
                  (t, i) => `
                <button type="button" data-demo-target-index="${i}"
                  title="${esc(t.why || '')}"
                  class="demo-target-chip text-xs px-3 py-1.5 rounded-full border border-ink-600 text-slate-300 hover:border-brand-400 hover:text-brand-400 transition-colors">
                  ${esc(t.label)}
                </button>`
                )
                .join('')}
            </div>
          </div>`
        : ''
    }

    <form id="form-target" class="space-y-4">
      <label class="block">
        <span class="text-sm text-slate-300">목표 기업 또는 직군</span>
        <input name="companyOrRole" type="text" required placeholder="예: 게임 클라이언트 개발자, 네이버, 스타트업 백엔드"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
        <span id="target-hint" class="mt-1 block text-xs text-slate-500"></span>
      </label>

      <label class="flex items-center gap-2">
        <input name="globalInterest" type="checkbox" class="rounded bg-ink-800 border-ink-600" />
        <span class="text-sm text-slate-300">해외/글로벌 진출도 고려하고 있어요</span>
      </label>

      <fieldset class="pt-2">
        <legend class="text-sm text-slate-300 mb-2">참여 방식 선호 <span class="text-slate-500">(선택, 추천에 살짝 반영돼요)</span></legend>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="team" class="bg-ink-800 border-ink-600" /> 팀 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="solo" class="bg-ink-800 border-ink-600" /> 개인 활동 선호
          </label>
        </div>
      </fieldset>

      <button type="submit"
        class="w-full mt-2 rounded bg-brand-500 hover:bg-brand-400 transition-colors py-2.5 text-sm font-semibold text-white">
        내게 맞는 프로그램 찾기
      </button>
    </form>
  `;

  const form = mount.querySelector('#form-target');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit({
      companyOrRole: String(fd.get('companyOrRole') || '').trim(),
      globalInterest: fd.get('globalInterest') === 'on',
      activityPreference: fd.get('activityPreference') || null,
    });
  });

  mount.querySelectorAll('.demo-target-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const t = demoTargets[Number(chip.dataset.demoTargetIndex)];
      if (!t) return;
      form.companyOrRole.value = t.value;
      mount.querySelector('#target-hint').textContent = t.hint || '';
      mount.querySelectorAll('.demo-target-chip').forEach((c) => c.classList.remove('border-brand-400', 'text-brand-400'));
      chip.classList.add('border-brand-400', 'text-brand-400');
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 화면 3 · 분석 진행
// ═══════════════════════════════════════════════════════════

const STAGE_ORDER = [STAGE.REQUIRED_SKILLS, STAGE.GAP_ANALYSIS, STAGE.PROGRAM_SEARCH, STAGE.PERSONA_REVIEW];

/**
 * @param {HTMLElement} mount
 * @returns {(event: import('./types.js').StageEvent) => void} 파이프라인 진행에 맞춰 호출할 업데이트 함수
 */
export function renderProgress(mount) {
  mount.innerHTML = `
    <h2 class="text-xl font-bold mb-6">분석하고 있어요</h2>
    <ul id="stage-list" class="space-y-3">
      ${STAGE_ORDER.map(
        (stage) => `
        <li data-stage="${stage}" class="flex items-center gap-3 rounded border border-ink-600 px-4 py-3 text-sm text-slate-400">
          <span class="stage-icon w-4 h-4 shrink-0 rounded-full border-2 border-ink-600"></span>
          <span class="stage-label">${esc(STAGE_LABEL[stage])}</span>
        </li>`
      ).join('')}
    </ul>
    <div id="stage-detail" class="mt-6 text-sm text-slate-400 space-y-1"></div>
  `;

  const detail = mount.querySelector('#stage-detail');

  return function onStage(event) {
    const li = mount.querySelector(`li[data-stage="${event.stage}"]`);
    if (!li) return;
    const icon = li.querySelector('.stage-icon');

    if (event.status === 'start') {
      li.classList.remove('text-slate-400');
      li.classList.add('text-slate-100');
      icon.outerHTML = `<span class="stage-icon w-4 h-4 shrink-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin"></span>`;
    } else if (event.status === 'done') {
      const doneIcon = li.querySelector('.stage-icon');
      doneIcon.outerHTML = `<span class="stage-icon w-4 h-4 shrink-0 rounded-full bg-brand-500 flex items-center justify-center text-[10px] text-white">✓</span>`;

      if (event.stage === STAGE.REQUIRED_SKILLS && Array.isArray(event.data)) {
        detail.insertAdjacentHTML(
          'beforeend',
          `<p><strong class="text-slate-300">요구 역량:</strong> ${event.data.map((s) => esc(s.name)).join(', ')}</p>`
        );
      }
      if (event.stage === STAGE.GAP_ANALYSIS && Array.isArray(event.data)) {
        detail.insertAdjacentHTML(
          'beforeend',
          `<p><strong class="text-slate-300">부족한 부분:</strong> ${event.data.map((g) => esc(g.name)).join(', ')}</p>`
        );
      }
    } else if (event.status === 'error') {
      icon.outerHTML = `<span class="stage-icon w-4 h-4 shrink-0 rounded-full bg-red-500"></span>`;
      detail.insertAdjacentHTML('beforeend', `<p class="text-red-400">${esc(event.message || '오류가 발생했어요')}</p>`);
    }
  };
}

// ═══════════════════════════════════════════════════════════
// 화면 4 · 추천 리포트
// ═══════════════════════════════════════════════════════════

function personaGrid(personaScores) {
  return `
    <div class="grid grid-cols-2 gap-2 mt-3">
      ${PERSONAS.map((p) => {
        const v = personaScores[p.key];
        if (!v) return '';
        return `
          <div class="rounded bg-ink-800 border border-ink-600 px-2.5 py-2">
            <div class="flex items-center justify-between text-[11px] text-slate-400">
              <span>${esc(p.label)} <span class="text-slate-600">· ${esc(p.sub)}</span></span>
              <span class="font-mono text-brand-400">${v.score}/10</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-snug">${esc(v.comment)}</p>
          </div>`;
      }).join('')}
    </div>
  `;
}

function programCard(match) {
  const scores = Object.values(match.personaScores || {}).map((v) => v.score);
  const disagreementBadge =
    match.disagreement >= 0.5
      ? `<span class="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-medium">⚡ 의견이 갈렸어요</span>`
      : '';

  const deadlineText = match.deadline
    ? `${esc(match.deadline)} <span class="text-slate-500">(${DISCLAIMER.DEADLINE_UNCERTAIN})</span>`
    : `<span class="text-slate-500">${DISCLAIMER.DEADLINE_UNCERTAIN}</span>`;

  return `
    <div class="rounded-lg border border-ink-600 bg-ink-800/50 p-4" data-match-id="${esc(match.id)}">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="font-semibold text-slate-100">${esc(match.programTitle)}</h4>
          <p class="text-sm text-slate-400 mt-0.5">${esc(match.summary)}</p>
        </div>
        ${disagreementBadge}
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-slate-500">
        <a href="${esc(match.sourceUrl)}" target="_blank" rel="noopener" class="text-brand-400 hover:underline">원문 보기 ↗</a>
        <span>${esc(match.sourceDomain)}</span>
        ${match.postedAt ? `<span>게시일 ${esc(match.postedAt)}</span>` : ''}
        <span>마감 ${deadlineText}</span>
      </div>

      ${personaGrid(match.personaScores)}

      <label class="complete-label mt-4 flex items-center gap-2 text-sm ${match.isCompleted ? 'text-brand-400' : 'text-slate-300'}">
        <input type="checkbox" class="complete-checkbox rounded bg-ink-800 border-ink-600" ${match.isCompleted ? 'checked disabled' : ''} />
        <span class="complete-label-text">${match.isCompleted ? '이행 완료 · 프로필에 반영됨' : '이 활동을 이행했어요'}</span>
      </label>
    </div>
  `;
}

/**
 * @param {HTMLElement} mount
 * @param {import('./types.js').Target} target
 * @param {import('./types.js').ProgramMatch[]} matches
 * @param {{onComplete: (match: import('./types.js').ProgramMatch) => void, onNewTarget: () => void}} handlers
 */
export function renderReport(mount, target, matches, { onComplete, onNewTarget }) {
  const byGap = new Map();
  for (const m of matches) {
    if (!byGap.has(m.gapSkill)) byGap.set(m.gapSkill, []);
    byGap.get(m.gapSkill).push(m);
  }

  mount.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <h2 class="text-xl font-bold">"${esc(target.companyOrRole)}"에 필요한 걸 채워드릴게요</h2>
    </div>
    <p class="text-sm text-slate-400 mb-6">${DISCLAIMER.ELIGIBILITY} · ${DISCLAIMER.NO_SOURCE}</p>

    <div class="space-y-8">
      ${[...byGap.entries()]
        .map(
          ([gap, list]) => `
        <section>
          <h3 class="text-sm font-semibold text-brand-400 mb-3">갭: ${esc(gap)}</h3>
          <div class="space-y-3">${list.map(programCard).join('')}</div>
        </section>`
        )
        .join('')}
    </div>

    <button id="btn-new-target"
      class="w-full mt-8 rounded border border-ink-600 hover:border-brand-400 transition-colors py-2.5 text-sm font-medium text-slate-300">
      새 목표로 다시 찾아보기
    </button>
  `;

  mount.querySelectorAll('.complete-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      const card = e.target.closest('[data-match-id]');
      const matchId = card.dataset.matchId;
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;

      onComplete(match);

      // 전체 화면을 다시 그리지 않고 이 카드만 즉시 "완료" 상태로 갱신
      e.target.checked = true;
      e.target.disabled = true;
      const label = card.querySelector('.complete-label');
      label.classList.remove('text-slate-300');
      label.classList.add('text-brand-400');
      card.querySelector('.complete-label-text').textContent = '이행 완료 · 프로필에 반영됨';
    });
  });

  mount.querySelector('#btn-new-target').addEventListener('click', onNewTarget);
}

// ═══════════════════════════════════════════════════════════
// 화면 5 · 마이 프로필
// ═══════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} mount
 * @param {import('./types.js').Profile} profile
 * @param {{onNewTarget: () => void}} handlers
 */
export function renderProfile(mount, profile, { onNewTarget }) {
  mount.innerHTML = `
    <h2 class="text-xl font-bold mb-6">마이 프로필</h2>

    <div class="rounded-lg border border-ink-600 p-4 space-y-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><span class="text-slate-500">학년</span><p class="text-slate-200">${profile.grade}학년</p></div>
        <div><span class="text-slate-500">학과</span><p class="text-slate-200">${esc(profile.department)}</p></div>
      </div>

      <div>
        <span class="text-sm text-slate-500">보유 자격증</span>
        <div class="mt-1">${chipList(profile.certificates)}</div>
      </div>

      <div>
        <span class="text-sm text-slate-500">보유 기술</span>
        <div class="mt-1">${chipList(profile.skills)}</div>
      </div>

      <div>
        <span class="text-sm text-slate-500">이행한 활동 (${profile.completedActivities.length})</span>
        ${
          profile.completedActivities.length
            ? `<ul class="mt-1 space-y-1 text-sm text-slate-300">
                ${profile.completedActivities
                  .map((a) => `<li>· ${esc(a.programTitle)} <span class="text-slate-500">— ${esc(a.gainedSkill)} 역량 획득</span></li>`)
                  .join('')}
               </ul>`
            : '<p class="mt-1 text-sm text-slate-500">아직 없어요. 추천받은 프로그램을 이행하면 여기 쌓여요.</p>'
        }
      </div>
    </div>

    <button id="btn-profile-new-target"
      class="w-full mt-6 rounded bg-brand-500 hover:bg-brand-400 transition-colors py-2.5 text-sm font-semibold text-white">
      새 목표 설정하기
    </button>
  `;

  mount.querySelector('#btn-profile-new-target').addEventListener('click', onNewTarget);
}

/**
 * 화면 렌더링 (유초윤)
 * ─────────────────────────────────────────────────────────
 * 각 render* 함수는 mount 엘리먼트에 innerHTML을 채우고 이벤트를 붙인다.
 * 데이터는 js/types.js 계약을 그대로 따른다. app.js가 상태·화면 전환을 담당하고,
 * 이 파일은 "주어진 데이터를 어떻게 보여줄지"만 안다 (pipeline.js를 직접 호출하지 않음).
 */

import { STAGE, STAGE_LABEL, PERSONAS, DISCLAIMER } from './types.js';
// 어떤 관점을 어떤 회사의 모델이 평가했는지 카드에 적는다.
// "AI 4개를 쓴다"는 주장은 모델 이름이 화면에 있어야 확인 가능한 주장이 된다.
import { PERSONA_MODEL, clearCache, listStoredData, clearAllStoredData } from './gateway.js';
import { exportProfile, exportFilename, importProfile, isSaved } from './profile.js';

/** 간단한 HTML 이스케이프 — 사용자가 입력한 텍스트를 그대로 innerHTML에 꽂을 때 사용 */
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * 완전 플랫한 흰색 SVG 라인 아이콘 — 이모지 대신 쓴다.
 * 이모지는 OS·브라우저마다 색과 스타일이 제각각이라 "플랫하고 통일된" 느낌을 낼 수 없다.
 * 색은 currentColor 를 따르므로, 부모 엘리먼트에 text-white 를 주면 그대로 흰 아이콘이 된다.
 */
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  chart: '<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><line x1="10" y1="1" x2="10" y2="6"/><line x1="14" y1="1" x2="14" y2="6"/><line x1="10" y1="18" x2="10" y2="23"/><line x1="14" y1="18" x2="14" y2="23"/><line x1="18" y1="10" x2="23" y2="10"/><line x1="18" y1="14" x2="23" y2="14"/><line x1="1" y1="10" x2="6" y2="10"/><line x1="1" y1="14" x2="6" y2="14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  alert: '<path d="M12 3 22 20H2z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.3" r="1" fill="currentColor" stroke="none"/>',
};

export function icon(name, cls = 'w-6 h-6') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
}

/**
 * 기술 항목은 두 가지 형태로 들어온다.
 *   - 온보딩에서 직접 입력한 것          → 'C#'            (문자열)
 *   - 프로그램 이수로 자동으로 쌓인 것    → {name, level}   (객체)
 * 그냥 esc() 하면 객체는 "[object Object]" 가 된다.
 * 성장 루프(이행 체크 → 내 프로필)를 누르면 반드시 지나가는 경로다.
 */
function chipList(items) {
  if (!items || items.length === 0) return '<span class="text-secondary">없음</span>';
  return items
    .map((i) => {
      const name = typeof i === 'string' ? i : String(i?.name ?? '');
      const level = typeof i === 'string' ? '' : String(i?.level ?? '');
      if (!name) return '';
      const suffix = level ? `<span class="text-secondary"> · ${esc(level)}</span>` : '';
      return `<span class="inline-block px-2 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-xs text-maintext">${esc(name)}${suffix}</span>`;
    })
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
      ${demoProfile ? `<button type="button" id="btn-fill-demo-profile" class="shrink-0 text-xs text-mjcblue hover:underline">데모 데이터로 채우기</button>` : ''}
    </div>
    <p class="text-sm text-secondary mb-6">한 번만 입력하면 됩니다. 이후엔 활동에 참여할 때마다 자동으로 쌓여요.</p>

    <form id="form-onboarding" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-sm text-maintext">학년</span>
          <select name="grade" class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm">
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
        </label>
        <label class="block">
          <span class="text-sm text-maintext">나이 <span class="text-secondary">(선택)</span></span>
          <input name="age" type="number" min="15" max="99" placeholder="예: 20"
            class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
        </label>
      </div>

      <label class="block">
        <span class="text-sm text-maintext">학과</span>
        <input name="department" type="text" required placeholder="예: AI게임소프트웨어학과"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-maintext">보유 자격증 <span class="text-secondary">(쉼표로 구분, 없으면 비워두세요)</span></span>
        <input name="certificates" type="text" placeholder="예: 컴활2급, 정보처리기능사"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-maintext">보유 기술 <span class="text-secondary">(쉼표로 구분)</span></span>
        <input name="skills" type="text" placeholder="예: C#, Unity, HTML/CSS"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <!--
        ★ 특정 대상에게만 열려 있는 프로그램을 아무에게나 띄우지 않기 위한 선택 항목.
          체크하지 않으면 해당 프로그램을 추천하지 않고, 체크하면 정상적으로 함께 찾는다.
          "자격을 판정하지 않는다"는 원칙과 어긋나지 않는다 —
          우리가 판정하는 게 아니라 ★본인이 직접 선택★하는 것이다.
      -->
      <fieldset class="pt-1">
        <legend class="text-sm text-maintext mb-2">
          지원 대상 <span class="text-secondary">(선택 — 해당하면 관련 프로그램도 함께 찾아드려요)</span>
        </legend>
        <label class="flex items-start gap-2">
          <input name="supportDisability" type="checkbox" class="mt-1 rounded bg-white border-line" />
          <span class="text-sm text-maintext">
            장애학생 지원 대상입니다
            <span class="block text-xs text-secondary">
              체크하지 않으면 장애학생 대상 프로그램은 추천에서 제외합니다.
              이 정보는 이 브라우저에만 저장되며 어디로도 전송되지 않습니다.
            </span>
          </span>
        </label>
      </fieldset>

      <button type="submit"
        class="w-full mt-2 rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2.5 text-sm font-semibold text-white">
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
      supportDisability: fd.get('supportDisability') === 'on',
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
 * @param {{onSubmit: (target: {companyOrRole: string, jobPostingUrl: string|null, interestAreas: string|null, globalInterest: boolean, activityPreference: string|null}) => void, demoTargets?: Array}} handlers
 */
export function renderTarget(mount, { onSubmit, demoTargets }) {
  mount.innerHTML = `
    <div class="rounded-xl bg-navy text-white p-6 mb-6">
      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-white/10">🌉 MJC GROWTH BRIDGE</span>
      <h2 class="text-xl font-bold mt-3 mb-1">어떤 목표를 향해 가고 있나요?</h2>
      <p class="text-sm text-white/70">기업명을 정확히 몰라도 괜찮습니다. 직군이나 분야만 적어도 됩니다.</p>
    </div>

    ${
      demoTargets && demoTargets.length
        ? `<div class="mb-5">
            <p class="text-xs text-secondary mb-2">빠른 선택</p>
            <div class="flex flex-wrap gap-2">
              ${demoTargets
                .map(
                  (t, i) => `
                <button type="button" data-demo-target-index="${i}"
                  title="${esc(t.why || '')}"
                  class="demo-target-chip text-xs px-3 py-1.5 rounded-full border border-line text-maintext hover:border-mjcblue hover:text-mjcblue transition-colors">
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
        <span class="text-sm text-maintext">목표 기업 또는 직군</span>
        <!-- maxlength: 이 값은 리포트 제목에 그대로 들어간다. 길이를 안 막으면 화면이 뚫린다. -->
        <input name="companyOrRole" type="text" required maxlength="60" placeholder="예: 게임 클라이언트 개발자, 네이버, 스타트업 백엔드"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
        <span id="target-hint" class="mt-1 block text-xs text-secondary"></span>
      </label>

      <label class="block">
        <span class="text-sm text-maintext">채용공고 링크 <span class="text-secondary">(선택 — 넣으면 그 공고를 직접 근거로 분석해요)</span></span>
        <input name="jobPostingUrl" type="url" placeholder="예: https://careers.example.com/jobs/1234"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-maintext">관심 분야 <span class="text-secondary">(선택 — 전공과 관련 없어도 참여하고 싶은 분야)</span></span>
        <input name="interestAreas" type="text" maxlength="60" placeholder="예: 어학, 자격증, 봉사활동"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
        <span class="mt-1 block text-xs text-secondary">부족한 역량과 별개로, 이 분야 프로그램도 따로 찾아드려요.</span>
      </label>

      <label class="flex items-center gap-2">
        <input name="globalInterest" type="checkbox" class="rounded bg-white border-line" />
        <span class="text-sm text-maintext">해외/글로벌 진출도 고려하고 있어요</span>
      </label>

      <fieldset class="pt-2">
        <legend class="text-sm text-maintext mb-2">활동 스타일 <span class="text-secondary">(선택, 추천에 살짝 반영돼요)</span></legend>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="team" class="bg-white border-line" /> 팀 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="solo" class="bg-white border-line" /> 개인 활동 선호
          </label>
        </div>
      </fieldset>

      <button type="submit"
        class="w-full mt-2 rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2.5 text-sm font-semibold text-white">
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
      jobPostingUrl: String(fd.get('jobPostingUrl') || '').trim() || null,
      interestAreas: String(fd.get('interestAreas') || '').trim() || null,
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
      mount.querySelectorAll('.demo-target-chip').forEach((c) => c.classList.remove('border-mjcblue', 'text-mjcblue'));
      chip.classList.add('border-mjcblue', 'text-mjcblue');
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 화면 3 · 분석 진행
// ═══════════════════════════════════════════════════════════

const STAGE_ORDER = [STAGE.REQUIRED_SKILLS, STAGE.GAP_ANALYSIS, STAGE.PROGRAM_SEARCH, STAGE.PERSONA_REVIEW];

// 큰 아이콘 한눈에 보이게 — 문장은 전부 늘어놓지 않고 지금 하고 있는 단계 것만 크게 보여준다.
// 이모지 대신 플랫 SVG 아이콘을 쓰고, 진행 중인 단계는 핑 링 애니메이션으로 강조한다.
const STAGE_ICON = {
  [STAGE.REQUIRED_SKILLS]: icon('search'),
  [STAGE.GAP_ANALYSIS]: icon('chart'),
  [STAGE.PROGRAM_SEARCH]: icon('grid'),
  [STAGE.PERSONA_REVIEW]: icon('cpu'),
};
const STAGE_SHORT_LABEL = {
  [STAGE.REQUIRED_SKILLS]: '역량 검색',
  [STAGE.GAP_ANALYSIS]: '격차 분석',
  [STAGE.PROGRAM_SEARCH]: '프로그램 검색',
  [STAGE.PERSONA_REVIEW]: 'AI 4개 평가',
};
const ICON_IDLE = 'stage-icon w-16 h-16 rounded-full border-2 border-line bg-white flex items-center justify-center text-2xl opacity-40 transition-colors';
const ICON_ACTIVE = 'stage-icon w-16 h-16 rounded-full border-2 border-mjcblue bg-mjcblue text-white flex items-center justify-center text-2xl transition-colors';
const ICON_DONE = 'stage-icon w-16 h-16 rounded-full border-2 border-growth bg-growth text-white flex items-center justify-center text-2xl transition-colors animate-pop';
const ICON_ERROR = 'stage-icon w-16 h-16 rounded-full border-2 border-red-500 bg-red-50 text-red-500 flex items-center justify-center text-2xl transition-colors';

/**
 * @param {HTMLElement} mount
 * @param {{onRetry?: () => void, onNewTarget?: () => void}} [handlers] 실패했을 때 다시 시도/목표 재입력으로 나갈 길
 * @returns {(event: import('./types.js').StageEvent) => void} 파이프라인 진행에 맞춰 호출할 업데이트 함수
 */
export function renderProgress(mount, handlers = {}) {
  mount.innerHTML = `
    <h2 class="text-xl font-bold text-center mb-8">분석하고 있어요</h2>

    <div id="stage-list" class="flex items-start justify-between max-w-lg mx-auto mb-8">
      ${STAGE_ORDER.map(
        (stage, i) => `
        <div data-stage="${stage}" class="stage-item flex flex-col items-center gap-2 flex-1">
          <span class="stage-ping-wrap relative inline-flex">
            <span class="stage-ping absolute inset-0 rounded-full bg-mjcblue opacity-0"></span>
            <span class="${ICON_IDLE}">${STAGE_ICON[stage]}</span>
          </span>
          <span class="stage-short text-[11px] text-secondary text-center leading-tight font-medium">${esc(STAGE_SHORT_LABEL[stage])}</span>
        </div>
        ${i < STAGE_ORDER.length - 1 ? `<div class="stage-connector h-0.5 bg-line flex-1 mt-8 mx-1"></div>` : ''}`
      ).join('')}
    </div>

    <div id="stage-detail" class="max-w-md mx-auto text-center min-h-[3rem]"></div>
    <!-- 실패했을 때 나갈 길. 평소에는 비어 있다. -->
    <div id="stage-actions" class="max-w-md mx-auto mt-4"></div>
  `;

  const detail = mount.querySelector('#stage-detail');
  const actions = mount.querySelector('#stage-actions');
  const connectors = () => mount.querySelectorAll('.stage-connector');

  /**
   * ★실패 화면에 반드시 나갈 길을 만든다.★
   *
   * 전에는 붉은 문구와 "잠시 후 다시 시도해주세요"만 그리고 끝이었다.
   * 그 화면의 누를 수 있는 것은 헤더 버튼 두 개뿐이라, 사용자는 새로고침 말고
   * 할 수 있는 게 없었다. 시연 중에 이러면 발표자도 굳는다.
   */
  function showRecovery() {
    if (actions.dataset.shown) return;   // 오류가 여러 번 와도 한 번만 그린다
    actions.dataset.shown = '1';
    actions.innerHTML = `
      <div class="flex gap-2">
        ${handlers.onRetry ? `
          <button id="btn-stage-retry"
            class="flex-1 rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2.5 text-sm font-semibold text-white">
            다시 시도하기
          </button>` : ''}
        ${handlers.onNewTarget ? `
          <button id="btn-stage-back"
            class="rounded border border-line hover:border-mjcblue transition-colors px-4 py-2.5 text-sm text-maintext">
            목표 다시 입력
          </button>` : ''}
      </div>
    `;
    actions.querySelector('#btn-stage-retry')?.addEventListener('click', handlers.onRetry);
    actions.querySelector('#btn-stage-back')?.addEventListener('click', handlers.onNewTarget);
  }

  return function onStage(event) {
    const item = mount.querySelector(`.stage-item[data-stage="${event.stage}"]`);
    if (!item) {
      // 모르는 단계 이름으로 온 이벤트를 그냥 버리면,
      // 실패했을 때 화면이 스피너에서 영원히 멈춘 것처럼 보인다.
      // 최소한 오류 문구는 반드시 남긴다.
      if (event.status === 'error') {
        mount.querySelectorAll('.stage-ping').forEach((el) => el.classList.remove('animate-ping', 'opacity-60'));
        mount.querySelectorAll('.stage-icon').forEach((el) => {
          if (el.className.includes('border-mjcblue')) {
            el.className = ICON_ERROR;
            el.textContent = '⚠️';
          }
        });
        detail.innerHTML = `
          <p class="text-red-600 font-medium">${esc(event.message || '오류가 발생했어요')}</p>
          <p class="text-secondary text-xs mt-1">잠시 후 다시 시도해주세요.</p>`;
        showRecovery();
      }
      return;
    }
    const icon = item.querySelector('.stage-icon');
    const ping = item.querySelector('.stage-ping');
    const idx = STAGE_ORDER.indexOf(event.stage);

    if (event.status === 'start') {
      icon.className = ICON_ACTIVE;
      ping?.classList.add('animate-ping', 'opacity-60');
      // 진행 중인 문장은 딱 하나만 — 지나간 단계 문장까지 쌓아두지 않는다.
      detail.innerHTML = `<p class="text-base text-maintext font-medium leading-snug">${esc(STAGE_LABEL[event.stage])}</p>`;
    } else if (event.status === 'done') {
      icon.className = ICON_DONE;
      icon.textContent = '✓';
      ping?.classList.remove('animate-ping', 'opacity-60');
      const line = connectors()[idx];
      if (line) line.classList.replace('bg-line', 'bg-growth');

      // 역량·갭 목록은 문단이 아니라 알약 칩으로 — 근거 링크가 있으면 칩 자체가 링크가 된다.
      if (event.stage === STAGE.REQUIRED_SKILLS && Array.isArray(event.data)) {
        detail.innerHTML = chipStrip(event.data);
      } else if (event.stage === STAGE.GAP_ANALYSIS && Array.isArray(event.data)) {
        detail.innerHTML = chipStrip(event.data);
      } else {
        detail.innerHTML = '';
      }
    } else if (event.status === 'error') {
      icon.className = ICON_ERROR;
      icon.textContent = '⚠️';
      ping?.classList.remove('animate-ping', 'opacity-60');
      detail.innerHTML = `<p class="text-red-600 font-medium">${esc(event.message || '오류가 발생했어요')}</p>`;
      showRecovery();
    }
  };
}

function chipStrip(items) {
  if (!items.length) return '';
  return `<div class="flex flex-wrap justify-center gap-1.5">
    ${items
      .map((it) => {
        const label = esc(it.name);
        return it.sourceUrl
          ? `<a href="${esc(it.sourceUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-skysurface text-mjcblue text-xs font-medium hover:underline">${label}<span class="text-[10px]">↗</span></a>`
          : `<span class="inline-block px-2.5 py-1 rounded-full bg-skysurface text-mjcblue text-xs font-medium">${label}</span>`;
      })
      .join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// 화면 4 · 추천 리포트
// ═══════════════════════════════════════════════════════════

// 4개 관점을 데이터 그리드가 아니라 "댓글/리뷰창"처럼 보여준다 —
// 아바타(이니셜) + 이름 + 점수 배지 + 인용부호 코멘트 + 모델명(작성자 서명) 순서.
const PERSONA_AVATAR = {
  practitioner: { bg: 'bg-mjcblue', initial: '현' },
  professor:    { bg: 'bg-navy',    initial: '교' },
  senior:       { bg: 'bg-growth',  initial: '선' },
  market:       { bg: 'bg-amber-600', initial: '분' },
};

function personaGrid(personaScores) {
  return `
    <div class="mt-3 space-y-2">
      ${PERSONAS.map((p) => {
        const v = personaScores[p.key];
        if (!v) return '';
        // 점수가 없을 수 있다 (그 모델이 응답에 실패한 경우).
        // 이때 "null/10" 이 찍히면 안 된다 — 실패는 실패라고 적는다.
        const failed = !Number.isFinite(v.score);
        const avatar = PERSONA_AVATAR[p.key] || { bg: 'bg-secondary', initial: '?' };
        const scoreBadge = failed
          ? `<span class="shrink-0 text-[11px] font-medium text-secondary">응답 실패</span>`
          : `<span class="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-skysurface text-mjcblue text-[11px] font-bold font-mono">${v.score}/10</span>`;
        const model = PERSONA_MODEL[p.key] || '';
        return `
          <div class="flex gap-2.5 rounded-lg border border-line bg-white p-3 ${failed ? 'opacity-60' : ''}">
            <span class="shrink-0 w-8 h-8 rounded-full ${avatar.bg} text-white flex items-center justify-center text-xs font-bold">${avatar.initial}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-maintext">${esc(p.label)} <span class="font-normal text-secondary">· ${esc(p.sub)}</span></span>
                ${scoreBadge}
              </div>
              <p class="text-sm ${failed ? 'text-secondary' : 'text-maintext'} mt-1 leading-snug">${failed ? esc(v.comment || '이번엔 응답을 받지 못했어요.') : `“${esc(v.comment)}”`}</p>
              ${model ? `<p class="text-[10px] text-secondary mt-1">${esc(model)}</p>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

/** P0-2 모집 상태 배지 (개선사항.md 표기 그대로) */
const AVAILABILITY_META = {
  open:     { emoji: '🟢', label: '현재 모집 중' },
  upcoming: { emoji: '🔵', label: '모집 예정' },
  ongoing:  { emoji: '⚪', label: '상시 모집 중' },
  unknown:  { emoji: '🟡', label: '모집 일정 확인 필요' },
};

function availabilityBadge(match) {
  const meta = AVAILABILITY_META[match.availability] || AVAILABILITY_META.unknown;
  // ongoing("상시 모집 중")은 unknown과 달리 확신도가 높은 정보라 같은 긍정 톤을 준다.
  const tone = match.availability === 'open' || match.availability === 'upcoming' || match.availability === 'ongoing'
    ? 'bg-growth/10 text-growth'
    : 'bg-warn/15 text-amber-700';
  return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded ${tone} text-[11px] font-medium">
    ${meta.emoji} ${esc(meta.label)}
  </span>`;
}

/** P0-1 출처 검증 배지. null(검증 안 됨)이면 아무것도 그리지 않는다 — 검증은 있으면 좋은 정보이지 전제조건이 아니다. */
function sourceStatusBadge(match) {
  if (match.sourceStatus === 'verified') {
    return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-skysurface text-mjcblue text-[11px]">✅ 링크 확인됨</span>`;
  }
  if (match.sourceStatus === 'unverified') {
    return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warn/15 text-amber-700 text-[11px]">⚠️ 원문 확인 필요</span>`;
  }
  return '';
}

/** 신청/행사 기간 문구. 날짜가 하나도 없으면 availabilityReason이나 기존 안내문으로 대체한다. */
function periodText(match) {
  if (match.applicationStartAt || match.applicationEndAt) {
    return `신청 기간: ${esc(match.applicationStartAt || '?')} ~ ${esc(match.applicationEndAt || '확인 필요')}`;
  }
  if (match.eventStartAt || match.eventEndAt) {
    return `행사 기간: ${esc(match.eventStartAt || '?')} ~ ${esc(match.eventEndAt || '확인 필요')}`;
  }
  if (match.availability === 'unknown') {
    return '현재 모집 여부는 공식 공지에서 확인해주세요.';
  }
  return null;
}

/**
 * 공지 본문의 포스터.
 *
 * 교내 공지의 상당수는 본문이 포스터 한 장이라, 제목만으로는 무슨 프로그램인지 감이 안 온다.
 * 서버(api/verify-source)가 출처를 확인하면서 이미 받아둔 HTML 에서 꺼내 오므로
 * 추가 요청도 지연도 없다.
 *
 * ★깨진 이미지를 절대 보여주지 않는다.★
 *   onerror 에서 요소를 통째로 지운다 — 로드에 실패하면 엑스박스가 뜨는 게 아니라
 *   포스터가 없는 카드와 똑같아진다. 없는 편이 깨진 것보다 낫다.
 *   포스터가 1MB 를 넘는 경우도 있어 lazy 로 미룬다.
 */
function posterImage(match) {
  if (!match.poster) return '';
  return `
    <div class="poster-box mt-3 overflow-hidden rounded-lg border border-line bg-slate-50">
      <img src="${esc(match.poster)}" alt="${esc(match.programTitle)} 안내 포스터"
        loading="lazy" decoding="async"
        class="w-full max-h-72 object-contain"
        onerror="this.closest('.poster-box').remove()" />
    </div>`;
}

/**
 * 포스터가 제 시간에 안 오면 자리를 치운다.
 *
 * ★`onerror` 만으로는 부족하다.★ 그건 ★실패했을 때★ 뜨는 것이지,
 * ★끝나지 않는 요청★에는 뜨지 않는다. 학교 이미지 서버가 응답을 붙잡고 있으면
 * 로드 중도 실패도 아닌 상태로 ★빈 회색 상자★가 화면에 남는다.
 * 실제로 25초 넘게 그 상태인 것을 관측했다.
 *
 * 포스터는 있으면 좋은 것이지 없으면 안 되는 것이 아니다. 12초를 넘기면 조용히 지운다.
 */
function pruneStalePosters(mount, ms = 12_000) {
  setTimeout(() => {
    mount.querySelectorAll('.poster-box img').forEach((img) => {
      // complete && naturalWidth>0 이면 정상 로드된 것이다. 그 외는 치운다.
      if (!img.complete || img.naturalWidth === 0) img.closest('.poster-box')?.remove();
    });
  }, ms);
}

function programCard(match, index = 0) {
  // 담아둔 것인지 — 다시 그릴 때도 상태가 유지돼야 한다
  const saved = isSaved(match.programTitle);

  // 의견이 얼마나 갈렸는지는 항상 보여준다.
  // 0.5 이상일 때만 배지를 띄우면, 대부분의 카드에서 "왜 모델을 4개 쓰는가"에 대한
  // 화면상의 답이 사라진다. 갈린 정도를 수치로 늘 적고, 크게 갈렸을 때만 강조한다.
  const scores = Object.values(match.personaScores || {})
    .map((v) => v.score)
    .filter(Number.isFinite);
  const spread = scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : 0;
  const disagreementBadge = scores.length < 2
    ? ''
    : match.disagreement >= 0.5
      ? `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-warn/20 text-amber-700 text-[11px] font-medium">⚡ 의견이 갈렸어요 · ${spread}점 차</span>`
      : `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-slate-100 text-secondary text-[11px]">4개 관점 ${spread}점 차</span>`;

  // ★ 이 항목이 실시간 검색에서 왔는지, 미리 수집해둔 데이터에서 왔는지 숨기지 않는다.
  //   "실시간 검색"이라고 말한 화면에 수집 데이터가 표시 없이 섞이면 그게 약점이 된다.
  //   구분해서 적으면 오히려 근거가 된다.
  const originBadge = match.origin === 'collected'
    ? `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-skysurface text-mjcblue text-[11px]">사전 조사 자료</span>`
    : `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-growth/10 text-growth text-[11px]">방금 검색한 결과</span>`;

  const period = periodText(match);
  const searchQuery = encodeURIComponent(`site:mjc.ac.kr "${match.programTitle}"`);

  return `
    <div class="animate-fade-up rounded-lg border border-line bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5" style="animation-delay:${Math.min(index, 8) * 70}ms" data-match-id="${esc(match.id)}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <!-- break-words: 제목·요약은 AI가 쓴 문자열이라 길이를 보장할 수 없다.
               한글은 word-break:keep-all 이 공백에서만 끊으므로, 공백 없는 긴 문자열이 오면
               카드를 뚫고 페이지 전체에 가로 스크롤이 생긴다. -->
          <h4 class="text-base font-semibold text-maintext break-words">${esc(match.programTitle)}</h4>
          <p class="text-sm text-secondary mt-1 break-words leading-relaxed">${esc(match.summary)}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          ${availabilityBadge(match)}
          ${originBadge}
          ${disagreementBadge}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 text-xs text-secondary">
        ${sourceStatusBadge(match)}
        <span>${esc(match.sourceDomain)}</span>
        ${match.postedAt ? `<span>게시일 ${esc(match.postedAt)}</span>` : ''}
      </div>
      ${period ? `<p class="text-xs text-secondary mt-1">${period}</p>` : ''}

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
        <a href="${esc(match.sourceUrl)}" target="_blank" rel="noopener" class="text-mjcblue hover:underline">공식 공지 열기 ↗</a>
        <button type="button" class="btn-copy-link text-secondary hover:text-maintext" data-url="${esc(match.sourceUrl)}">링크 복사</button>
        <a href="https://www.google.com/search?q=${searchQuery}" target="_blank" rel="noopener" class="text-secondary hover:text-maintext">다른 검색으로 찾아보기 ↗</a>
      </div>

      ${posterImage(match)}

      <div class="mt-4 pt-4 border-t border-line">
        <p class="text-xs font-semibold text-secondary mb-2">4개 관점 코멘트</p>
        ${personaGrid(match.personaScores)}
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <label class="complete-label flex items-center gap-2 text-sm ${match.isCompleted ? 'text-mjcblue' : 'text-maintext'}">
          <input type="checkbox" class="complete-checkbox rounded bg-white border-line" ${match.isCompleted ? 'checked disabled' : ''} />
          <span class="complete-label-text">${match.isCompleted ? '참여 완료 · 프로필에 반영됨' : '참여했어요'}</span>
        </label>

        <!-- ★"관심 있다"와 "참여했다"는 다른 상태다.★
             전에는 「참여했어요」 하나뿐이라, 아직 신청도 안 한 프로그램을
             담아둘 곳이 없었다. 잊어버리거나, 참여하지도 않고 체크를 누르게 된다.
             노란 계열로 눈에 띄게 — 옅은 테두리 링크였을 때는 있는 기능인지도 몰랐다. -->
        ${match.isCompleted ? '' : `
        <button type="button"
          class="btn-save shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors
                 ${saved ? 'border-amber-500 bg-amber-500 text-white shadow-sm' : 'border-amber-300 bg-warn/15 text-amber-800 hover:bg-warn/30 hover:border-amber-400'}"
          aria-pressed="${saved}">
          ${saved ? '★ 담아둠' : '☆ 담아두기'}
        </button>`}
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} mount
 * @param {import('./types.js').Target} target
 * @param {import('./types.js').ProgramMatch[]} matches
 * @param {{onComplete: (match: import('./types.js').ProgramMatch) => void, onNewTarget: () => void}} handlers
 * @param {{droppedForSource?: number, supplementedCount?: number}} [meta]  검색이 실제로 무엇을 거르고 보충했는지
 */
export function renderReport(mount, target, matches, { onComplete, onNewTarget, onToggleSave }, meta = {}) {
  const byGap = new Map();
  for (const m of matches) {
    if (!byGap.has(m.gapSkill)) byGap.set(m.gapSkill, []);
    byGap.get(m.gapSkill).push(m);
  }

  // ★ "출처가 확인되지 않아 표시하지 않습니다"를 매번 똑같이 띄우면,
  //   실제로 몇 건이 걸러졌는지 모른 채 "그럼 왜 출처 없는 걸 쓰냐"는 의문만 남는다.
  //   pipeline.js가 이미 세고 있는 실제 수치(droppedForSource·supplementedCount)를 그대로 보여준다 —
  //   0건이면 "필터링 없음"이라고 정직하게 적는다.
  const dropped = meta.droppedForSource ?? 0;
  const supplemented = meta.supplementedCount ?? 0;
  const droppedSchedule = meta.droppedForSchedule ?? 0;
  const droppedBroken = meta.droppedForBrokenLink ?? 0;
  const sourceNote = [
    dropped > 0 ? `출처 없는 항목 ${dropped}건 제외` : '',
    droppedSchedule > 0 ? `마감·종료된 프로그램 ${droppedSchedule}건 제외` : '',
    droppedBroken > 0 ? `접속되지 않는 링크 ${droppedBroken}건 제외` : '',
    supplemented > 0 ? `실시간 검색이 못 채운 ${supplemented}건은 직접 수집한 데이터로 보충` : '',
  ].filter(Boolean).join(' · ')
    // 0건일 때 "전부 표시합니다"라고 적으면, 바로 아래 "찾지 못했습니다"와 나란히 붙어
    // 앞뒤가 안 맞는 화면이 된다. 결과가 없을 때는 이 줄을 아예 비운다.
    || (byGap.size === 0 ? '' : '이번 검색은 걸러진 항목 없이 전부 표시합니다');

  mount.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <h2 class="text-xl font-bold break-words">"${esc(target.companyOrRole)}"에 필요한 걸 채워드릴게요</h2>
    </div>
    <p class="text-sm text-secondary mb-1">${DISCLAIMER.ELIGIBILITY}</p>
    <p class="text-xs text-secondary mb-2">${esc(sourceNote)}</p>
    <!-- 판별의 한계를 결과 위에 먼저 밝힌다. 발견한 뒤에 알게 되면 신뢰가 깎인다. -->
    <p class="text-xs text-amber-700/80 mb-6">⚠ ${DISCLAIMER.PURITY}</p>

    <div class="space-y-8">
      ${byGap.size === 0 ? `
        <div class="rounded-lg border border-line bg-white shadow-sm p-6 text-center">
          <p class="text-maintext font-medium">지금 확인되는 교내 프로그램을 찾지 못했습니다.</p>
          <p class="text-sm text-secondary mt-2 leading-relaxed">
            출처가 없거나 링크가 열리지 않는 항목은 표시하지 않습니다.<br>
            목표를 조금 넓게 적으면 (예: "게임 개발자" → "소프트웨어 개발자") 결과가 나올 수 있습니다.
          </p>
        </div>` : ''}
      ${(() => {
        let cardIndex = 0;
        return [...byGap.entries()]
          .map(
            ([gap, list]) => `
        <section>
          <h3 class="text-sm font-semibold text-mjcblue mb-3">"${esc(gap)}" 관련 프로그램</h3>
          <div class="space-y-3">${list.map((m) => programCard(m, cardIndex++)).join('')}</div>
        </section>`
          )
          .join('');
      })()}
    </div>

    <button id="btn-new-target"
      class="w-full mt-8 rounded border border-line hover:border-mjcblue transition-colors py-2.5 text-sm font-medium text-maintext">
      새 목표로 다시 찾아보기
    </button>
  `;

  mount.querySelectorAll('.btn-copy-link').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.url);
        const original = btn.textContent;
        btn.textContent = '복사됨';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch {
        // 클립보드 권한이 없는 환경(예: http)도 있다 — 조용히 무시, 다른 버튼은 여전히 동작한다
      }
    });
  });

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
      label.classList.remove('text-maintext');
      label.classList.add('text-mjcblue');
      card.querySelector('.complete-label-text').textContent = '참여 완료 · 프로필에 반영됨';
      // 참여했으면 담아둘 이유가 없다 (profile.js 가 목록에서도 뺀다)
      card.querySelector('.btn-save')?.remove();
    });
  });

  // ── 담아두기 ──
  //   토글이다. 다시 누르면 뺀다. 화면 전체를 다시 그리지 않고 이 버튼만 갱신한다.
  mount.querySelectorAll('.btn-save').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-match-id]');
      const match = matches.find((m) => m.id === card.dataset.matchId);
      if (!match) return;

      const nowSaved = btn.getAttribute('aria-pressed') !== 'true';
      onToggleSave?.(match, nowSaved);

      btn.setAttribute('aria-pressed', String(nowSaved));
      btn.textContent = nowSaved ? '★ 담아둠' : '☆ 담아두기';
      btn.className = `btn-save shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors
                 ${nowSaved ? 'border-amber-500 bg-amber-500 text-white shadow-sm' : 'border-amber-300 bg-warn/15 text-amber-800 hover:bg-warn/30 hover:border-amber-400'}`;
    });
  });

  mount.querySelector('#btn-new-target').addEventListener('click', onNewTarget);

  // 응답이 오지 않는 포스터는 자리를 비운다 (빈 회색 상자가 남지 않게)
  pruneStalePosters(mount);
}

// ═══════════════════════════════════════════════════════════
// 화면 5 · 마이 프로필
// ═══════════════════════════════════════════════════════════

/**
 * 기술을 "직접 입력"과 "프로그램 이수"로 나눈다.
 * 후자는 completedActivities와 연결돼 있어 수정 화면에서 자유 편집을 막는다
 * (개선사항.md P0-3 §5 — 지우면 이행 이력과 어긋난다는 걸 알려야 함).
 */
function splitSkills(skills) {
  const list = skills || [];
  const earned = list.filter((s) => typeof s !== 'string' && s?.level === '프로그램 이수');
  const direct = list.filter((s) => !earned.includes(s));
  return { direct, earned };
}

/**
 * @param {HTMLElement} mount
 * @param {import('./types.js').Profile} profile
 * @param {{onNewTarget: () => void, onSave: (partial: object) => void, onReset: () => void}} handlers
 */
export function renderProfile(mount, profile, handlers) {
  renderProfileView(mount, profile, handlers);
}

function renderProfileView(mount, profile, handlers) {
  const { onNewTarget, onBackToReport } = handlers;
  // 손으로 편집됐거나 옛 버전이 만든 프로필이면 이 배열이 없을 수 있다.
  // 다른 읽기 지점은 전부 `|| []` 로 감싸져 있는데 여기만 빠져 있었다 —
  // 없으면 마이 프로필 화면 전체가 백지가 된다.
  const done = profile.completedActivities || [];
  // savedPrograms 는 나중에 추가된 항목이라 옛 프로필에는 없다
  const saved = profile.savedPrograms || [];
  const skillCount = (profile.skills || []).length;
  // design.md 6절 "Growth bridge" — 현재 상태 → 역량 → 목표를 파란 노드/선으로 잇고,
  // 실제로 달성된 구간만 초록으로 강조한다. 모션 없는 정적 표시로 유지한다 (8절 "모션은 절제되게").
  const growthPath = `
    <div class="flex items-start justify-between mb-6" aria-hidden="true">
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center">${icon('user', 'w-6 h-6')}</span>
        <span class="text-xs text-secondary text-center leading-tight">${esc(profile.department)}</span>
      </div>
      <div class="flex-1 h-px bg-mjcblue/30 mt-6"></div>
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="w-12 h-12 rounded-full bg-mjcblue text-white flex items-center justify-center">${icon('zap', 'w-6 h-6')}</span>
        <span class="text-xs text-secondary text-center leading-tight">보유 기술 ${skillCount}개</span>
      </div>
      <div class="flex-1 h-px ${done.length ? 'bg-growth' : 'bg-mjcblue/30'} mt-6"></div>
      <div class="flex flex-col items-center gap-2 flex-1">
        <span class="w-12 h-12 rounded-full flex items-center justify-center ${done.length ? 'bg-growth text-white animate-pop' : 'bg-white border-2 border-mjcblue/30 text-mjcblue/40'}">${icon('target', 'w-6 h-6')}</span>
        <span class="text-xs ${done.length ? 'text-growth font-medium' : 'text-secondary'} text-center leading-tight">완료한 활동 ${done.length}개</span>
      </div>
    </div>
  `;

  mount.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <h2 class="text-xl font-bold">내 프로필</h2>
      <button id="btn-profile-edit" class="text-xs text-mjcblue hover:underline">프로필 수정</button>
    </div>

    ${growthPath}

    <div class="rounded-lg border border-line bg-white shadow-sm p-4 space-y-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><span class="text-secondary">학년</span><p class="text-maintext">${profile.grade}학년</p></div>
        <div><span class="text-secondary">학과</span><p class="text-maintext">${esc(profile.department)}</p></div>
      </div>

      <div>
        <span class="text-sm text-secondary">보유 자격증</span>
        <div class="mt-1">${chipList(profile.certificates)}</div>
      </div>

      <div>
        <span class="text-sm text-secondary">보유 기술</span>
        <div class="mt-1">${chipList(profile.skills)}</div>
      </div>

      <div>
        <span class="text-sm text-secondary">완료한 활동 (${done.length})</span>
        ${
          done.length
            ? `<ul class="mt-1 space-y-1 text-sm text-maintext">
                ${done
                  .map((a) => `<li class="break-words">· ${esc(a.programTitle)} <span class="text-secondary">— ${esc(a.gainedSkill)} 역량 획득</span></li>`)
                  .join('')}
               </ul>`
            : '<p class="mt-1 text-sm text-secondary">아직 없어요. 추천받은 프로그램에 참여하면 여기 쌓여요.</p>'
        }
      </div>
    </div>

    <!-- ──────────────────────────────────────────────
         담아둔 프로그램.
         결과 화면은 목표를 바꾸면 사라진다. 담아둔 것은 여기 남아서,
         실제로 참여한 뒤에 체크할 수 있어야 성장 루프가 이어진다.
              찾기 → ★담기★ → 참여 → 쌓임
         ────────────────────────────────────────────── -->
    ${
      saved.length
        ? `<section class="mt-6">
            <h3 class="text-sm font-semibold text-maintext mb-2">담아둔 프로그램 (${saved.length})</h3>
            <p class="text-xs text-secondary mb-3">참여하셨다면 체크해주세요. 보유 기술에 반영되고 목록에서 빠집니다.</p>
            <ul class="space-y-2">
              ${saved.map((s) => `
                <li data-saved-title="${esc(s.programTitle)}"
                    class="rounded-lg border border-line bg-white p-3">
                  <p class="text-sm font-medium text-maintext break-words">${esc(s.programTitle)}</p>
                  ${s.summary ? `<p class="text-xs text-secondary mt-0.5 break-words">${esc(s.summary)}</p>` : ''}
                  <p class="text-xs text-secondary mt-1">채우려던 역량: ${esc(s.gapSkill)}</p>
                  <div class="flex items-center justify-between gap-3 mt-2">
                    <label class="flex items-center gap-2 text-sm text-maintext">
                      <input type="checkbox" class="saved-complete rounded bg-white border-line" />
                      참여했어요
                    </label>
                    <div class="flex items-center gap-3 text-xs">
                      ${s.sourceUrl ? `<a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener" class="text-mjcblue hover:underline">공지 열기 ↗</a>` : ''}
                      <button type="button" class="saved-remove text-secondary hover:text-red-600">빼기</button>
                    </div>
                  </div>
                </li>`).join('')}
            </ul>
          </section>`
        : ''
    }

    ${
      onBackToReport
        ? `<button id="btn-profile-back"
             class="w-full mt-6 rounded border border-mjcblue/40 hover:border-mjcblue transition-colors py-2.5 text-sm font-semibold text-mjcblue">
             ← 방금 본 추천 결과로 돌아가기
           </button>`
        : ''
    }

    <button id="btn-profile-new-target"
      class="w-full ${onBackToReport ? 'mt-3' : 'mt-6'} rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2.5 text-sm font-semibold text-white">
      새 목표 설정하기
    </button>

    <!-- ──────────────────────────────────────────────
         내 데이터 — 이 앱에는 서버 계정이 없다.
         프로필은 이 브라우저에만 있으므로, 브라우저를 바꾸거나
         방문 기록을 지우면 쌓아온 활동 기록이 사라진다.
         파일로 들고 갈 길을 열어둔다.
         ────────────────────────────────────────────── -->
    <details class="mt-8 rounded-lg border border-line bg-white">
      <summary class="cursor-pointer select-none px-4 py-3 text-sm text-maintext hover:text-mjcblue">
        내 데이터 관리
      </summary>
      <div class="border-t border-line px-4 py-4 space-y-3">
        <p class="text-xs text-secondary leading-relaxed">
          이 서비스는 서버에 계정을 두지 않습니다. 프로필은 <strong class="text-maintext">이 브라우저에만</strong> 저장되므로,
          브라우저를 바꾸거나 방문 기록을 지우면 사라집니다. 파일로 내보내 두면 다른 기기에서 이어서 쓸 수 있습니다.
        </p>

        <div class="grid grid-cols-2 gap-2">
          <button id="btn-data-export"
            class="rounded border border-line hover:border-mjcblue transition-colors py-2 text-xs text-maintext">
            내보내기 (.json)
          </button>
          <button id="btn-data-import"
            class="rounded border border-line hover:border-mjcblue transition-colors py-2 text-xs text-maintext">
            불러오기
          </button>
        </div>
        <input id="input-data-import" type="file" accept="application/json,.json" class="hidden" />

        <button id="btn-data-cache"
          class="w-full rounded border border-line hover:border-mjcblue transition-colors py-2 text-xs text-maintext">
          저장된 AI 응답 비우기
        </button>
        <p class="text-xs text-secondary leading-relaxed">
          같은 질문을 12시간 안에 다시 하면 크레딧을 쓰지 않고 저장해둔 답을 재사용합니다.
          <strong class="text-secondary">최신 공지로 다시 검색하고 싶을 때</strong> 비우세요. 프로필은 지워지지 않습니다.
        </p>

        <!-- ──────────────────────────────────────────────
             지금 이 브라우저에 무엇이 저장돼 있는가.
             "서버에 계정이 없다"고 말하려면 대신 여기 무엇을 두고 있는지
             ★사용자가 직접 확인하고 지울 수 있어야 한다.★
             ────────────────────────────────────────────── -->
        <div class="pt-3 mt-1 border-t border-line">
          <p class="text-xs text-maintext mb-2">지금 이 브라우저에 저장된 것</p>
          <ul id="data-inventory" class="text-xs text-secondary space-y-1"></ul>
          <p class="text-xs text-secondary mt-2 leading-relaxed">
            전부 지우려면 아래 <strong class="text-maintext">전부 지우고 처음부터</strong>를 누르세요.
            <strong class="text-maintext">공용 PC에서 자리를 뜨기 전</strong>에 눌러주시면 좋습니다.
          </p>
        </div>

        <p id="data-msg" class="text-xs min-h-[1rem]" role="status" aria-live="polite"></p>
      </div>
    </details>

    <!-- 되돌릴 수 없는 동작은 ★하나만★ 둔다.
         전에는 '프로필 초기화'가 4개 중 3개(프로필·캐시·키)만 지우고
         mypath.usage 를 남겨서, 완전히 되돌리려면 개발자도구가 필요했다.
         비슷한 버튼을 하나 더 만들면 둘 다 무섭고 무엇이 다른지 알 수 없다. -->
    <button id="btn-profile-reset"
      class="w-full mt-3 text-xs text-secondary hover:text-red-600 transition-colors py-1">
      전부 지우고 처음부터
    </button>
  `;

  // ── 담아둔 목록 ──
  mount.querySelectorAll('.saved-complete').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      const title = e.target.closest('[data-saved-title]').dataset.savedTitle;
      const item = saved.find((s) => s.programTitle === title);
      if (!item) return;
      // 담아둘 때 저장해 둔 값으로 이행 처리한다 (결과 화면이 없어도 동작해야 한다)
      handlers.onCompleteSaved?.({
        programTitle: item.programTitle,
        gapSkill: item.gapSkill,
        sourceUrl: item.sourceUrl,
      });
    });
  });

  mount.querySelectorAll('.saved-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const title = e.target.closest('[data-saved-title]').dataset.savedTitle;
      handlers.onRemoveSaved?.(title);
    });
  });

  mount.querySelector('#btn-profile-new-target').addEventListener('click', onNewTarget);
  mount.querySelector('#btn-profile-edit').addEventListener('click', () => renderProfileEdit(mount, profile, handlers));
  mount.querySelector('#btn-profile-reset').addEventListener('click', () => confirmNuke(mount, handlers));
  if (onBackToReport) mount.querySelector('#btn-profile-back').addEventListener('click', onBackToReport);

  wireDataControls(mount, profile, handlers);
}

// ─────────────────────────────────────────────
//  내 데이터 관리 — 내보내기 · 불러오기 · 캐시 비우기
// ─────────────────────────────────────────────

function wireDataControls(mount, profile, handlers) {
  const msg = mount.querySelector('#data-msg');
  const say = (text, ok = true) => {
    msg.textContent = text;
    msg.className = `text-xs min-h-[1rem] ${ok ? 'text-growth' : 'text-red-600'}`;
  };

  // ── 저장 목록 ──
  //   무엇이 저장돼 있는지 보여주지 않으면 "전부 지우기"가 무엇을 지우는지 알 수 없다.
  const inventory = mount.querySelector('#data-inventory');
  function drawInventory() {
    const items = listStoredData();
    if (!items.length) {
      inventory.innerHTML = '<li class="text-secondary">저장된 것이 없습니다.</li>';
      return;
    }
    // 같은 종류(AI 응답)는 묶어서 센다 — 캐시가 수십 개면 목록이 화면을 덮는다
    const grouped = new Map();
    for (const it of items) {
      const g = grouped.get(it.label) || { count: 0, bytes: 0, sensitive: it.sensitive };
      grouped.set(it.label, { count: g.count + 1, bytes: g.bytes + it.bytes, sensitive: g.sensitive });
    }
    inventory.innerHTML = [...grouped.entries()].map(([label, g]) => `
      <li class="flex items-center justify-between gap-2">
        <span>${esc(label)}${g.count > 1 ? ` <span class="text-secondary">× ${g.count}</span>` : ''}
          ${g.sensitive ? '<span class="ml-1 text-red-600">● 민감</span>' : ''}</span>
        <span class="tabular-nums text-secondary">${fmtBytes(g.bytes)}</span>
      </li>`).join('');
  }
  drawInventory();

  // ── 내보내기 ──
  mount.querySelector('#btn-data-export').addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify(exportProfile(), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename(profile);
      a.click();
      // 브라우저가 다운로드를 시작할 시간을 준 뒤 해제한다
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say(`${exportFilename(profile)} 으로 저장했습니다.`);
    } catch (e) {
      say(e?.message || '내보내기에 실패했습니다.', false);
    }
  });

  // ── 불러오기 ──
  const fileInput = mount.querySelector('#input-data-import');
  mount.querySelector('#btn-data-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const next = importProfile(await file.text());
      say(`불러왔습니다 — ${next.department || '학과 미입력'} · 완료한 활동 ${(next.completedActivities || []).length}건`);
      // 화면을 새 프로필로 다시 그린다
      setTimeout(() => handlers.onImported?.(next), 600);
    } catch (e) {
      say(e?.message || '불러오기에 실패했습니다.', false);
    } finally {
      fileInput.value = '';   // 같은 파일을 다시 골라도 change 가 뜨게
    }
  });

  // ── 캐시 비우기 ──
  mount.querySelector('#btn-data-cache').addEventListener('click', (e) => {
    const n = clearCache();
    say(n ? `저장된 응답 ${n}건을 비웠습니다. 다음 분석은 새로 검색합니다.` : '비울 응답이 없습니다.');
    drawInventory();
    e.target.blur();
  });

}

/** 바이트를 사람이 읽는 단위로 */
function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * "전부 지우고 처음부터" 확인창.
 *
 * ★무엇이 지워지는지 목록으로 보여준 뒤에 묻는다.★
 * 되돌릴 수 없는 일에 "정말요?"만 묻는 것은 확인이 아니다.
 * 특히 여기에는 API 키가 들어 있어서, 지운다는 사실을 모르고 누르면 안 된다.
 */
function confirmNuke(mount, handlers) {
  if (document.getElementById('nuke-confirm')) return;

  const items = listStoredData();
  const grouped = new Map();
  for (const it of items) {
    const g = grouped.get(it.label) || { count: 0, sensitive: it.sensitive };
    grouped.set(it.label, { count: g.count + 1, sensitive: g.sensitive });
  }

  const el = document.createElement('div');
  el.id = 'nuke-confirm';
  el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4';
  el.innerHTML = `
    <div class="w-full max-w-sm rounded-lg border border-line bg-white p-6" role="dialog" aria-modal="true">
      <p class="text-maintext font-medium mb-1">이 사이트가 저장한 것을 전부 지울까요?</p>
      <p class="text-sm text-secondary mb-3">되돌릴 수 없습니다.</p>

      <ul class="text-xs text-maintext space-y-1 mb-3 rounded border border-line bg-slate-50 px-3 py-2">
        ${[...grouped.entries()].map(([label, g]) => `
          <li>· ${esc(label)}${g.count > 1 ? ` × ${g.count}` : ''}
            ${g.sensitive ? '<span class="text-red-600">(민감)</span>' : ''}</li>`).join('')
          || '<li class="text-secondary">지울 것이 없습니다.</li>'}
      </ul>

      <p class="text-xs text-secondary mb-5 leading-relaxed">
        기록을 남겨두려면 먼저 <strong class="text-maintext">내보내기</strong>를 이용하세요.
        다른 사이트의 저장값은 건드리지 않습니다.
      </p>

      <div class="flex gap-2">
        <button id="nuke-cancel" class="flex-1 rounded border border-line hover:border-mjcblue transition-colors py-2 text-sm text-maintext">취소</button>
        <button id="nuke-go" class="flex-1 rounded bg-red-600 hover:bg-red-500 transition-colors py-2 text-sm font-medium text-white">전부 지우기</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => el.remove();
  el.querySelector('#nuke-cancel').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  el.querySelector('#nuke-go').addEventListener('click', () => {
    close();
    const n = clearAllStoredData();
    handlers.onWipedAll?.(n);
  });
}

function renderProfileEdit(mount, profile, handlers) {
  const { direct, earned } = splitSkills(profile.skills);
  const pref = profile.traits?.activityPreference || null;

  mount.innerHTML = `
    <h2 class="text-xl font-bold mb-6">프로필 수정</h2>

    <form id="form-profile-edit" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-sm text-maintext">학년</span>
          <select name="grade" class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm">
            ${[1, 2, 3].map((g) => `<option value="${g}" ${profile.grade === g ? 'selected' : ''}>${g}학년</option>`).join('')}
          </select>
        </label>
        <label class="block">
          <span class="text-sm text-maintext">나이 <span class="text-secondary">(선택)</span></span>
          <input name="age" type="number" min="15" max="99" value="${profile.age ?? ''}"
            class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
        </label>
      </div>

      <label class="block">
        <span class="text-sm text-maintext">학과</span>
        <input name="department" type="text" required value="${esc(profile.department)}"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-maintext">보유 자격증 <span class="text-secondary">(쉼표로 구분)</span></span>
        <input name="certificates" type="text" value="${esc((profile.certificates || []).join(', '))}"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-maintext">보유 기술 <span class="text-secondary">(직접 입력한 것만 — 쉼표로 구분)</span></span>
        <input name="skills" type="text" value="${esc(direct.map(normSkillName).join(', '))}"
          class="mt-1 w-full rounded bg-white border border-line px-3 py-2 text-sm" />
      </label>

      ${
        earned.length
          ? `<div class="rounded border border-line bg-skysurface p-3">
              <p class="text-xs text-secondary mb-1.5">활동으로 얻은 기술 <span class="text-secondary">(여기서 수정할 수 없음)</span></p>
              <div>${chipList(earned)}</div>
              <p class="text-xs text-secondary mt-2 leading-relaxed">
                이 기술은 완료한 활동과 연결되어 있습니다.
                내 프로필 화면에서 해당 활동 기록을 취소하면 함께 사라집니다.
              </p>
            </div>`
          : ''
      }

      <fieldset class="pt-2">
        <legend class="text-sm text-maintext mb-2">활동 스타일 <span class="text-secondary">(선택)</span></legend>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="team" class="bg-white border-line" ${pref === 'team' ? 'checked' : ''} /> 팀 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="solo" class="bg-white border-line" ${pref === 'solo' ? 'checked' : ''} /> 개인 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="" class="bg-white border-line" ${!pref ? 'checked' : ''} /> 선택 안 함
          </label>
        </div>
      </fieldset>

      <div class="flex gap-2 pt-2">
        <button type="submit" class="flex-1 rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2.5 text-sm font-semibold text-white">저장하기</button>
        <button type="button" id="btn-profile-cancel" class="rounded border border-line hover:border-mjcblue transition-colors px-4 py-2.5 text-sm text-maintext">취소</button>
      </div>
    </form>
  `;

  const form = mount.querySelector('#form-profile-edit');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const toList = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    handlers.onSave({
      grade: Number(fd.get('grade')),
      age: fd.get('age') ? Number(fd.get('age')) : null,
      department: String(fd.get('department') || '').trim(),
      certificates: toList(fd.get('certificates')),
      // 직접 입력 기술 + 프로그램 이수 기술(그대로 보존)을 합친다
      skills: [...toList(fd.get('skills')), ...earned],
      activityPreference: fd.get('activityPreference') || null,
    });
  });

  mount.querySelector('#btn-profile-cancel').addEventListener('click', () => renderProfileView(mount, profile, handlers));
}

function normSkillName(s) {
  return typeof s === 'string' ? s : String(s?.name ?? '');
}

// confirmReset 은 confirmNuke 로 합쳤다.
//   전에는 '프로필 초기화'가 프로필·캐시·키 3가지만 지우고 mypath.usage(크레딧 누적)를 남겼다.
//   그래서 크레딧 배지에 앞선 사용량이 계속 떠 있었고, 완전히 되돌리려면
//   개발자도구에서 localStorage.clear() 를 쳐야 했다.
//   되돌릴 수 없는 버튼을 두 개 두면 둘 다 무섭고 무엇이 다른지 알 수 없으므로 하나로 합쳤다.

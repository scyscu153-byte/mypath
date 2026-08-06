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
import { PERSONA_MODEL } from './gateway.js';

/** 간단한 HTML 이스케이프 — 사용자가 입력한 텍스트를 그대로 innerHTML에 꽂을 때 사용 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * 기술 항목은 두 가지 형태로 들어온다.
 *   - 온보딩에서 직접 입력한 것          → 'C#'            (문자열)
 *   - 프로그램 이수로 자동으로 쌓인 것    → {name, level}   (객체)
 * 그냥 esc() 하면 객체는 "[object Object]" 가 된다.
 * 성장 루프(이행 체크 → 내 프로필)를 누르면 반드시 지나가는 경로다.
 */
function chipList(items) {
  if (!items || items.length === 0) return '<span class="text-slate-500">없음</span>';
  return items
    .map((i) => {
      const name = typeof i === 'string' ? i : String(i?.name ?? '');
      const level = typeof i === 'string' ? '' : String(i?.level ?? '');
      if (!name) return '';
      const suffix = level ? `<span class="text-slate-400"> · ${esc(level)}</span>` : '';
      return `<span class="inline-block px-2 py-0.5 mr-1 mb-1 rounded bg-ink-700 text-xs text-slate-200">${esc(name)}${suffix}</span>`;
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

      <!--
        ★ 특정 대상에게만 열려 있는 프로그램을 아무에게나 띄우지 않기 위한 선택 항목.
          체크하지 않으면 해당 프로그램을 추천하지 않고, 체크하면 정상적으로 함께 찾는다.
          "자격을 판정하지 않는다"는 원칙과 어긋나지 않는다 —
          우리가 판정하는 게 아니라 ★본인이 직접 선택★하는 것이다.
      -->
      <fieldset class="pt-1">
        <legend class="text-sm text-slate-300 mb-2">
          지원 대상 <span class="text-slate-500">(선택 — 해당하면 관련 프로그램도 함께 찾아드려요)</span>
        </legend>
        <label class="flex items-start gap-2">
          <input name="supportDisability" type="checkbox" class="mt-1 rounded bg-ink-800 border-ink-600" />
          <span class="text-sm text-slate-300">
            장애학생 지원 대상입니다
            <span class="block text-xs text-slate-500">
              체크하지 않으면 장애학생 대상 프로그램은 추천에서 제외합니다.
              이 정보는 이 브라우저에만 저장되며 어디로도 전송되지 않습니다.
            </span>
          </span>
        </label>
      </fieldset>

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

      <label class="block">
        <span class="text-sm text-slate-300">실제 채용공고 링크 <span class="text-slate-500">(선택 — 넣으면 그 공고를 직접 근거로 분석해요)</span></span>
        <input name="jobPostingUrl" type="url" placeholder="예: https://careers.example.com/jobs/1234"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">관심 분야 <span class="text-slate-500">(선택 — 전공과 관련 없어도 참여하고 싶은 분야)</span></span>
        <input name="interestAreas" type="text" placeholder="예: 어학, 자격증, 봉사활동"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
        <span class="mt-1 block text-xs text-slate-500">부족한 역량과 별개로, 이 분야 프로그램도 따로 찾아드려요.</span>
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
    if (!li) {
      // 모르는 단계 이름으로 온 이벤트를 그냥 버리면,
      // 실패했을 때 화면이 스피너에서 영원히 멈춘 것처럼 보인다.
      // 최소한 오류 문구는 반드시 남긴다.
      if (event.status === 'error') {
        mount.querySelectorAll('.stage-icon.animate-spin').forEach((el) => {
          el.outerHTML = '<span class="stage-icon w-4 h-4 shrink-0 rounded-full bg-red-500"></span>';
        });
        detail.insertAdjacentHTML('beforeend',
          `<p class="text-red-400">${esc(event.message || '오류가 발생했어요')}</p>
           <p class="text-slate-500 text-xs">잠시 후 다시 시도해주세요.</p>`);
      }
      return;
    }
    const icon = li.querySelector('.stage-icon');

    if (event.status === 'start') {
      li.classList.remove('text-slate-400');
      li.classList.add('text-slate-100');
      icon.outerHTML = `<span class="stage-icon w-4 h-4 shrink-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin"></span>`;
    } else if (event.status === 'done') {
      const doneIcon = li.querySelector('.stage-icon');
      doneIcon.outerHTML = `<span class="stage-icon w-4 h-4 shrink-0 rounded-full bg-brand-500 flex items-center justify-center text-[10px] text-white">✓</span>`;

      if (event.stage === STAGE.REQUIRED_SKILLS && Array.isArray(event.data)) {
        // 역량 이름만 나열하면 "이거 출처 있는 거 맞아?"라는 질문에 답할 수 없다.
        // 실제 채용공고 URL을 눈으로 확인할 수 있게 링크로 건다.
        detail.insertAdjacentHTML(
          'beforeend',
          `<p><strong class="text-slate-300">요구 역량:</strong></p>
           <ul class="mt-1 space-y-0.5">
             ${event.data
               .map(
                 (s) => `<li>${esc(s.name)}
                   ${s.sourceUrl ? `<a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener" class="text-brand-400 hover:underline">(근거 보기 ↗)</a>` : ''}
                 </li>`
               )
               .join('')}
           </ul>`
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
        // 점수가 없을 수 있다 (그 모델이 응답에 실패한 경우).
        // 이때 "null/10" 이 찍히면 안 된다 — 실패는 실패라고 적는다.
        const failed = !Number.isFinite(v.score);
        const scoreCell = failed
          ? `<span class="font-mono text-slate-600">– /10</span>`
          : `<span class="font-mono text-brand-400">${v.score}/10</span>`;
        const model = PERSONA_MODEL[p.key] || '';
        return `
          <div class="rounded bg-ink-800 border border-ink-600 px-2.5 py-2 ${failed ? 'opacity-60' : ''}">
            <div class="flex items-center justify-between text-[11px] text-slate-400">
              <span>${esc(p.label)} <span class="text-slate-600">· ${esc(p.sub)}</span></span>
              ${scoreCell}
            </div>
            <p class="text-xs ${failed ? 'text-slate-500' : 'text-slate-300'} mt-1 leading-snug">${esc(v.comment)}</p>
            ${model ? `<p class="text-[10px] text-slate-600 mt-1 font-mono">${esc(model)}</p>` : ''}
          </div>`;
      }).join('')}
    </div>
  `;
}

/** P0-2 모집 상태 배지 (개선사항.md 표기 그대로) */
const AVAILABILITY_META = {
  open:     { emoji: '🟢', label: '현재 모집 중' },
  upcoming: { emoji: '🔵', label: '모집 예정' },
  ongoing:  { emoji: '⚪', label: '상시 참여 가능 여부 확인 필요' },
  unknown:  { emoji: '🟡', label: '모집 일정 확인 필요' },
};

function availabilityBadge(match) {
  const meta = AVAILABILITY_META[match.availability] || AVAILABILITY_META.unknown;
  const tone = match.availability === 'open' || match.availability === 'upcoming'
    ? 'bg-emerald-500/15 text-emerald-300'
    : 'bg-amber-500/15 text-amber-300';
  return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded ${tone} text-[11px] font-medium">
    ${meta.emoji} ${esc(meta.label)}
  </span>`;
}

/** P0-1 출처 검증 배지. null(검증 안 됨)이면 아무것도 그리지 않는다 — 검증은 있으면 좋은 정보이지 전제조건이 아니다. */
function sourceStatusBadge(match) {
  if (match.sourceStatus === 'verified') {
    return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px]">✅ 공식 원문 확인됨</span>`;
  }
  if (match.sourceStatus === 'unverified') {
    return `<span class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[11px]">⚠️ 원문 확인 필요</span>`;
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

function programCard(match) {
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
      ? `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-medium">⚡ 의견이 갈렸어요 · ${spread}점 차</span>`
      : `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-ink-700 text-slate-400 text-[11px]">4개 관점 ${spread}점 차</span>`;

  // ★ 이 항목이 실시간 검색에서 왔는지, 미리 수집해둔 데이터에서 왔는지 숨기지 않는다.
  //   "실시간 검색"이라고 말한 화면에 수집 데이터가 표시 없이 섞이면 그게 약점이 된다.
  //   구분해서 적으면 오히려 근거가 된다.
  const originBadge = match.origin === 'collected'
    ? `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[11px]">수집 데이터</span>`
    : `<span class="shrink-0 inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px]">실시간 검색</span>`;

  const period = periodText(match);
  const searchQuery = encodeURIComponent(`site:mjc.ac.kr "${match.programTitle}"`);

  return `
    <div class="rounded-lg border border-ink-600 bg-ink-800/50 p-4" data-match-id="${esc(match.id)}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="font-semibold text-slate-100">${esc(match.programTitle)}</h4>
          <p class="text-sm text-slate-400 mt-0.5">${esc(match.summary)}</p>
        </div>
        <div class="flex flex-col items-end gap-1">
          ${availabilityBadge(match)}
          ${originBadge}
          ${disagreementBadge}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-slate-500">
        ${sourceStatusBadge(match)}
        <span>${esc(match.sourceDomain)}</span>
        ${match.postedAt ? `<span>게시일 ${esc(match.postedAt)}</span>` : ''}
      </div>
      ${period ? `<p class="text-xs text-slate-400 mt-1">${period}</p>` : ''}

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
        <a href="${esc(match.sourceUrl)}" target="_blank" rel="noopener" class="text-brand-400 hover:underline">공식 공지 열기 ↗</a>
        <button type="button" class="btn-copy-link text-slate-500 hover:text-slate-300" data-url="${esc(match.sourceUrl)}">링크 복사</button>
        <a href="https://www.google.com/search?q=${searchQuery}" target="_blank" rel="noopener" class="text-slate-500 hover:text-slate-300">학교 사이트에서 다시 검색 ↗</a>
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
 * @param {{droppedForSource?: number, supplementedCount?: number}} [meta]  검색이 실제로 무엇을 거르고 보충했는지
 */
export function renderReport(mount, target, matches, { onComplete, onNewTarget }, meta = {}) {
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
  ].filter(Boolean).join(' · ') || '이번 검색은 걸러진 항목 없이 전부 표시합니다';

  mount.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <h2 class="text-xl font-bold">"${esc(target.companyOrRole)}"에 필요한 걸 채워드릴게요</h2>
    </div>
    <p class="text-sm text-slate-400 mb-1">${DISCLAIMER.ELIGIBILITY}</p>
    <p class="text-xs text-slate-500 mb-6">${esc(sourceNote)}</p>

    <div class="space-y-8">
      ${byGap.size === 0 ? `
        <div class="rounded-lg border border-ink-600 bg-ink-800/50 p-6 text-center">
          <p class="text-slate-300 font-medium">지금 확인되는 교내 프로그램을 찾지 못했습니다.</p>
          <p class="text-sm text-slate-400 mt-2 leading-relaxed">
            출처가 확인되지 않은 항목은 표시하지 않습니다.<br>
            목표를 조금 넓게 적으면 (예: "게임 개발자" → "소프트웨어 개발자") 결과가 나올 수 있습니다.
          </p>
        </div>` : ''}
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
  const { onNewTarget } = handlers;

  mount.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold">마이 프로필</h2>
      <button id="btn-profile-edit" class="text-xs text-brand-400 hover:underline">프로필 수정</button>
    </div>

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

    <button id="btn-profile-reset"
      class="w-full mt-3 text-xs text-slate-500 hover:text-red-400 transition-colors py-1">
      프로필 초기화
    </button>
  `;

  mount.querySelector('#btn-profile-new-target').addEventListener('click', onNewTarget);
  mount.querySelector('#btn-profile-edit').addEventListener('click', () => renderProfileEdit(mount, profile, handlers));
  mount.querySelector('#btn-profile-reset').addEventListener('click', () => confirmReset(mount, handlers));
}

function renderProfileEdit(mount, profile, handlers) {
  const { direct, earned } = splitSkills(profile.skills);
  const pref = profile.traits?.activityPreference || null;

  mount.innerHTML = `
    <h2 class="text-xl font-bold mb-6">프로필 수정</h2>

    <form id="form-profile-edit" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-sm text-slate-300">학년</span>
          <select name="grade" class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm">
            ${[1, 2, 3].map((g) => `<option value="${g}" ${profile.grade === g ? 'selected' : ''}>${g}학년</option>`).join('')}
          </select>
        </label>
        <label class="block">
          <span class="text-sm text-slate-300">나이 <span class="text-slate-500">(선택)</span></span>
          <input name="age" type="number" min="15" max="99" value="${profile.age ?? ''}"
            class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
        </label>
      </div>

      <label class="block">
        <span class="text-sm text-slate-300">학과</span>
        <input name="department" type="text" required value="${esc(profile.department)}"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">보유 자격증 <span class="text-slate-500">(쉼표로 구분)</span></span>
        <input name="certificates" type="text" value="${esc((profile.certificates || []).join(', '))}"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">보유 기술 <span class="text-slate-500">(직접 입력한 것만 — 쉼표로 구분)</span></span>
        <input name="skills" type="text" value="${esc(direct.map(normSkillName).join(', '))}"
          class="mt-1 w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm" />
      </label>

      ${
        earned.length
          ? `<div class="rounded border border-ink-600 bg-ink-800/40 p-3">
              <p class="text-xs text-slate-400 mb-1.5">프로그램 이수로 얻은 기술 <span class="text-slate-600">(여기서 수정할 수 없음)</span></p>
              <div>${chipList(earned)}</div>
              <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                이 기술은 프로그램 이행 이력과 연결되어 있습니다.
                내 프로필 화면에서 해당 이행 기록을 취소하면 함께 사라집니다.
              </p>
            </div>`
          : ''
      }

      <fieldset class="pt-2">
        <legend class="text-sm text-slate-300 mb-2">참여 방식 선호 <span class="text-slate-500">(선택)</span></legend>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="team" class="bg-ink-800 border-ink-600" ${pref === 'team' ? 'checked' : ''} /> 팀 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="solo" class="bg-ink-800 border-ink-600" ${pref === 'solo' ? 'checked' : ''} /> 개인 활동 선호
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="activityPreference" value="" class="bg-ink-800 border-ink-600" ${!pref ? 'checked' : ''} /> 선택 안 함
          </label>
        </div>
      </fieldset>

      <div class="flex gap-2 pt-2">
        <button type="submit" class="flex-1 rounded bg-brand-500 hover:bg-brand-400 transition-colors py-2.5 text-sm font-semibold text-white">저장하기</button>
        <button type="button" id="btn-profile-cancel" class="rounded border border-ink-600 hover:border-brand-400 transition-colors px-4 py-2.5 text-sm text-slate-300">취소</button>
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

function confirmReset(mount, handlers) {
  if (document.getElementById('reset-confirm')) return;

  const el = document.createElement('div');
  el.id = 'reset-confirm';
  el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4';
  el.innerHTML = `
    <div class="w-full max-w-sm rounded-lg border border-ink-600 bg-ink-900 p-6" role="dialog" aria-modal="true">
      <p class="text-slate-100 font-medium mb-1">정말 프로필과 이행 이력을 모두 삭제할까요?</p>
      <p class="text-sm text-slate-500 mb-5">이 작업은 되돌릴 수 없습니다.</p>
      <div class="flex gap-2">
        <button id="reset-cancel" class="flex-1 rounded border border-ink-600 hover:border-brand-400 transition-colors py-2 text-sm text-slate-300">취소</button>
        <button id="reset-confirm-btn" class="flex-1 rounded bg-red-500 hover:bg-red-400 transition-colors py-2 text-sm font-medium text-white">삭제</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => el.remove();
  el.querySelector('#reset-cancel').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  el.querySelector('#reset-confirm-btn').addEventListener('click', () => {
    close();
    handlers.onReset();
  });
}

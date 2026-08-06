/**
 * 앱 엔트리포인트 — 상태 관리 + 화면 전환
 * ─────────────────────────────────────────────────────────
 * 기본은 실제 파이프라인(js/pipeline.js, 신찬영)을 쓴다.
 * URL에 ?mock=1 을 붙이면 크레딧을 쓰지 않는 js/mock.js로 UI만 확인할 수 있다.
 */

import * as pipeline from './pipeline.js';
import * as mockPipeline from './mock.js';
import { getUsage, setUserKey, getUserKey, hasUserKey, clearCache } from './gateway.js';
import { DEMO_PROFILE, DEMO_TARGETS } from './demo.js';
import { loadProfile, saveProfile as persistProfile, clearProfile, markCompleted } from './profile.js';
import { renderOnboarding, renderTarget, renderProgress, renderReport, renderProfile } from './ui.js';

const useMock = new URLSearchParams(location.search).has('mock');
const impl = useMock ? mockPipeline : pipeline;

/** @type {import('./types.js').Profile | null} */
let profile = loadProfile();
/** @type {import('./types.js').Target | null} */
let currentTarget = null;
/** @type {import('./types.js').ProgramMatch[]} */
let currentMatches = [];
/** @type {{droppedForSource?: number, supplementedCount?: number}} */
let currentMeta = {};

/**
 * 실행 토큰 — "지금 화면에 그려야 할 결과"가 어느 실행의 것인지 가린다.
 *
 * 이게 없으면: 분석 중에 헤더 → 내 프로필 → 새 목표 → 다시 제출하면
 * 파이프라인 두 개가 동시에 돌고, ★먼저 끝난 쪽★이 currentMatches 를 덮어쓴다.
 * 결과는 리포트 제목은 새 목표인데 카드는 이전 목표 것 — 심사위원이 바로 알아챈다.
 * 값이 올라간 뒤에 도착한 결과는 조용히 버린다.
 */
let runToken = 0;

/** 분석이 도는 중인가 — 진행 화면 밖으로 나가는 것을 막는 데 쓴다 */
function isRunning() {
  return running;
}
let running = false;

// ─────────────────────────────────────────────
//  로컬 저장 — js/profile.js 로 통합 (이전엔 이 파일에 별도로 loadProfile/saveProfile이
//  중복 구현돼 있었다. 같은 localStorage 키를 쓰긴 했지만 로직이 두 군데 있으면
//  한쪽만 고치고 잊어버리기 쉽다. profile.js 하나로 합친다.)
// ─────────────────────────────────────────────

function saveProfile() {
  profile = persistProfile(profile);
}

// ─────────────────────────────────────────────
//  화면 전환
// ─────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.removeAttribute('data-active'));
  document.getElementById(`screen-${id}`).setAttribute('data-active', '');
}

function mountOf(id) {
  return document.getElementById(`mount-${id}`);
}

// ─────────────────────────────────────────────
//  화면별 진입
// ─────────────────────────────────────────────

function goOnboarding() {
  renderOnboarding(mountOf('onboarding'), {
    demoProfile: DEMO_PROFILE,
    onSubmit: (partial) => {
      profile = {
        id: 'local-' + Date.now(),
        grade: partial.grade,
        department: partial.department,
        age: partial.age,
        certificates: partial.certificates,
        skills: partial.skills,
        completedActivities: [],
        traits: { activityPreference: null, supportDisability: partial.supportDisability === true },
        updatedAt: new Date().toISOString(),
      };
      saveProfile();
      goTarget();
    },
  });
  showScreen('onboarding');
}

function goTarget() {
  const handlers = {
    demoTargets: DEMO_TARGETS,
    onSubmit: (input) => {
      profile.traits = { ...(profile.traits || {}), activityPreference: input.activityPreference };
      saveProfile();

      currentTarget = {
        id: 'target-' + Date.now(),
        profileId: profile.id,
        companyOrRole: input.companyOrRole,
        jobPostingUrl: input.jobPostingUrl,
        interestAreas: input.interestAreas,
        globalInterest: input.globalInterest,
        requiredSkills: [],
        gapSkills: [],
        createdAt: new Date().toISOString(),
      };
      runPipeline();
    },
  };

  renderTarget(mountOf('target'), handlers);
  showScreen('target');

  // ★ 빠른 선택을 학과에 맞춰 바꿔 끼운다.
  //
  //   DEMO_TARGETS 는 게임 직군 4개로 고정돼 있다. 우리 학과 기준으로 만든 것이라
  //   사회복지과·유아교육과 학생에게는 쓸모가 없고, 첫 화면부터
  //   "이건 게임과 전용 도구"로 읽힌다.
  //
  //   학과는 이미 프로필에 있으므로 그걸로 만든다.
  //   먼저 기본값으로 화면을 그려두고, 제안이 오면 다시 그린다.
  //   실패해도 기본값이 남아 있으므로 화면이 비지 않는다.
  loadSuggestedTargets(handlers);
}

async function loadSuggestedTargets(handlers) {
  const dept = profile?.department?.trim();
  if (!dept || useMock) return;

  try {
    const suggested = await impl.suggestTargets(dept, {
      grade: profile.grade,
      skillsText: (profile.skills || [])
        .map((s) => (typeof s === 'string' ? s : s?.name))
        .filter(Boolean).join(', '),
    });
    if (!suggested?.length) return;

    // 사용자가 이미 입력을 시작했으면 덮어쓰지 않는다
    const input = mountOf('target')?.querySelector('input[name="companyOrRole"]');
    if (input?.value.trim()) return;

    renderTarget(mountOf('target'), { ...handlers, demoTargets: suggested });
    updateCreditBadge();
  } catch (e) {
    // 제안은 부가 기능이다. 실패해도 기본 목표로 그대로 쓸 수 있어야 한다.
    console.warn('[목표 제안 건너뜀]', e?.message || e);
  }
}

async function runPipeline() {
  const my = ++runToken;          // 이 실행의 번호
  const mine = currentTarget;     // 이 실행이 분석 중인 목표 (도중에 바뀔 수 있다)
  running = true;
  const onStage = renderProgress(mountOf('progress'));
  showScreen('progress');

  try {
    const result = await impl.run({
      profile,
      target: mine.companyOrRole,
      jobPostingUrl: mine.jobPostingUrl,
      interestAreas: mine.interestAreas,
      onStage,
    });
    // 그 사이 새 분석이 시작됐다면 이 결과는 낡은 것이다. 화면에 그리지 않는다.
    if (my !== runToken) return;
    currentTarget = mine;
    currentTarget.requiredSkills = result.requiredSkills;
    currentTarget.gapSkills = result.gapSkills;
    currentMatches = result.matches;
    currentMeta = {
      droppedForSource: result.filtered?.droppedForSource,
      droppedForSchedule: result.filtered?.droppedForSchedule,
      droppedForBrokenLink: result.filtered?.droppedForBrokenLink,
      supplementedCount: result.supplement?.count,
    };
    updateCreditBadge();
    goReport();
  } catch (err) {
    if (my !== runToken) return;
    const message = err?.message || String(err);
    onStage({ stage: 'unknown', status: 'error', message });

    // 데모 모드 한도에 걸린 경우 — 여기가 학생이 자기 키를 쓰게 되는 지점이다.
    // 그냥 "실패"로 끝내면 쓸 방법이 있는데도 떠나버린다.
    if (/한도|너무 잦|429/.test(message)) {
      openKeyPanel();
    }
  } finally {
    if (my === runToken) running = false;
  }
}

function goReport() {
  renderReport(mountOf('report'), currentTarget, currentMatches, {
    onComplete: (match) => {
      match.isCompleted = true;
      // ★ 성장 루프의 핵심 지점이다. profile.js 의 markCompleted 로 처리한다.
      //
      //   전에는 여기서 profile.skills.includes(match.gapSkill) 로 중복을 걸렀는데,
      //   skills 는 { name, level } 객체 배열이라 문자열과는 절대 일치하지 않았다.
      //   → 같은 프로그램을 두 번 누르면 계속 쌓이고, 쌓인 값은 이름이 없어
      //     다음 갭 분석에서 "보유 기술"로 읽히지 않았다.
      //
      //   markCompleted 는 객체/문자열을 모두 정규화해 비교하고,
      //   이미 있는 기술이면 수준을 올리고 없으면 '프로그램 이수'로 추가한다.
      profile = markCompleted(match);
      // 체크박스 자체는 ui.js가 즉시 완료 상태로 갱신하므로 화면 전체를 다시 그리지 않아도 된다.
    },
    onNewTarget: goTarget,
  }, currentMeta);
  showScreen('report');
}

function goProfile() {
  renderProfile(mountOf('profile'), profile, {
    onNewTarget: goTarget,
    // 결과를 보다가 프로필로 넘어온 경우에만 돌아갈 길을 준다.
    // (없으면 성장 루프를 보여준 뒤 결과 화면으로 못 돌아가서 40~70초 + 68크레딧을 다시 쓴다)
    onBackToReport: currentMatches.length ? goReport : null,
    onSave: (partial) => {
      profile.grade = partial.grade;
      profile.age = partial.age;
      profile.department = partial.department;
      profile.certificates = partial.certificates;
      profile.skills = partial.skills;
      // ★ traits 를 통째로 갈아끼우면 안 된다.
      //   수정 폼에 없는 값(supportDisability)이 조용히 사라져서,
      //   장애학생 지원 대상으로 온보딩한 학생이 프로필을 한 번 저장하는 순간
      //   해당 프로그램이 전부 안 보이게 된다. 복구 방법은 초기화뿐이다.
      profile.traits = { ...(profile.traits || {}), activityPreference: partial.activityPreference };
      saveProfile();
      goProfile(); // 저장 후 뷰 모드로 다시 그린다 (수정된 값 즉시 반영)
    },
    onReset: () => {
      // ★ 프로필만 지우면 안 된다.
      //   학교 실습실·심사장의 공용 PC를 생각하면, 앞사람이 "초기화"를 누르고 자리를 떠도
      //   mypath.userKey 에 ★그 사람의 팩트챗 API 키가 평문으로★ 남는다.
      //   다음 사람은 헤더의 "내 키 사용 중"을 보며 남의 월 크레딧을 쓰게 된다.
      //   캐시에도 앞사람의 학과·갭 분석 결과가 12시간 남는다.
      clearProfile();
      clearCache();
      setUserKey('');
      profile = null;
      currentTarget = null;
      currentMatches = [];
      updateCreditBadge();
      injectHeaderControls();   // "내 키 사용 중" 표시를 되돌린다
      goOnboarding();
    },
    onImported: (next) => {
      profile = next;
      currentTarget = null;
      currentMatches = [];
      goProfile();
    },
  });
  showScreen('profile');
}

// ─────────────────────────────────────────────
//  헤더 — 프로필 이동 · 크레딧 표시 · 키 설정
//  (index.html은 고정이므로 전부 JS로만 주입한다)
// ─────────────────────────────────────────────

function updateCreditBadge() {
  const badge = document.getElementById('credit-badge');
  if (!badge || useMock) return;
  const u = getUsage();
  // "이번 세션"이 아니다 — mypath.usage 는 localStorage 에 계속 누적되고
  // 프로필을 초기화해도 지워지지 않는다. 새로 연 브라우저인데 69.5가 떠 있으면
  // 화면이 거짓말을 하는 것이다. 실제 의미대로 적는다.
  badge.textContent = `누적 ${u.spent.toFixed(1)} 크레딧 · 절감 ${u.saved.toFixed(0)}`;
}

function injectHeaderControls() {
  const badge = document.getElementById('credit-badge');
  if (!badge) return;

  if (!document.getElementById('nav-profile-btn')) {
    const profileBtn = document.createElement('button');
    profileBtn.id = 'nav-profile-btn';
    profileBtn.textContent = '내 프로필';
    profileBtn.className = 'text-xs text-secondary hover:text-mjcblue transition-colors mr-3';
    profileBtn.addEventListener('click', () => {
      // 분석 중에는 막는다 — 나갔다가 결과가 도착하면 화면이 갑자기 튄다.
      if (isRunning()) return;
      if (profile) goProfile();
    });
    badge.insertAdjacentElement('beforebegin', profileBtn);
  }

  if (!document.getElementById('nav-key-btn') && !useMock) {
    const keyBtn = document.createElement('button');
    keyBtn.id = 'nav-key-btn';
    keyBtn.textContent = keyLabel();
    keyBtn.className = 'text-xs text-secondary hover:text-mjcblue transition-colors mr-3';
    keyBtn.addEventListener('click', openKeyPanel);
    badge.insertAdjacentElement('beforebegin', keyBtn);
  }
}

function keyLabel() {
  return hasUserKey() ? '내 계정 사용 중' : '내 계정으로 이용하기';
}

function refreshKeyLabel() {
  const btn = document.getElementById('nav-key-btn');
  if (btn) btn.textContent = keyLabel();
}

// ─────────────────────────────────────────────
//  키 설정 패널
//
//  ★ 이 화면이 이 서비스의 확장 방식 그 자체다.
//
//    명지전문대 학생은 누구나 자기 팩트챗 키를 발급받을 수 있고,
//    1인당 월 10,000 크레딧이 배정된다.
//    그래서 사람이 늘어도 우리가 크레딧을 대신 낼 필요가 없다 —
//    각자 자기 몫을 쓴다. 데모 키는 "설정 없이 일단 눌러보는 진입로"일 뿐이다.
//
//    그러려면 ★어디서 발급받는지★를 화면이 알려줘야 한다.
//    (전에는 window.prompt 한 줄이라 발급 경로를 안내할 자리가 없었다.
//     게다가 prompt 는 페이지를 멈춰 세운다.)
// ─────────────────────────────────────────────

function openKeyPanel() {
  if (document.getElementById('key-panel')) return;

  const el = document.createElement('div');
  el.id = 'key-panel';
  el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4';
  el.innerHTML = `
    <div class="w-full max-w-lg rounded-lg border border-line bg-white p-6" role="dialog" aria-modal="true">
      <h3 class="text-lg font-bold text-navy mb-1">내 팩트챗 키로 쓰기</h3>
      <p class="text-sm text-secondary mb-5">
        지금은 <strong class="text-maintext">${hasUserKey() ? '내 키' : '데모 키'}</strong>로 동작하고 있어요.
      </p>

      <label class="block text-xs text-secondary mb-1">팩트챗 API 키</label>
      <input id="key-input" type="password" autocomplete="off" spellcheck="false"
             placeholder="키를 붙여넣으세요"
             class="w-full rounded bg-white border border-line px-3 py-2 text-sm mb-2" />
      <p id="key-msg" class="text-xs text-red-600 mb-3 min-h-[1rem]"></p>

      <div class="rounded border border-line bg-skysurface p-3 text-xs text-secondary leading-relaxed mb-5">
        <p class="text-maintext font-medium mb-1">키는 어디서 받나요?</p>
        <p class="mb-2">
          <a href="https://mjc.factchat.bot" target="_blank" rel="noopener"
             class="text-mjcblue hover:underline">mjc.factchat.bot ↗</a>
          접속 → 좌측 하단 <strong class="text-maintext">API Gateway</strong> 메뉴에서 발급
        </p>
        <p class="mb-2">재학생은 <strong class="text-maintext">월 10,000 크레딧</strong>이 배정됩니다.
          이 도구는 1회 분석에 약 <strong class="text-maintext">68 크레딧</strong>을 씁니다 (약 140회).</p>
        <p class="text-secondary">
          입력한 키는 이 브라우저에만 저장되고, 게이트웨이로 <strong>직접</strong> 전송됩니다.
          저희 서버를 거치지 않습니다.
        </p>
      </div>

      <div class="flex gap-2">
        <button id="key-save" class="flex-1 rounded bg-mjcblue hover:bg-mjcblue/90 transition-colors py-2 text-sm font-medium text-white">저장하고 내 키로 쓰기</button>
        ${hasUserKey()
          ? `<button id="key-clear" class="rounded border border-line hover:border-red-500 transition-colors px-3 py-2 text-sm text-maintext">키 삭제</button>`
          : ''}
        <button id="key-close" class="rounded border border-line hover:border-mjcblue transition-colors px-4 py-2 text-sm text-maintext">닫기</button>
      </div>
    </div>`;

  document.body.appendChild(el);

  const input = el.querySelector('#key-input');
  const msg = el.querySelector('#key-msg');
  input.focus();

  const close = () => el.remove();

  el.querySelector('#key-close').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });

  el.querySelector('#key-clear')?.addEventListener('click', () => {
    setUserKey('');
    refreshKeyLabel();
    close();
  });

  const save = () => {
    const v = input.value.trim();
    if (!v) { msg.textContent = '키를 입력해주세요.'; return; }
    // 형식만 가볍게 확인한다 — 실제 유효성은 첫 호출에서 드러난다
    if (v.length < 20 || /\s/.test(v)) {
      msg.textContent = '키 형식이 올바르지 않은 것 같아요. 다시 확인해주세요.';
      return;
    }
    setUserKey(v);
    refreshKeyLabel();
    close();
  };

  el.querySelector('#key-save').addEventListener('click', save);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

// ─────────────────────────────────────────────
//  부팅
// ─────────────────────────────────────────────

injectHeaderControls();
updateCreditBadge();

if (profile) {
  goTarget();
} else {
  goOnboarding();
}

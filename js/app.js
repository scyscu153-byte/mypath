/**
 * 앱 엔트리포인트 — 상태 관리 + 화면 전환
 * ─────────────────────────────────────────────────────────
 * 기본은 실제 파이프라인(js/pipeline.js, 신찬영)을 쓴다.
 * URL에 ?mock=1 을 붙이면 크레딧을 쓰지 않는 js/mock.js로 UI만 확인할 수 있다.
 */

import * as pipeline from './pipeline.js';
import * as mockPipeline from './mock.js';
import { getUsage, setUserKey, getUserKey, hasUserKey } from './gateway.js';
import { DEMO_PROFILE, DEMO_TARGETS } from './demo.js';
import { markCompleted } from './profile.js';
import { renderOnboarding, renderTarget, renderProgress, renderReport, renderProfile } from './ui.js';

const STORAGE_KEY = 'mypath.profile';
const useMock = new URLSearchParams(location.search).has('mock');
const impl = useMock ? mockPipeline : pipeline;

/** @type {import('./types.js').Profile | null} */
let profile = loadProfile();
/** @type {import('./types.js').Target | null} */
let currentTarget = null;
/** @type {import('./types.js').ProgramMatch[]} */
let currentMatches = [];

// ─────────────────────────────────────────────
//  로컬 저장
// ─────────────────────────────────────────────

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile() {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
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
        traits: { activityPreference: null },
        updatedAt: new Date().toISOString(),
      };
      saveProfile();
      goTarget();
    },
  });
  showScreen('onboarding');
}

function goTarget() {
  renderTarget(mountOf('target'), {
    demoTargets: DEMO_TARGETS,
    onSubmit: (input) => {
      profile.traits = { activityPreference: input.activityPreference };
      saveProfile();

      currentTarget = {
        id: 'target-' + Date.now(),
        profileId: profile.id,
        companyOrRole: input.companyOrRole,
        globalInterest: input.globalInterest,
        requiredSkills: [],
        gapSkills: [],
        createdAt: new Date().toISOString(),
      };
      runPipeline();
    },
  });
  showScreen('target');
}

async function runPipeline() {
  const onStage = renderProgress(mountOf('progress'));
  showScreen('progress');

  try {
    const result = await impl.run({
      profile,
      target: currentTarget.companyOrRole,
      onStage,
    });
    currentTarget.requiredSkills = result.requiredSkills;
    currentTarget.gapSkills = result.gapSkills;
    currentMatches = result.matches;
    updateCreditBadge();
    goReport();
  } catch (err) {
    const message = err?.message || String(err);
    onStage({ stage: 'unknown', status: 'error', message });

    // 데모 모드 한도에 걸린 경우 — 여기가 학생이 자기 키를 쓰게 되는 지점이다.
    // 그냥 "실패"로 끝내면 쓸 방법이 있는데도 떠나버린다.
    if (/한도|너무 잦|429/.test(message)) {
      openKeyPanel();
    }
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
  });
  showScreen('report');
}

function goProfile() {
  renderProfile(mountOf('profile'), profile, { onNewTarget: goTarget });
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
  badge.textContent = `이번 세션 ${u.spent.toFixed(1)} 크레딧 · 절감 ${u.saved.toFixed(0)}`;
}

function injectHeaderControls() {
  const badge = document.getElementById('credit-badge');
  if (!badge) return;

  if (!document.getElementById('nav-profile-btn')) {
    const profileBtn = document.createElement('button');
    profileBtn.id = 'nav-profile-btn';
    profileBtn.textContent = '내 프로필';
    profileBtn.className = 'text-xs text-slate-400 hover:text-brand-400 transition-colors mr-3';
    profileBtn.addEventListener('click', () => {
      if (profile) goProfile();
    });
    badge.insertAdjacentElement('beforebegin', profileBtn);
  }

  if (!document.getElementById('nav-key-btn') && !useMock) {
    const keyBtn = document.createElement('button');
    keyBtn.id = 'nav-key-btn';
    keyBtn.textContent = keyLabel();
    keyBtn.className = 'text-xs text-slate-400 hover:text-brand-400 transition-colors mr-3';
    keyBtn.addEventListener('click', openKeyPanel);
    badge.insertAdjacentElement('beforebegin', keyBtn);
  }
}

function keyLabel() {
  return hasUserKey() ? '내 키 사용 중' : '데모 모드 · 내 키 쓰기';
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
    <div class="w-full max-w-lg rounded-lg border border-ink-600 bg-ink-900 p-6" role="dialog" aria-modal="true">
      <h3 class="text-lg font-bold mb-1">내 팩트챗 키로 쓰기</h3>
      <p class="text-sm text-slate-400 mb-5">
        지금은 <strong class="text-slate-300">${hasUserKey() ? '내 키' : '데모 키'}</strong>로 동작하고 있어요.
      </p>

      <label class="block text-xs text-slate-400 mb-1">팩트챗 API 키</label>
      <input id="key-input" type="password" autocomplete="off" spellcheck="false"
             placeholder="키를 붙여넣으세요"
             class="w-full rounded bg-ink-800 border border-ink-600 px-3 py-2 text-sm mb-2" />
      <p id="key-msg" class="text-xs text-red-400 mb-3 min-h-[1rem]"></p>

      <div class="rounded border border-ink-600 bg-ink-800/60 p-3 text-xs text-slate-400 leading-relaxed mb-5">
        <p class="text-slate-300 font-medium mb-1">키는 어디서 받나요?</p>
        <p class="mb-2">
          <a href="https://mjc.factchat.bot" target="_blank" rel="noopener"
             class="text-brand-400 hover:underline">mjc.factchat.bot ↗</a>
          접속 → 좌측 하단 <strong class="text-slate-300">API Gateway</strong> 메뉴에서 발급
        </p>
        <p class="mb-2">재학생은 <strong class="text-slate-300">월 10,000 크레딧</strong>이 배정됩니다.
          이 도구는 1회 분석에 약 <strong class="text-slate-300">68 크레딧</strong>을 씁니다 (약 140회).</p>
        <p class="text-slate-500">
          입력한 키는 이 브라우저에만 저장되고, 게이트웨이로 <strong>직접</strong> 전송됩니다.
          저희 서버를 거치지 않습니다.
        </p>
      </div>

      <div class="flex gap-2">
        <button id="key-save" class="flex-1 rounded bg-brand-500 hover:bg-brand-400 transition-colors py-2 text-sm font-medium text-white">저장하고 내 키로 쓰기</button>
        ${hasUserKey()
          ? `<button id="key-clear" class="rounded border border-ink-600 hover:border-red-400 transition-colors px-3 py-2 text-sm text-slate-300">키 삭제</button>`
          : ''}
        <button id="key-close" class="rounded border border-ink-600 hover:border-brand-400 transition-colors px-4 py-2 text-sm text-slate-300">닫기</button>
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

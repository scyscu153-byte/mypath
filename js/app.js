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
    onStage({ stage: 'unknown', status: 'error', message: err?.message || String(err) });
  }
}

function goReport() {
  renderReport(mountOf('report'), currentTarget, currentMatches, {
    onComplete: (match) => {
      match.isCompleted = true;
      profile.completedActivities.push({
        programTitle: match.programTitle,
        gainedSkill: match.gapSkill,
        completedAt: new Date().toISOString(),
      });
      if (!profile.skills.includes(match.gapSkill)) {
        profile.skills.push(match.gapSkill);
      }
      saveProfile();
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
    const label = () => (hasUserKey() ? '내 키 사용 중' : '키 설정 (데모 키 사용 중)');
    keyBtn.textContent = label();
    keyBtn.className = 'text-xs text-slate-400 hover:text-brand-400 transition-colors mr-3';
    keyBtn.addEventListener('click', () => {
      const next = window.prompt(
        '본인의 팩트챗 API 키를 입력하세요.\n비워두면 서버의 데모 키를 사용합니다 (팀 공용 크레딧 소모).',
        getUserKey()
      );
      if (next === null) return;
      setUserKey(next.trim());
      keyBtn.textContent = label();
    });
    badge.insertAdjacentElement('beforebegin', keyBtn);
  }
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

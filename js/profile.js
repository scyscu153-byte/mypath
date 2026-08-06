/**
 * 프로필 저장소
 * ─────────────────────────────────────────────────────────
 * 프로필은 브라우저 localStorage 에만 저장된다. 서버로 보내지 않는다.
 *
 * 이 프로필은 단순한 입력값 저장이 아니라 ★누적되는 기록★이다.
 * 프로그램을 이행하면 얻은 역량이 여기에 쌓이고,
 * 다음 목표를 설정할 때 갭 분석이 달라진다. 이것이 성장 루프다.
 */

const KEY = 'mypath.profile';

/** @returns {import('./types.js').Profile|null} */
export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {import('./types.js').Profile} profile */
export function saveProfile(profile) {
  const next = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export function hasProfile() {
  return Boolean(loadProfile());
}

/**
 * 빈 프로필 골격.
 * 학과는 기본값을 넣어둔다 — 이 도구는 명지전문대 학생만 쓰기 때문이다.
 */
export function emptyProfile() {
  return {
    id: `p-${Date.now()}`,
    grade: 1,
    semester: 1,
    department: '',
    age: null,
    certificates: [],
    skills: [],
    completedActivities: [],
    traits: { activityPreference: null },
    updatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
//  성장 루프 — 이행하면 프로필이 자란다
// ─────────────────────────────────────────────

/**
 * 프로그램을 "이행함"으로 표시한다.
 * 그 프로그램이 메우려던 역량이 보유 기술에 추가되고,
 * 다음 갭 분석에서 더 이상 부족한 것으로 잡히지 않는다.
 *
 * @param {import('./types.js').ProgramMatch} match
 * @returns {import('./types.js').Profile}
 */
export function markCompleted(match) {
  const profile = loadProfile();
  if (!profile) throw new Error('프로필이 없습니다');

  const already = (profile.completedActivities || [])
    .some((a) => a.programTitle === match.programTitle);
  if (already) return profile;

  const completedActivities = [
    ...(profile.completedActivities || []),
    {
      programTitle: match.programTitle,
      gainedSkill: match.gapSkill,
      sourceUrl: match.sourceUrl,
      completedAt: new Date().toISOString(),
    },
  ];

  // 얻은 역량을 보유 기술에 추가한다. 이미 있으면 수준을 올린다.
  const skills = [...(profile.skills || [])];
  const idx = skills.findIndex((s) => normName(s) === match.gapSkill);
  if (idx >= 0) {
    skills[idx] = { name: match.gapSkill, level: '보유' };
  } else {
    skills.push({ name: match.gapSkill, level: '프로그램 이수' });
  }

  return saveProfile({ ...profile, completedActivities, skills });
}

/** 이행 표시를 되돌린다 */
export function unmarkCompleted(programTitle) {
  const profile = loadProfile();
  if (!profile) return null;

  const target = (profile.completedActivities || [])
    .find((a) => a.programTitle === programTitle);
  if (!target) return profile;

  return saveProfile({
    ...profile,
    completedActivities: profile.completedActivities
      .filter((a) => a.programTitle !== programTitle),
    // 그 프로그램으로 얻었던 역량만 제거한다
    skills: (profile.skills || [])
      .filter((s) => !(normName(s) === target.gainedSkill && levelOf(s) === '프로그램 이수')),
  });
}

// ─────────────────────────────────────────────
//  기술 표기 — 문자열과 객체를 모두 받아준다
//  ("C#" 이든 { name:'C#', level:'학습 중' } 이든)
// ─────────────────────────────────────────────

export function normName(skill) {
  return typeof skill === 'string' ? skill : String(skill?.name ?? '');
}

export function levelOf(skill) {
  return typeof skill === 'string' ? '보유' : String(skill?.level ?? '보유');
}

/** 프롬프트에 넣기 좋은 형태로 만든다 */
export function describeSkills(profile) {
  const list = profile?.skills || [];
  if (!list.length) return '없음';
  return list.map((s) => `${normName(s)}(${levelOf(s)})`).join(', ');
}

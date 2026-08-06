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
    // 담아둔 프로그램 — "관심 있다"와 "참여했다"는 다르다 (아래 담아두기 절 참조)
    savedPrograms: [],
    completedActivities: [],
    traits: { activityPreference: null },
    updatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
//  내보내기 · 불러오기
//
//  프로필은 서버에 없다. 브라우저 localStorage 에만 있다.
//  그래서 브라우저를 바꾸거나, 시크릿 창을 닫거나, 방문 기록을 지우면
//  ★쌓아온 이행 기록이 통째로 사라진다.★
//  서버에 계정을 두지 않겠다는 선택의 대가이므로, 대신 파일로 들고 갈 수 있게 한다.
// ─────────────────────────────────────────────

const EXPORT_KIND = 'careerbridge-mjc.profile';
const EXPORT_VERSION = 1;

/** 저장 파일에 담을 객체를 만든다 */
export function exportProfile() {
  const profile = loadProfile();
  if (!profile) throw new Error('내보낼 프로필이 없습니다');
  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
  };
}

/** 내보내기 파일 이름 — 학과·날짜가 들어가야 나중에 알아본다 */
export function exportFilename(profile) {
  // ★toISOString() 은 UTC 다.★ 한국 새벽에 내보내면 파일명에 어제 날짜가 찍힌다.
  //   사용자가 "오늘 받은 파일"을 찾을 때 헷갈린다. 현지 날짜로 만든다.
  const now = new Date();
  const d = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const dept = String(profile?.department || '프로필').replace(/[\\/:*?"<>|\s]/g, '');
  return `CareerBridge_${dept}_${d}.json`;
}

/**
 * 불러오기. 남이 준 파일일 수도 있으므로 모양을 직접 확인한다.
 * 확인하지 않고 통째로 넣으면 화면이 백지가 되고 원인도 안 보인다.
 *
 * @param {string} text 파일 내용
 * @returns {import('./types.js').Profile} 저장된 프로필
 */
export function importProfile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON 형식이 아닙니다. 내보내기로 만든 파일이 맞는지 확인해주세요.');
  }

  // 내보내기 파일이면 안쪽을 꺼내고, 프로필 객체를 그대로 준 경우도 받아준다.
  const p = data?.kind === EXPORT_KIND ? data.profile : data;
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    throw new Error('프로필 데이터를 찾을 수 없습니다.');
  }
  if (!p.department && !p.grade) {
    throw new Error('학과·학년이 없습니다. CareerBridge 내보내기 파일이 아닌 것 같습니다.');
  }

  // 빠진 항목은 기본값으로 채운다 — 옛 버전 파일도 열려야 한다.
  const base = emptyProfile();
  const asList = (v) => (Array.isArray(v) ? v : []);
  return saveProfile({
    ...base,
    ...p,
    grade: Number(p.grade) || base.grade,
    department: String(p.department || ''),
    certificates: asList(p.certificates),
    skills: asList(p.skills),
    // ★불러오기는 ★남이 준 파일★이 들어오는 유일한 입구다.★
    //   여기서 정규화하지 않으면 화면 곳곳에서 하나씩 막아야 하고, 한 곳만 빠뜨려도 뚫린다.
    //   실제로 age 가 속성을 탈출하고 sourceUrl 에 javascript: 를 넣을 수 있었다.
    //   입구에서 한 번 걸러 두면 그 뒤로는 앱이 만든 값과 같아진다.
    age: Number.isFinite(Number(p.age)) ? Number(p.age) : null,
    grade: Number(p.grade) || base.grade,
    savedPrograms: asList(p.savedPrograms).map(cleanProgramRef),
    completedActivities: asList(p.completedActivities).map(cleanProgramRef),
    traits: { ...base.traits, ...(p.traits || {}) },
  });
}

/** http/https 링크만 남긴다 — 불러온 파일의 항목을 화면에 그리기 전에 씻는다 */
function cleanProgramRef(x) {
  const safeUrl = (u) => {
    try {
      const url = new URL(String(u ?? ''));
      return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : '';
    } catch { return ''; }
  };
  return { ...x, sourceUrl: safeUrl(x?.sourceUrl) };
}

// ─────────────────────────────────────────────
//  담아두기 (스크랩)
//
//  ★"관심 있다"와 "참여했다"는 다른 상태다.★
//
//  전에는 「참여했어요」 하나뿐이었다. 그런데 학생이 실제로 하는 행동은
//    "이거 괜찮네, 나중에 신청해야지"
//  이고, 이걸 담아둘 곳이 없었다. 그래서 아직 참여하지도 않았는데
//  체크를 눌러 역량이 먼저 쌓이거나, 그냥 잊어버리는 두 가지 중 하나가 됐다.
//
//  담아두기가 생기면 성장 루프가 이어진다:
//    찾기 → ★담기★ → 참여 → 쌓임
// ─────────────────────────────────────────────

/** 담아둔 목록에 있는가 */
export function isSaved(programTitle, profile = loadProfile()) {
  return (profile?.savedPrograms || []).some((p) => p.programTitle === programTitle);
}

/**
 * 이미 참여한 프로그램인가.
 *
 * ★화면의 표시는 프로필에서 읽어야 한다.★
 * 전에는 match 객체의 `isCompleted` 플래그만 봤는데, 그건 실행 중에만 사는 값이다.
 * 프로필 화면의 담아둔 목록에서 참여 체크를 한 뒤 결과 화면으로 돌아오면
 * ★체크가 풀린 것처럼 보였다.★ 기록은 멀쩡한데 화면만 거짓말을 하는 상태였다.
 */
export function isCompletedProgram(programTitle, profile = loadProfile()) {
  return (profile?.completedActivities || []).some((a) => a.programTitle === programTitle);
}

/**
 * 프로그램을 담아둔다. 이미 담겨 있으면 아무 일도 하지 않는다.
 * @param {import('./types.js').ProgramMatch} match
 */
export function saveProgram(match) {
  const profile = loadProfile();
  if (!profile) throw new Error('프로필이 없습니다');

  const saved = profile.savedPrograms || [];
  if (saved.some((p) => p.programTitle === match.programTitle)) return profile;

  // 나중에 프로필 화면에서 그대로 보여줘야 하므로 필요한 것만 복사해 둔다.
  // 원본 match 를 통째로 넣으면 페르소나 점수까지 localStorage 를 차지한다.
  return saveProfile({
    ...profile,
    savedPrograms: [
      ...saved,
      {
        programTitle: match.programTitle,
        gapSkill: match.gapSkill,
        summary: match.summary || '',
        sourceUrl: match.sourceUrl,
        sourceDomain: match.sourceDomain || '',
        availability: match.availability || 'unknown',
        // ★교내/교외 구분을 반드시 들고 간다.★
        //   결과 화면은 구역을 나눠서 보여주지만, 담아두면 프로필의
        //   한 목록에 교내와 나란히 놓이고 ★그때는 구역 제목이 따라오지 않는다.★
        //   이 값이 없으면 학교 밖 항목이 교내인 척하게 된다.
        scope: match.scope === 'external' ? 'external' : 'campus',
        host: match.host ?? null,
        savedAt: new Date().toISOString(),
      },
    ],
  });
}

/** 담아둔 것을 뺀다 */
export function unsaveProgram(programTitle) {
  const profile = loadProfile();
  if (!profile) return null;
  return saveProfile({
    ...profile,
    savedPrograms: (profile.savedPrograms || []).filter((p) => p.programTitle !== programTitle),
  });
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
      // 완료 기록에도 남긴다 — 「완료한 활동」 목록에서 교내/교외가 섞이지 않게
      scope: match.scope === 'external' ? 'external' : 'campus',
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

  // 참여했으면 담아둘 이유가 없다 — 두 곳에 같은 것이 남으면 사용자가 헷갈린다.
  const savedPrograms = (profile.savedPrograms || [])
    .filter((p) => p.programTitle !== match.programTitle);

  return saveProfile({ ...profile, completedActivities, skills, savedPrograms });
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

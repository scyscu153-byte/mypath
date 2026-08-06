/**
 * 시연용 데이터
 * ─────────────────────────────────────────────────────────
 * 실제 팀원의 프로필이다. 지어낸 값이 아니라 실제 상태를 쓴다.
 *
 * 왜 실제 데이터를 쓰는가:
 *   시연에서 "제 실제 기록입니다"라고 말할 수 있어야 설득력이 생긴다.
 *   그리고 관련 없는 스펙(종자기능사)이 섞여 있는 편이
 *   갭 분석이 실제로 판단하고 있음을 보여준다.
 *   관련 있는 것만 넣으면 "미리 짜맞춘 것 아니냐"로 읽힌다.
 *
 * 이 파일의 값은 자유롭게 수정해도 된다. 앱 동작에 영향을 주지 않는다.
 */

/** @type {import('./types.js').Profile} */
export const DEMO_PROFILE = {
  id: 'demo',
  grade: 1,
  semester: 1,
  department: 'AI게임소프트웨어학과',
  age: 24,
  certificates: [
    // 목표 직무와 연관이 낮은 자격증. 갭 분석이 이를 어떻게 다루는지 보여준다.
    '종자기능사',
  ],
  skills: [
    { name: 'C#', level: '학습 중' },
    { name: 'Java', level: '학습 중' },
    { name: 'HTML', level: '미숙' },
    { name: '3ds Max', level: '미숙' },
  ],
  completedActivities: [],
  traits: { activityPreference: null },
  updatedAt: '2026-08-06T21:00:00+09:00',
};

/**
 * 목표 예시.
 *
 * 팀원의 실제 상황: "게임 관련 회사에 가고 싶지만 거기에만 제한을 두고 싶지도 않다"
 * → 목표 입력을 회사명 하나로 강제하면 안 된다.
 *   회사명 · 직군 · 넓은 분야 세 가지를 모두 받을 수 있어야 한다.
 */
export const DEMO_TARGETS = [
  {
    label: '게임 클라이언트 개발자',
    kind: 'role',      // 직군
    value: '게임 클라이언트 개발자',
    hint: '가장 가고 싶은 방향',
  },
  {
    label: '소프트웨어 개발자 (분야 미정)',
    kind: 'field',     // 넓은 분야 — 아직 좁히지 못한 상태
    value: '신입 소프트웨어 개발자',
    hint: '게임에만 한정하고 싶지 않을 때',
  },
  {
    label: '넥슨',
    kind: 'company',   // 특정 기업
    value: '넥슨 게임 클라이언트 개발',
    hint: '특정 회사를 정했을 때',
  },
];

/**
 * 목표 입력 종류.
 * 사용자가 아직 목표를 좁히지 못한 상태를 정상으로 취급한다.
 * (1학년이 특정 회사를 정해두는 경우가 오히려 드물다)
 */
export const TARGET_KIND = Object.freeze({
  company: { label: '특정 기업', placeholder: '예: 넥슨, 크래프톤' },
  role:    { label: '직군',      placeholder: '예: 게임 클라이언트 개발자' },
  field:   { label: '분야',      placeholder: '예: 소프트웨어 개발 전반' },
});

/**
 * 단위 테스트 — 판정 로직 · 링크 안전성 · 프로필 입출력
 * ─────────────────────────────────────────────────────────
 *   node scripts/test.mjs   (= npm test)
 *
 * 여기서 검증하는 것은 ★AI가 아니라 우리 코드★다.
 * 모델 응답은 매번 달라지지만, 그 응답을 받아 무엇을 걸러내고 무엇을 보여줄지
 * 결정하는 판정 로직은 결정론적이어야 한다. 그 부분만 고정해 둔다.
 *
 * 외부 라이브러리를 쓰지 않는다 — 이 저장소는 의존성 0개다.
 */

// ── localStorage 흉내 (profile.js 가 브라우저 API를 쓴다) ──
const store = {};
globalThis.localStorage = new Proxy({
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
}, {
  // Object.keys(localStorage) 가 저장된 키를 돌려주게 한다 (clearCache 가 이걸 쓴다)
  ownKeys: (t) => [...Object.keys(store), ...Reflect.ownKeys(t)],
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

const { judgeAvailability, canRecommend, safeHttpUrl, linkKind, isStudentProgram } =
  await import('../js/pipeline.js');
const P = await import('../js/profile.js');

// ─────────────────────────────────────────────
//  아주 작은 테스트 러너
// ─────────────────────────────────────────────
let pass = 0;
const failures = [];
let group = '';

const describe = (name) => { group = name; console.log(`\n${name}`); };
const t = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failures.push(`${group} › ${name}`); console.log(`  ✗ ${name}`); }
};

// ─────────────────────────────────────────────
//  1. 모집 상태 판정 (judgeAvailability)
//
//  기준일을 코드가 아니라 인자로 받게 만들어 둔 덕분에 시간에 의존하지 않는다.
// ─────────────────────────────────────────────
describe('1. 모집 상태 판정');

const TODAY = new Date('2026-08-06T00:00:00Z');
const j = (p) => judgeAvailability(p, TODAY);

// 판정이 읽는 필드는 applicationEndAt / eventEndAt 이다.
// (types.js 의 `deadline` 은 항상 null 로만 채워지는 잔재 필드로, 판정에 쓰이지 않는다.
//  처음 이 테스트를 쓸 때 deadline 으로 넣었다가 4건이 실패했다 — 코드가 아니라 테스트가 틀렸다.)
t('신청 마감일이 지났으면 closed',
  j({ applicationEndAt: '2026-07-01' }).availability === 'closed');
t('신청 마감일이 남았으면 open',
  j({ applicationEndAt: '2026-09-01' }).availability === 'open');
t('신청 마감일이 오늘이면 아직 open',
  j({ applicationEndAt: '2026-08-06' }).availability === 'open');
t('행사 종료일이 지났으면 closed',
  j({ eventEndAt: '2026-07-01' }).availability === 'closed');
t('신청 시작 전이면 upcoming',
  j({ applicationStartAt: '2026-09-01' }).availability === 'upcoming');
t('신청 기간 중이면 open',
  j({ applicationStartAt: '2026-08-01', applicationEndAt: '2026-08-20' }).availability === 'open');
t('상시 운영 표현이 있으면 ongoing',
  j({ programTitle: '명지튜터링', summary: '연중 상시 운영' }).availability === 'ongoing');
t('날짜가 없고 게시일도 없으면 unknown',
  j({}).availability === 'unknown');
t('이번 학년도 게시물은 unknown (닫지 않는다)',
  j({ postedAt: '2026-03-05' }).availability === 'unknown');
t('학년도 시작 직후 게시물도 unknown',
  j({ postedAt: '2026-03-01' }).availability === 'unknown');
t('지난 학년도 + 120일 초과면 closed',
  j({ postedAt: '2026-02-20' }).availability === 'closed');
t('지난 학년도 게시물의 사유에 근거가 적힌다',
  /지난 학년도/.test(j({ postedAt: '2026-02-20' }).reason || ''));
t('2년 전 게시물은 closed',
  j({ postedAt: '2024-11-27' }).availability === 'closed');
t('명시적 마감일이 있으면 오래된 게시일보다 우선한다 (상시 프로그램을 죽이지 않는다)',
  j({ postedAt: '2024-01-01', applicationEndAt: '2026-09-01' }).availability === 'open');
t('잘못된 날짜 문자열에 터지지 않는다',
  ['open', 'closed', 'unknown', 'ongoing', 'upcoming']
    .includes(j({ postedAt: '어제', applicationEndAt: 'ㅁㄴㅇㄹ' }).availability));
t('날짜가 null 이어도 터지지 않는다',
  j({ postedAt: null, applicationEndAt: null }).availability === 'unknown');

describe('2. 추천 가능 여부 (canRecommend)');
t('closed 는 추천하지 않는다',
  canRecommend({ ...j({ deadline: '2026-07-01' }), availability: 'closed' }, TODAY) === false);
t('open 은 추천한다',
  canRecommend({ availability: 'open' }, TODAY) === true);
t('unknown 은 추천한다 (모른다고 숨기지 않는다)',
  canRecommend({ availability: 'unknown' }, TODAY) === true);

// ─────────────────────────────────────────────
//  3. 링크 안전성 (safeHttpUrl)
//
//  이 값은 화면에서 <a href> 가 된다.
//  모델이 만든 문자열이므로 스킴을 반드시 확인해야 한다.
// ─────────────────────────────────────────────
describe('3. 링크 스킴 검증');

t('https 는 통과', safeHttpUrl('https://www.mjc.ac.kr/a') === 'https://www.mjc.ac.kr/a');
t('http 는 통과', safeHttpUrl('http://www.mjc.ac.kr/a').startsWith('http://'));
t('javascript: 는 차단', safeHttpUrl('javascript:alert(1)') === '');
t('대소문자 섞인 JaVaScRiPt: 도 차단', safeHttpUrl('JaVaScRiPt:alert(1)') === '');
t('앞뒤 공백이 붙은 javascript: 도 차단', safeHttpUrl('  javascript:alert(1)  ') === '');
t('data: 는 차단', safeHttpUrl('data:text/html,<script>x</script>') === '');
t('file: 는 차단', safeHttpUrl('file:///etc/passwd') === '');
t('URL 이 아니면 빈 문자열', safeHttpUrl('그냥 글자') === '');
t('null/undefined 에 터지지 않는다', safeHttpUrl(null) === '' && safeHttpUrl(undefined) === '');

// ─────────────────────────────────────────────
//  4. 링크 종류 판별 (linkKind)
//
//  "페이지가 열린다"와 "이 URL이 그 프로그램의 공지다"는 다르다.
//  목록 페이지는 제목 검사를 통과해버리므로 배지를 강등해야 한다.
// ─────────────────────────────────────────────
describe('4. 링크 종류 판별');

t('게시판 상세는 notice',
  linkKind('https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=100&data_idx=BD0000000073') === 'notice');
t('게시판 목록은 list',
  linkKind('https://cls.mjc.ac.kr/bbs/data/list.do?menu_idx=100') === 'list');
t('도메인 첫 화면은 list',
  linkKind('https://mpu.mjc.ac.kr/') === 'list');
t('산학 채용 상세는 notice',
  linkKind('https://sanhak.mjc.ac.kr/user/WoUser0101V.do?WO_SEQ=1234') === 'notice');
t('그 외 안내 페이지는 page',
  linkKind('https://sanhak.mjc.ac.kr/user/Cts/Cts0201.do') === 'page');

// ─────────────────────────────────────────────
//  5. 교내 프로그램 판별 (isStudentProgram)
//
//  ★진짜 프로그램을 죽이지 않는 것★이 차단률보다 중요하다.
//  아래 "통과해야 한다" 항목이 이 필터의 안전선이다.
// ─────────────────────────────────────────────
describe('5. 교내 프로그램 판별 — 진짜는 살린다');

const prog = (programTitle, sourceUrl = 'https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=999&data_idx=BD1') =>
  ({ programTitle, sourceUrl, summary: '' });

t('비교과 프로그램은 통과',
  isStudentProgram(prog('2026학년도 하계방학 AI 비교과 프로그램')) === true);
t('학과명이 붙은 인턴십도 통과 (프로그램 낱말이 있으면 산다)',
  isStudentProgram(prog('연계 산업체 인턴십 프로그램(커뮤니케이션디자인과)')) === true);
t('현장실습학기제는 통과',
  isStudentProgram(prog('WE-GO 현장실습 학기제 (자율)')) === true);
t('소수집단학생 대상 프로그램은 통과 (걸러내면 안 된다)',
  isStudentProgram(prog('소수집단학생 이타겟 비교과 프로그램')) === true);

describe('6. 교내 프로그램 판별 — 프로그램이 아닌 것은 막는다');

t('교원 초빙은 제외',
  isStudentProgram(prog('[교원초빙] 2026학년도 전임교원 초빙 공고')) === false);
t('띄어쓰기가 달라도 제외된다',
  isStudentProgram(prog('교원 초빙 공고')) === false);
t('평생교육본부 도메인은 제외',
  isStudentProgram(prog('AI 과정', 'https://edu.mjc.ac.kr/a')) === false);
t('입시 도메인은 제외',
  isStudentProgram(prog('수시 모집', 'https://ipsi.mjc.ac.kr/a')) === false);
t('차단 게시판은 제외',
  isStudentProgram(prog('무엇이든', 'https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=2711&data_idx=BD1')) === false);
t('소수학생게시판(3145)은 차단되지 않는다',
  isStudentProgram(prog('장애학생 지원 프로그램', 'https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=3145&data_idx=BD1')) === true);

// ─────────────────────────────────────────────
//  7. 프로필 내보내기 · 불러오기
//
//  서버에 계정이 없으므로 이 파일이 사용자의 유일한 백업 경로다.
//  남이 준 파일을 그대로 넣으면 화면이 백지가 되므로 모양을 확인해야 한다.
// ─────────────────────────────────────────────
describe('7. 프로필 내보내기 · 불러오기');

const threw = (fn) => { try { fn(); return false; } catch { return true; } };

t('프로필이 없으면 내보내기가 거절된다', threw(() => P.exportProfile()));

P.saveProfile({
  ...P.emptyProfile(),
  department: '인공지능게임소프트웨어학과',
  grade: 1,
  skills: [{ name: 'C#', level: '학습 중' }],
  completedActivities: [{ programTitle: 'AI 비교과', gainedSkill: '포트폴리오' }],
  traits: { activityPreference: 'team', supportDisability: true },
});

const ex = P.exportProfile();
t('내보내기에 종류·버전이 붙는다', ex.kind === 'careerbridge-mjc.profile' && ex.version === 1);
t('내보내기에 이행 기록이 담긴다', ex.profile.completedActivities.length === 1);
t('파일명에 학과와 날짜가 들어간다',
  /^CareerBridge_인공지능게임소프트웨어학과_\d{4}-\d{2}-\d{2}\.json$/.test(P.exportFilename(ex.profile)));
t('파일명에 경로 특수문자가 남지 않는다',
  !/[\\/:*?"<>|]/.test(P.exportFilename({ department: 'a/b:c*d' })));

// 다른 프로필로 덮어쓴 뒤 되돌린다 — 왕복이 실제로 복원되는지 본다
P.saveProfile({ ...P.emptyProfile(), department: '전혀 다른 학과' });
const back = P.importProfile(JSON.stringify(ex));
t('왕복 후 학과가 복원된다', back.department === '인공지능게임소프트웨어학과');
t('왕복 후 이행 기록이 복원된다', back.completedActivities.length === 1);
t('왕복 후 supportDisability 가 유지된다', back.traits.supportDisability === true);
t('불러오기가 localStorage 에 반영된다',
  JSON.parse(store['mypath.profile']).department === '인공지능게임소프트웨어학과');

t('JSON 이 아니면 거절', threw(() => P.importProfile('not json{{')));
t('배열이면 거절', threw(() => P.importProfile('[1,2,3]')));
t('빈 객체면 거절', threw(() => P.importProfile('{}')));
t('남의 형식이면 거절', threw(() => P.importProfile('{"foo":"bar"}')));
t('null 이면 거절', threw(() => P.importProfile('null')));

const old = P.importProfile('{"department":"사회복지과","grade":2}');
t('옛 버전 파일의 빠진 배열이 채워진다',
  Array.isArray(old.completedActivities) && Array.isArray(old.skills) && Array.isArray(old.certificates));
t('옛 버전 파일의 traits 가 채워진다', old.traits && 'activityPreference' in old.traits);
t('봉투 없이 프로필 객체만 줘도 받아준다',
  P.importProfile(JSON.stringify(ex.profile)).department === '인공지능게임소프트웨어학과');

// ─────────────────────────────────────────────
//  8. 성장 루프 (markCompleted)
// ─────────────────────────────────────────────
describe('8. 성장 루프');

P.saveProfile({ ...P.emptyProfile(), department: '테스트과', skills: [], completedActivities: [] });
const after = P.markCompleted({ programTitle: '프로그램 A', gapSkill: 'Git', sourceUrl: 'https://a' });
t('이행하면 보유 기술에 쌓인다',
  after.skills.some((s) => s.name === 'Git' && s.level === '프로그램 이수'));
t('이행 기록이 남는다', after.completedActivities.length === 1);

const twice = P.markCompleted({ programTitle: '프로그램 A', gapSkill: 'Git', sourceUrl: 'https://a' });
t('같은 프로그램을 두 번 눌러도 중복되지 않는다',
  twice.completedActivities.length === 1 && twice.skills.filter((s) => s.name === 'Git').length === 1);

const undone = P.unmarkCompleted('프로그램 A');
t('이행을 취소하면 기록이 사라진다', undone.completedActivities.length === 0);
t('이행으로 얻었던 기술도 함께 사라진다', !undone.skills.some((s) => s.name === 'Git'));

// ─────────────────────────────────────────────
//  결과
// ─────────────────────────────────────────────
const total = pass + failures.length;
console.log(`\n${'─'.repeat(46)}`);
if (failures.length) {
  console.log(`❌ ${total}개 중 ${failures.length}개 실패\n`);
  failures.forEach((f) => console.log(`   ${f}`));
  process.exit(1);
}
console.log(`✅ 단위 테스트 ${total}개 전부 통과`);

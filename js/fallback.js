/**
 * 폴백 데이터 — 교내 프로그램 143건
 * ─────────────────────────────────────────────────────────
 * 실시간 검색(sonar-pro)이 실패하거나 결과가 비었을 때 쓰는 예비 데이터다.
 *
 * 수집 방법:
 *   mjc.ac.kr 하위 10개 도메인에 직접 HTTP 요청해 수집했다.
 *   고유 출처 URL 전부 HTTP 200 응답과 본문 렌더링을 확인했다.
 *   추정하거나 지어낸 항목은 없다. 확인되지 않은 값은 null 로 둔다.
 *
 * 수집 일자: 2026-08-06
 *
 * 도메인별 분포:
 *   www.mjc.ac.kr           51건
 *   cls.mjc.ac.kr           25건
 *   mpu.mjc.ac.kr           16건
 *   sanhak.mjc.ac.kr        15건
 *   rise.mjc.ac.kr          10건
 *   inter.mjc.ac.kr         10건
 *   mrcc.mjc.ac.kr           7건
 *   edu.mjc.ac.kr            6건
 *   mjcd.mjc.ac.kr           2건
 *   mjcs.mjc.ac.kr           1건
 *
 * 주의:
 *   RISE·edu·mrcc 의 상당수 과정은 대상이 "만 20세/25세 이상 지역주민·성인학습자"다.
 *   summary 에 대상 조건을 적어두었으므로 재학생 대상 여부는 그 문구로 판단한다.
 *   ★ 우리는 참여 자격을 판정하지 않는다. 원문 URL 로 안내하는 것까지가 역할이다.
 */

/** @type {Array<{programTitle:string, summary:string, skillKeywords:string[], sourceUrl:string, sourceDomain:string, postedAt:string|null, department:string|null}>} */
export const FALLBACK_PROGRAMS = [
 {
  "programTitle": "2026학년도 하계방학 AI 비교과 프로그램 (Claude Code 기반 AI 코딩 배우기)",
  "summary": "AI 코딩 에이전트(Claude Code)로 기획-코딩-디버깅-배포 전 과정을 32시간 실습하는 대면 특강, 수강생에게 Claude Pro 구독료 8주 지원",
  "skillKeywords": [
   "AI",
   "프로그래밍",
   "AI코딩",
   "자동화",
   "실무경험",
   "포트폴리오"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000073",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-06-17",
  "department": "자유전공학과 / 정보통신공학과"
 },
 {
  "programTitle": "2026학년도 전산 자격증 취득 지원 프로그램",
  "summary": "컴퓨터활용능력 등 전산 자격증을 교양 교과 연계 또는 자기주도 학습으로 준비하고, 취득 시 장학금 5만원과 역량마일리지 300점 지급",
  "skillKeywords": [
   "자격증",
   "컴활",
   "전산활용",
   "취업준비",
   "장학금"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390006",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-05-11",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "교과 연계 비교과 전산 자격증 취득 프로그램",
  "summary": "컴퓨터활용능력 교양 교과목 수강생 대상 실시간 ZOOM 자격증 대비반, 수강료 전액 지원 및 취득 시 마일리지 200점·정액 5만원 지급",
  "skillKeywords": [
   "자격증",
   "컴활",
   "온라인학습",
   "취업준비"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389818",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-03-19",
  "department": "진로취ㆍ창업팀"
 },
 {
  "programTitle": "AI Study+ (AI 활용 경진대회)",
  "summary": "생성형 AI로 학습비결·전공과제·교육콘텐츠를 주제로 숏폼 영상과 기획안을 제작해 겨루는 교내 경진대회",
  "skillKeywords": [
   "AI",
   "생성형AI",
   "콘텐츠제작",
   "경진대회",
   "포트폴리오",
   "문제해결"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000058",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-05-04",
  "department": "교수학습팀"
 },
 {
  "programTitle": "AI Study+ (대면 워크숍)",
  "summary": "생성형 LLM과 AI 영상 편집툴로 숏폼 영상을 설계·제작하는 대면 워크숍(AI 이미지·프롬프트 전략 포함)",
  "skillKeywords": [
   "AI",
   "생성형AI",
   "프롬프트",
   "영상제작",
   "콘텐츠제작"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000053",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-16",
  "department": "교수학습팀"
 },
 {
  "programTitle": "AI Study+ (실시간 특강)",
  "summary": "'대학생들의 AI 리터러시 기르기' 주제 Zoom 실시간 특강, 이후 e-Class로 녹화영상 제공",
  "skillKeywords": [
   "AI",
   "AI리터러시",
   "온라인특강"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000043",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-01",
  "department": "교수학습팀"
 },
 {
  "programTitle": "AI Study+ (온라인 콘텐츠)",
  "summary": "AI 시대 이해·생성형 AI의 이해·AI 윤리·AI와 표절 등 4개 온라인 콘텐츠를 e-Class에서 신청 없이 수강",
  "skillKeywords": [
   "AI",
   "AI윤리",
   "온라인학습",
   "자기주도학습"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000039",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-25",
  "department": "교수학습팀"
 },
 {
  "programTitle": "AI-DEAS(에이아이디어스) 학습동아리",
  "summary": "팀 단위 학습동아리로 AI 프로그램 구독료를 지원받아 AI를 활용한 학습 성과물을 만드는 프로그램",
  "skillKeywords": [
   "AI",
   "협업",
   "학습동아리",
   "프로젝트",
   "자기주도학습"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000025",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-09",
  "department": "교수학습팀"
 },
 {
  "programTitle": "AI를 활용한 진로 포트폴리오 작성",
  "summary": "AI 도구를 활용해 자신의 진로 포트폴리오를 작성하는 비교과 프로그램(AID 실천활용 역량 2시간)",
  "skillKeywords": [
   "AI",
   "포트폴리오",
   "진로설계",
   "취업준비"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389873",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-09-10",
  "department": "AI융합진로지원센터"
 },
 {
  "programTitle": "실전 AI 기반 셀프뷰(SelfView) AI 가상면접 프로그램",
  "summary": "직무·기업별 맞춤 면접 질문에 답하면 AI가 답변을 분석·피드백해 주는 가상면접 연습(참여 시 마일리지 20점)",
  "skillKeywords": [
   "AI",
   "면접준비",
   "취업준비",
   "자기소개서"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389962",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-25",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "AI 모의면접 경진대회",
  "summary": "AI 모의면접 시스템으로 예선을 치르고 본선에서 경쟁하는 면접 역량 경진대회",
  "skillKeywords": [
   "AI",
   "면접준비",
   "취업준비",
   "경진대회"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389900",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-10-29",
  "department": "진로취ㆍ창업팀"
 },
 {
  "programTitle": "「마이크로코딩」 마이크로전공과정",
  "summary": "IT 비전공자를 위한 18학점 코딩 트랙 — 컴퓨팅사고와SW이해(스크래치/앱인벤터), 기초SW코딩(파이썬), 프론트엔드웹개발 기초·응용(HTML/CSS/JS), 데이터과학기초, 사물인터넷기초",
  "skillKeywords": [
   "프로그래밍",
   "파이썬",
   "웹개발",
   "데이터과학",
   "IoT",
   "SW"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=2891",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 (학사안내)"
 },
 {
  "programTitle": "「크리에이티브콘텐츠」 마이크로전공과정",
  "summary": "기초프로그래밍·그래픽기초·콘텐츠제작·디지털마케팅·통합캡스톤디자인 15학점으로 VR/AR·게임·AI 콘텐츠 제작 역량을 기르는 융합 전공",
  "skillKeywords": [
   "프로그래밍",
   "콘텐츠제작",
   "그래픽",
   "캡스톤디자인",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=2891",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 (학사안내)"
 },
 {
  "programTitle": "융복합 모듈형 교육과정 (융복합 모듈전공)",
  "summary": "입학 전공 외에 여러 학과 교과를 모듈·트랙 형태로 조합해 새로운 직무 교육과정을 이수하는 융복합 전공 제도",
  "skillKeywords": [
   "융복합",
   "전공심화",
   "진로설계",
   "직무역량"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3134",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀"
 },
 {
  "programTitle": "AI융합 마이크로디그리 과정 / 통합전공(캡스톤디자인·디자인씽킹·창업실습·실전창업AI)",
  "summary": "산학AI융합지원센터가 운영하는 AI융합 마이크로디그리와 캡스톤디자인·디자인씽킹 등 실전 산학연계 프로젝트 교과",
  "skillKeywords": [
   "AI",
   "캡스톤디자인",
   "디자인씽킹",
   "프로젝트",
   "실무경험",
   "창업"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3050",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처 산학AI융합지원센터"
 },
 {
  "programTitle": "캡스톤디자인 경진대회",
  "summary": "전공 지식을 적용해 제작한 캡스톤디자인 작품으로 겨루는 교내 경진대회(수상작 발표)",
  "skillKeywords": [
   "캡스톤디자인",
   "프로젝트",
   "경진대회",
   "포트폴리오",
   "협업"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389921",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-12-19",
  "department": "산학협력팀"
 },
 {
  "programTitle": "표준·자율 현장실습학기제 및 인턴십 (현장실습지원센터)",
  "summary": "통합전공 현장실습 교과목과 인턴십, 서울시 영커리언스·고용노동부 일경험 등 외부 연계 현장실습 프로그램 운영",
  "skillKeywords": [
   "현장실습",
   "인턴십",
   "실무경험",
   "산학협력",
   "취업"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3368",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처 현장실습지원센터"
 },
 {
  "programTitle": "2026 전문대학 글로벌 현장학습 (해외 인턴십)",
  "summary": "국내 사전교육 50시간(어학·안전·직무) 후 호주 NSW TAFE 등 해외 기관에서 16주간 현장학습하는 해외 인턴십",
  "skillKeywords": [
   "해외인턴십",
   "현장실습",
   "어학",
   "글로벌",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389934",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-01-14",
  "department": "글로벌교육팀"
 },
 {
  "programTitle": "2026학년도 하계방학 글로벌 진로·취업연수 (말레이시아)",
  "summary": "말레이시아 쿠알라룸푸르에서 4주/90시간 진행하는 해외 취업 연계 진로·취업 연수",
  "skillKeywords": [
   "글로벌",
   "해외연수",
   "취업준비",
   "어학",
   "진로설계"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000050",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-14",
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "글로벌 어학아카데미",
  "summary": "TOEIC·TOEIC Speaking·HSK·JLPT 공인어학시험 점수 향상을 위한 수준별 어학 강의(학기당 125명 규모)",
  "skillKeywords": [
   "어학",
   "영어",
   "일본어",
   "중국어",
   "자격증",
   "글로벌"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000030",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-17",
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "글로벌 외국어회화",
  "summary": "원어민 강사와 1:1 수준 맞춤형 외국어 회화(영어 10분×24회 등) 과정",
  "skillKeywords": [
   "어학",
   "회화",
   "영어",
   "글로벌",
   "커뮤니케이션"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000031",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-17",
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "외국어(영어) 스피치 경진대회",
  "summary": "예선(서면 피드백)-본선(현장 발표) 절차로 진행되는 영어 말하기 경진대회",
  "skillKeywords": [
   "어학",
   "영어",
   "발표력",
   "경진대회",
   "글로벌"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000054",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-20",
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "글로벌 버디버디",
  "summary": "한국인 재학생(도우미)과 외국인 유학생(배우미)을 1:1 매칭해 생활 정착과 글로벌 역량을 함께 기르는 프로그램",
  "skillKeywords": [
   "글로벌",
   "협업",
   "커뮤니케이션",
   "멘토링",
   "어학"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389955",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-18",
  "department": "유학생지원팀"
 },
 {
  "programTitle": "명지튜터링",
  "summary": "튜터-튜티가 팀을 이뤄 전공/교양 교과를 15~18시간 협동학습하는 학습공동체 프로그램",
  "skillKeywords": [
   "협업",
   "학습공동체",
   "멘토링",
   "전공역량",
   "리더십"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000029",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-12",
  "department": "교수학습팀"
 },
 {
  "programTitle": "버디업 멘토링",
  "summary": "성적 우수 버디멘토와 버디멘티를 1:1 매칭해 학습 습관 형성과 대학생활 적응을 지원",
  "skillKeywords": [
   "멘토링",
   "협업",
   "자기주도학습",
   "대학적응"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000026",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-09",
  "department": "교수학습팀"
 },
 {
  "programTitle": "Learning C.R.E.W (대면 특강 / 실시간 특강 / 콘텐츠 특강)",
  "summary": "학습역량 진단검사 결과를 토대로 학습전략을 제공하는 특강 시리즈(MBTI 활용 학습로드맵, 마이크로러닝 콘텐츠 10개)",
  "skillKeywords": [
   "학습전략",
   "자기주도학습",
   "특강",
   "온라인학습"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000059",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-05-06",
  "department": "교수학습팀"
 },
 {
  "programTitle": "도전! 학습톡톡",
  "summary": "SNS 기반 디지털 학습환경에서 계획-활동-성찰 구조로 학습을 기록하고 피드백받는 프로그램(AI 학습활용 가이드 시청 포함)",
  "skillKeywords": [
   "자기주도학습",
   "학습관리",
   "AI",
   "성찰"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000024",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-09",
  "department": "교수학습팀"
 },
 {
  "programTitle": "학습컨설팅 (MLST-II 학습전략검사 + 1:1 상담)",
  "summary": "MLST-Ⅱ 학습전략검사 후 검사 결과에 따라 1:1 맞춤 학습상담을 제공(학기 중·방학 중 운영)",
  "skillKeywords": [
   "학습전략",
   "진단검사",
   "1:1상담",
   "자기주도학습"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000077",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-06-23",
  "department": "교수학습팀"
 },
 {
  "programTitle": "1:1 맞춤형 진로코칭 프로그램",
  "summary": "회복탄력성 검사와 1:1 진로코칭으로 위기 극복 능력과 진로설계를 지원",
  "skillKeywords": [
   "진로설계",
   "1:1코칭",
   "진단검사",
   "자기이해"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389975",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-04-02",
  "department": "AI융합진로지원센터"
 },
 {
  "programTitle": "취업동아리 / 창업동아리",
  "summary": "재학생 3명 이상+지도교수 1명으로 팀을 구성해 서면평가로 선정되는 취업·창업 동아리 활동 지원",
  "skillKeywords": [
   "취업",
   "창업",
   "협업",
   "동아리",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389946",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-05",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "잡카페(JOB CAFE) 진로취·창업 상담 및 취업지원",
  "summary": "본관 1층 M STREET 상시 운영 — 진로/취창업 상담, 이력서·자기소개서 첨삭, 면접교육 및 AI면접 실습, 이미지 클리닉",
  "skillKeywords": [
   "취업준비",
   "자기소개서",
   "면접준비",
   "1:1상담",
   "진로설계"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389830",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-04-22",
  "department": "진로취ㆍ창업팀"
 },
 {
  "programTitle": "커리어 잡고(JOB GO) 가자!",
  "summary": "이틀간 열리는 대형 진로·취업 행사 — 직무/진로/취업 컨설팅 부스 24개, AI모의면접존, 이력서 사진 촬영, 취업인포존 운영",
  "skillKeywords": [
   "취업준비",
   "진로설계",
   "AI면접",
   "네트워킹",
   "포트폴리오"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389894",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-10-22",
  "department": "진로취ㆍ창업팀"
 },
 {
  "programTitle": "취·창업팀 온라인 콘텐츠 (진로/직무이해/취업준비 기초/직장 기초소양)",
  "summary": "E-Class에서 상시 수강하는 취업 준비 온라인 강의(학기 중 수강 시 마일리지 지급)",
  "skillKeywords": [
   "취업준비",
   "직무이해",
   "온라인학습",
   "진로설계"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390003",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-05-06",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "창업신기술 특강",
  "summary": "'창업아이디어 빌딩' 주제로 고객 문제 기반 아이디어 발굴과 제품 컨셉 설계를 배우는 대면 특강(마일리지 60P)",
  "skillKeywords": [
   "창업",
   "아이디어발굴",
   "기획",
   "특강"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000052",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-15",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "온라인 창업특강",
  "summary": "온라인으로 수강하는 창업 특강 프로그램",
  "skillKeywords": [
   "창업",
   "온라인학습",
   "특강"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000067",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-05-26",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "스타트업 플리마켓",
  "summary": "재학생 2명 이상 팀이 창업 시제품을 제작·판매하며 간접 창업경험을 쌓는 행사(종합학술제 연계)",
  "skillKeywords": [
   "창업",
   "시제품제작",
   "협업",
   "실무경험",
   "마케팅"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390015",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-05-28",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "학생창업 지원 제도 (창업휴학·학생창업장학금)",
  "summary": "창업 진행 중인 재학·휴학생을 창업자로 인정해 창업휴학과 학생창업장학금 등 행·재정 지원",
  "skillKeywords": [
   "창업",
   "장학금",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389951",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-13",
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "IR챌린지 경진대회 (캠퍼스타운)",
  "summary": "창업 아이디어를 IR 피칭 형태로 발표해 겨루는 경진대회(시상금 100만원)",
  "skillKeywords": [
   "창업",
   "발표력",
   "기획",
   "경진대회",
   "IR피칭"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389832",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-04-23",
  "department": "캠퍼스타운사업단"
 },
 {
  "programTitle": "MJC 창업보육(Ⅰ)센터 입주기업 모집",
  "summary": "창업 후 10년 이내 기업 및 예비창업자를 대상으로 교내 창업보육센터 입주 공간·지원 제공",
  "skillKeywords": [
   "창업",
   "인큐베이팅",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390037",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-08-06",
  "department": "산학협력팀"
 },
 {
  "programTitle": "AID 역량 연계 비교과 프로그램 (기본소양-실천활용-응용심화)",
  "summary": "AID(AI·Digital) 역량 3단계 로드맵으로 묶인 비교과 세트 — 취창업 온라인 콘텐츠, AI Study+, 셀프뷰 AI 가상면접, AI 포트폴리오 작성, AI-DEAS 학습동아리",
  "skillKeywords": [
   "AI",
   "디지털역량",
   "비교과",
   "취업준비",
   "포트폴리오"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000068",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-05-26",
  "department": "교육과정혁신팀 / 교수학습팀 / 취·창업팀"
 },
 {
  "programTitle": "AID 역량 인증제",
  "summary": "지정 자격증 취득과 AID 관련 활동으로 미래 융합형 인재 AID 역량을 인증받는 제도",
  "skillKeywords": [
   "AI",
   "디지털역량",
   "자격증",
   "인증"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=169&bbs_mst_idx=BM0000000025&data_idx=BD0050388035",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-02-09",
  "department": "교무처 교육과정혁신팀"
 },
 {
  "programTitle": "교양기반 마이크로크리덴셜 과정",
  "summary": "교양 교과를 기반으로 소단위 학습 성과를 인증하는 마이크로크리덴셜 과정",
  "skillKeywords": [
   "마이크로크리덴셜",
   "교양",
   "인증",
   "학습이력"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=169&bbs_mst_idx=BM0000000025&data_idx=BD0050388033",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-02-06",
  "department": "교무처 교육과정혁신팀"
 },
 {
  "programTitle": "디지털배지 운영 프로그램",
  "summary": "교육과정 이수 성과를 디지털배지로 발급해 학습이력을 인증하는 제도(RISE사업단 발급 매뉴얼 별도 안내)",
  "skillKeywords": [
   "디지털배지",
   "학습이력",
   "인증",
   "포트폴리오"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389944",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-02-20",
  "department": "전문기술인력양성팀"
 },
 {
  "programTitle": "AID 묶음강좌 — AI 콘텐츠 크리에이터 양성과정",
  "summary": "사무업무 효율화를 위한 LLM 활용, AI 소셜 콘텐츠 제작 프로세스, AI 영상 제작 마스터 클래스 3개 묶음강좌(K-MOOC 학점인정 + 디지털배지 + 현직자 멘토링)",
  "skillKeywords": [
   "AI",
   "LLM",
   "콘텐츠제작",
   "영상제작",
   "디지털배지",
   "멘토링"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389917",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-12-03",
  "department": "평생교육본부 성인학습지원센터"
 },
 {
  "programTitle": "[RISE/고숙련] BFD(뷰티·패션·디자인)분야 고숙련 전문기술 교육과정",
  "summary": "서울시 RISE 사업으로 명지전문대학과 서울시가 함께 운영하는 지산학 연계 고숙련 전문기술 취·창업 교육과정",
  "skillKeywords": [
   "전문기술",
   "취업",
   "창업",
   "RISE",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389911",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-11-11",
  "department": "전문기술인력양성팀 (RISE사업단)"
 },
 {
  "programTitle": "K-MOOC 학점인정 제도",
  "summary": "국가평생교육진흥원 K-MOOC 강좌를 이수하면 교양 학점(K-MOOC학점인정 I~III)으로 인정",
  "skillKeywords": [
   "온라인학습",
   "학점인정",
   "자기주도학습"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000051",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-04-15",
  "department": "교무처 학사지원팀"
 },
 {
  "programTitle": "교양교과 AI활용창의융합형리빙랩",
  "summary": "AI를 활용해 실제 문제를 해결하는 창의융합형 리빙랩 교양 교과",
  "skillKeywords": [
   "AI",
   "리빙랩",
   "문제해결",
   "융합",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=169&bbs_mst_idx=BM0000000025&data_idx=BD0050388053",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-05",
  "department": "교무처 학사지원팀"
 },
 {
  "programTitle": "학과별 전공기초과정",
  "summary": "컴퓨터보안공학과(프로그래밍 기초·정보보호 기초), 전자공학과(임베디드시스템기초·인공지능기초) 등 학과별 전공 기초를 4~8시간 대면 학습",
  "skillKeywords": [
   "프로그래밍",
   "정보보호",
   "임베디드",
   "AI",
   "전공기초"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000038",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-23",
  "department": "융합교육지원센터"
 },
 {
  "programTitle": "자유전공학과 전공 브릿지 프로그램",
  "summary": "학과 배정 확정자를 대상으로 1학기에 못 들은 전공 내용을 보충하고 2학기 전공 수업 적응을 돕는 프로그램",
  "skillKeywords": [
   "전공탐색",
   "학업지원",
   "진로설계"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000065",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-05-15",
  "department": "자유전공학과"
 },
 {
  "programTitle": "자유전공학과 진로 탐색 프로그램 / 신입생 진로캠프",
  "summary": "신입생 대상 교외 진로캠프와 진로 탐색 활동으로 전공·진로 방향을 설정",
  "skillKeywords": [
   "진로설계",
   "전공탐색",
   "네트워킹"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000004",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-02-05",
  "department": "자유전공학과 / AI융합진로지원센터"
 },
 {
  "programTitle": "MJC역량마일리지 장학제도",
  "summary": "비교과 프로그램 90여 개에 참여해 마일리지를 적립하면 260P 이상부터 최대 30만원(우수자 추가 70만원) 장학금 지급",
  "skillKeywords": [
   "비교과",
   "장학금",
   "학습이력",
   "역량관리"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=2878",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "학생복지팀 / AI·IR센터"
 },
 {
  "programTitle": "듣말쓰 챌린지: 기초문해력 (기초/심화/확산)",
  "summary": "대학생활·사회생활에 필요한 듣기·말하기·쓰기 의사소통 능력을 3단계로 훈련하는 챌린지",
  "skillKeywords": [
   "문해력",
   "커뮤니케이션",
   "글쓰기",
   "발표력"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000034",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-18",
  "department": "교수학습팀"
 },
 {
  "programTitle": "도서관 이용자 교육",
  "summary": "도서관 시설·자료 이용법과 전자정보 활용법을 온·오프라인으로 안내하는 교육",
  "skillKeywords": [
   "정보활용",
   "리서치",
   "전자정보"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000034",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-18",
  "department": "학술정보팀 (도서관)"
 },
 {
  "programTitle": "명지 리더스 챌린지 (독후감 경진대회)",
  "summary": "자유도서 독서감상문을 제출해 겨루는 도서관 주관 경진대회(수상 시 장학금, 참가자 마일리지 20점)",
  "skillKeywords": [
   "글쓰기",
   "독서",
   "경진대회",
   "사고력"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389885",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-09-24",
  "department": "학술정보팀"
 },
 {
  "programTitle": "전문대학 혁신지원사업 숏폼(Short-form) 영상 콘텐츠 공모전",
  "summary": "혁신지원사업 참여 후기·프로그램 소개를 주제로 숏폼 영상을 제작해 출품하는 전국 단위 공모전",
  "skillKeywords": [
   "영상제작",
   "콘텐츠제작",
   "공모전",
   "포트폴리오"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390016",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-06-01",
  "department": "대학혁신본부"
 },
 {
  "programTitle": "MJC-학생모니터링단 (6기)",
  "summary": "전문대학 혁신지원사업의 학생 모니터링단으로 활동하며 대학 사업에 의견을 제안(지원서·자기소개서·면접 선발)",
  "skillKeywords": [
   "의사소통",
   "리더십",
   "기획",
   "대외활동"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389947",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-07",
  "department": "대학혁신본부"
 },
 {
  "programTitle": "MJ-mate 상담자 양성과정",
  "summary": "또래상담자 훈련 과정 — 경청·공감·대화기법을 배우고 실습해 MJ-mate 상담사로 인증",
  "skillKeywords": [
   "상담",
   "커뮤니케이션",
   "공감",
   "자격인증",
   "멘토링"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389882",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-11-19",
  "department": "상담지원팀"
 },
 {
  "programTitle": "외국인 유학생을 위한 글쓰기 교육 「Re:Write」",
  "summary": "유학생 대상 한국어 수업·과제·시험답안 작성을 돕는 이론+실습 글쓰기 특강",
  "skillKeywords": [
   "글쓰기",
   "한국어",
   "학업역량",
   "유학생"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050390000",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-05-03",
  "department": "교수학습팀"
 },
 {
  "programTitle": "기초학습능력 진단평가 및 향상교육",
  "summary": "신입생 대상 수학 등 과목별 진단평가 후 미달자에게 향상교육을 제공하고 우수자에게 장학금 지급",
  "skillKeywords": [
   "기초학력",
   "진단평가",
   "학업지원",
   "장학금"
  ],
  "sourceUrl": "https://cls.mjc.ac.kr/bbs/data/view.do?menu_idx=3256&bbs_mst_idx=BM0000002844&data_idx=BD0000000028",
  "sourceDomain": "cls.mjc.ac.kr",
  "postedAt": "2026-03-12",
  "department": "교수학습팀"
 },
 {
  "programTitle": "진로탐색학점제",
  "summary": "학생이 스스로 설계한 진로탐색 활동을 학점으로 인정받는 자기주도 학사 제도(우수사례 팀 장학금 지급)",
  "skillKeywords": [
   "진로설계",
   "자기주도",
   "학점인정",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=66&bbs_mst_idx=BM0000000026&data_idx=BD0050389925",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-01-02",
  "department": "AI융합진로지원센터"
 },
 {
  "programTitle": "국가근로장학금 하계방학 집중근로 프로그램",
  "summary": "방학 중 교내외 기관에서 집중 근로하며 실무를 경험하고 장학금을 받는 프로그램",
  "skillKeywords": [
   "실무경험",
   "근로",
   "장학금",
   "직무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=208&bbs_mst_idx=BM0000000032&data_idx=BD0000000995",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-04-23",
  "department": "학생복지팀"
 },
 {
  "programTitle": "대학생 청소년교육지원사업 멘토",
  "summary": "청소년 대상 교육 멘토로 활동하며 근로장학금을 받는 사업",
  "skillKeywords": [
   "멘토링",
   "교육",
   "실무경험",
   "장학금"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=208&bbs_mst_idx=BM0000000032&data_idx=BD0000000990",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-18",
  "department": "학생복지팀"
 },
 {
  "programTitle": "전문기술인재장학금",
  "summary": "전문기술 분야 인재를 선발해 지원하는 장학 프로그램",
  "skillKeywords": [
   "전문기술",
   "장학금"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=208&bbs_mst_idx=BM0000000032&data_idx=BD0000000991",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2026-03-25",
  "department": "학생복지팀"
 },
 {
  "programTitle": "교내·국가근로장학생 모집 (근로게시판)",
  "summary": "교수학습센터·학술정보팀·정보관리팀·산학협력팀 등 교내 부서에서 학기·방학마다 근로장학생을 모집해 부서 실무를 경험",
  "skillKeywords": [
   "실무경험",
   "근로",
   "장학금",
   "행정업무"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/list.do?menu_idx=3002",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "학생복지팀 외 교내 각 부서"
 },
 {
  "programTitle": "소수집단학생 이타겟(E-Target) 비교과 프로그램",
  "summary": "다문화가족·장애학생 등 소수집단 재학생을 대상으로 별도 운영되는 맞춤형 비교과 프로그램(온라인 콘텐츠 수강 연계)",
  "skillKeywords": [
   "비교과",
   "맞춤지원",
   "학습지원",
   "온라인학습"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/bbs/data/view.do?menu_idx=3145&bbs_mst_idx=BM0000002773&data_idx=BD0000000038",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": "2025-05-28",
  "department": "학생복지팀"
 },
 {
  "programTitle": "「스마트관광」 융복합전공",
  "summary": "관광+ICT+AI를 3학기 유연학기제로 융합하는 57학점 전공 — ICT·AI 융합 캡스톤디자인, 표준현장실습학기제, 호텔서비스사·국외여행인솔자·바리스타·스마트크리에이터 자격증 연계",
  "skillKeywords": [
   "AI",
   "ICT",
   "융복합",
   "캡스톤디자인",
   "현장실습",
   "자격증",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3061",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「IoT융합프로젝트」",
  "summary": "정보통신공학과+전기공학과 공동개발 트랙으로 IoT 융합 프로젝트를 수행",
  "skillKeywords": [
   "IoT",
   "프로그래밍",
   "프로젝트",
   "융복합",
   "협업"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「인공지능응용시스템」",
  "summary": "전자공학+인공지능을 결합해 AI 응용 시스템을 설계·구현하는 융복합 트랙",
  "skillKeywords": [
   "AI",
   "인공지능",
   "시스템개발",
   "융복합"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「게임제작」",
  "summary": "게임기획+게임개발을 묶어 게임 제작 전 과정을 다루는 융복합 트랙",
  "skillKeywords": [
   "게임개발",
   "프로그래밍",
   "기획",
   "프로젝트",
   "포트폴리오"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「앱 개발」",
  "summary": "공학+디자인을 결합해 앱을 기획·개발하는 융복합 트랙",
  "skillKeywords": [
   "앱개발",
   "프로그래밍",
   "UI/UX",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「경영정보시스템 보안」",
  "summary": "경영정보시스템+정보보안을 결합한 융복합 트랙",
  "skillKeywords": [
   "정보보안",
   "경영정보시스템",
   "융복합"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「공공 빅데이터」",
  "summary": "행정+빅데이터를 결합해 공공 데이터 분석 역량을 기르는 융복합 트랙",
  "skillKeywords": [
   "빅데이터",
   "데이터분석",
   "공공행정",
   "융복합"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「영상지도제작」",
  "summary": "사진측량+드론을 결합해 드론 기반 영상지도를 제작하는 융복합 트랙",
  "skillKeywords": [
   "드론",
   "측량",
   "공간정보",
   "실무경험"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「사회조사분석」",
  "summary": "사회복지+조사분석을 결합해 데이터 기반 사회조사 역량을 기르는 융복합 트랙",
  "skillKeywords": [
   "데이터분석",
   "조사분석",
   "사회복지",
   "자격증"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「프롭테크」",
  "summary": "부동산+ICT를 결합한 프롭테크 융복합 트랙",
  "skillKeywords": [
   "ICT",
   "부동산",
   "융복합",
   "데이터"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "융복합 모듈전공 트랙 「지능형 설계·제작」",
  "summary": "기계설계+3D를 결합해 지능형 설계·제작을 다루는 융복합 트랙",
  "skillKeywords": [
   "3D설계",
   "제조",
   "CAD",
   "프로젝트"
  ],
  "sourceUrl": "https://www.mjc.ac.kr/ibuilder.do?menu_idx=3135",
  "sourceDomain": "www.mjc.ac.kr",
  "postedAt": null,
  "department": "교무처 교육과정혁신팀 (융복합 모듈전공)"
 },
 {
  "programTitle": "WE-GO 현장실습 (표준현장실습학기제 / 자율현장실습학기제)",
  "summary": "방학 중 기업에 전일제 파견돼 2~3학점(80~120시간 이상)을 이수하며 실무를 체험하는 현장실습 교과목. 전 학과 재학생 대상, 상해보험·실습지원비 지원",
  "skillKeywords": [
   "실무경험",
   "인턴십",
   "현장실습",
   "취업",
   "직무역량",
   "학점인정"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Cts/Cts0201.do?CURRENT_MENU_CODE=MENU0024&TOP_MENU_CODE=MENU0002",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처 현장실습지원센터"
 },
 {
  "programTitle": "WE-CAN 캡스톤디자인",
  "summary": "전공 이론으로 제품·작품을 기획→설계→제작하는 팀 프로젝트, 과제당 최대 200만원(재료비·산업체 멘토비·발표회비) 지원",
  "skillKeywords": [
   "프로젝트",
   "협업",
   "포트폴리오",
   "제품개발",
   "실무경험",
   "산업체멘토링",
   "지식재산권"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Cts/Cts0202.do?CURRENT_MENU_CODE=MENU0027&TOP_MENU_CODE=MENU0002",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처 / LIGHT 인재혁신지원센터"
 },
 {
  "programTitle": "창업동아리 (WE-CEO)",
  "summary": "재학생 3~10명+지도교수 팀이 운영비·멘토비·MAKER SPACE 전용공간·창업캠프·전문가 특강을 지원받는 창업 동아리",
  "skillKeywords": [
   "창업",
   "기업가정신",
   "팀빌딩",
   "시제품제작",
   "멘토링",
   "경진대회"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Cts/Cts0203.do?CURRENT_MENU_CODE=MENU0030&TOP_MENU_CODE=MENU0002",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처"
 },
 {
  "programTitle": "WE CEO SPARK+ 창업아이디어 경진대회",
  "summary": "재학생 개인/팀 대상 창업 아이디어 공모전, 사업계획서 서류심사와 동영상 발표 본선을 거쳐 최대 100만원 시상, 본선 진출자 마일리지 20점",
  "skillKeywords": [
   "창업",
   "사업계획서",
   "아이디어",
   "발표력",
   "경진대회",
   "포트폴리오"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=1&BBS_NO=675&CURRENT_MENU_CODE=MENU0052&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-11-22",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "현장실습학기제 홍보콘텐츠 공모전",
  "summary": "현장실습 참여 학생이 실습 경험을 5분 미만 FHD 영상으로 제작해 출품하는 공모전(금상 50만원 등)",
  "skillKeywords": [
   "영상제작",
   "콘텐츠기획",
   "공모전",
   "포트폴리오",
   "현장실습"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=1&BBS_NO=667&CURRENT_MENU_CODE=MENU0052&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-08-07",
  "department": "산학협력처 현장실습지원센터"
 },
 {
  "programTitle": "서울 AI 이노베이션 챌린지 참가자 모집",
  "summary": "LINC사업단이 안내한 서울시 AI 분야 챌린지 대회 참가자 모집",
  "skillKeywords": [
   "AI",
   "경진대회",
   "챌린지",
   "데이터",
   "프로그래밍"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=1&BBS_NO=658&CURRENT_MENU_CODE=MENU0052&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-05-28",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "지·산·학 ICC연계 공유·협업 「창업캠프」",
  "summary": "기업협업센터(ICC) 연계 지자체·산업체·대학 공동 창업캠프 학생 참가자 모집",
  "skillKeywords": [
   "창업",
   "캠프",
   "협업",
   "아이디어",
   "네트워킹"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=1&BBS_NO=655&CURRENT_MENU_CODE=MENU0052&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-05-03",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "온라인 산학협력포럼 「생성형 AI를 활용한 협업 드론」",
  "summary": "학생·교직원·기업이 함께 듣는 비대면(Zoom) 산학협력 특강, 생성형 AI와 드론 협업 기술 주제(150명)",
  "skillKeywords": [
   "AI",
   "드론",
   "특강",
   "온라인학습",
   "산학협력"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Wo/WoUser0101V.do?WO_SEQ=17&CURRENT_MENU_CODE=MENU0048&TOP_MENU_CODE=MENU0005",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": null,
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "학생포트폴리오 경진대회 (한국공학교육인증원)",
  "summary": "공학계열 학생이 학습 포트폴리오를 출품·심사받는 전국 대회, 본교 컴퓨터공학과 참가·인증원장상 수상",
  "skillKeywords": [
   "포트폴리오",
   "경진대회",
   "공학교육",
   "자기PR"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=699&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2025-11-04",
  "department": "산학협력처"
 },
 {
  "programTitle": "IoT 스마트홈 구축 프로젝트 (대학 간 합숙형)",
  "summary": "3일간 합숙하며 10개 대학 22명이 IoT 기반 스마트홈을 구축, 본교 전자·컴퓨터·컴퓨터보안공학과 참가해 금상·동상 수상",
  "skillKeywords": [
   "IoT",
   "임베디드",
   "프로그래밍",
   "프로젝트",
   "경진대회",
   "실습"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=698&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2025-11-04",
  "department": "산학협력처"
 },
 {
  "programTitle": "AI 모빌리티 이노베이터 캠프",
  "summary": "아두이노 기반 자율주행 로봇을 제작하고 주행 알고리즘을 구현하는 캠프, 11개 대학 24명 참가(본교 전자공학과 대상·은상)",
  "skillKeywords": [
   "AI",
   "자율주행",
   "아두이노",
   "알고리즘",
   "로봇",
   "캠프"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=697&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2025-11-04",
  "department": "산학협력처"
 },
 {
  "programTitle": "창업캠프 및 창업아이디어 경진대회 (1박 2일, 대학 연합)",
  "summary": "11개 대학 44명 참가 1박 2일 창업캠프 겸 경진대회, 본교 정보통신공학과 팀이 AI 기반 캡스톤디자인 관리 시스템으로 대상 수상",
  "skillKeywords": [
   "창업",
   "AI",
   "시스템개발",
   "캠프",
   "경진대회",
   "협업"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=696&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2025-11-04",
  "department": "산학협력처"
 },
 {
  "programTitle": "학생 창업유망팀 300+ 예비트랙 참가 지원",
  "summary": "교육부 주관 전국 학생 창업경진대회 예비트랙에 사업단 지원으로 출전, 본교 2팀 최종 20팀 선발 및 산학연협력 EXPO 전시",
  "skillKeywords": [
   "창업",
   "사업아이템",
   "전시",
   "경진대회",
   "프로젝트"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=680&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-12-03",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "글로벌 링투유(Link to You) 전공연계 봉사활동 (몽골)",
  "summary": "13개 전문대학 61명이 몽골에서 자기 전공(네일아트·간호·헤어 등)을 살려 재능기부 봉사를 수행하는 해외 전공봉사",
  "skillKeywords": [
   "해외봉사",
   "전공연계",
   "재능기부",
   "글로벌",
   "협업"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=679&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-11-22",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "공유·협업 글로벌 역량강화 학생 봉사활동 (필리핀 바타안 파견)",
  "summary": "학생봉사단 9명이 필리핀 BPSU 보건의료정보센터 개소식 참여, 현지 학생 매칭 공중보건 캠페인, WHO·ADB·KOICA 방문",
  "skillKeywords": [
   "해외파견",
   "글로벌",
   "보건",
   "국제협력",
   "봉사",
   "어학"
  ],
  "sourceUrl": "https://sanhak.mjc.ac.kr/user/Bd/BdCm010D.do?BD_NO=4&BBS_NO=673&CURRENT_MENU_CODE=MENU0055&TOP_MENU_CODE=MENU0007",
  "sourceDomain": "sanhak.mjc.ac.kr",
  "postedAt": "2024-10-02",
  "department": "산학협력처(LINC 3.0 사업단)"
 },
 {
  "programTitle": "고숙련 전문기술 취·창업 마이크로디그리 과정",
  "summary": "재학생·지역인재 대상 비학위 마이크로디그리, 11개 콘텐츠 이수 시 이수증·디지털배지 발급, 정규 교육과정 진입 시 선행학습 학점 인정",
  "skillKeywords": [
   "마이크로디그리",
   "디지털배지",
   "뷰티",
   "패션",
   "디자인",
   "취업",
   "학점인정"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/tech/microdegree.html",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 전문기술인력양성팀"
 },
 {
  "programTitle": "BFD(뷰티·패션·디자인) 고숙련 전문기술 온라인 교육과정",
  "summary": "무료 비대면 E-CLASS 강좌, 분야별 4개 교과목 이상 이수 시 비학위 마이크로디그리 발급 및 입학 시 학점 부여·장학금",
  "skillKeywords": [
   "마이크로디그리",
   "온라인학습",
   "뷰티",
   "패션",
   "디자인",
   "학점인정",
   "장학금"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/ongoing_view.html?no=21&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 전문기술인력양성팀"
 },
 {
  "programTitle": "F.U.N. LIVING LAB (은평서포터즈)",
  "summary": "명지전문대·세종대 재학생과 은평구 주민이 6개월간 대조시장 브랜딩, 팝업·플리마켓 기획, UX 개발 가이드, 홍보 콘텐츠 제작, 청년 창업교육을 수행",
  "skillKeywords": [
   "리빙랩",
   "지역문제해결",
   "브랜딩",
   "UX",
   "콘텐츠제작",
   "기획",
   "창업",
   "협업"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/local/lab.html",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 (지역문제해결)"
 },
 {
  "programTitle": "학위과정 연계 마이크로디그리 11개 과정",
  "summary": "맞춤형 화장품 조제관리전문가, 헤어디자인마스터, AI응용패션디자이너, AI융합디지털콘텐츠제작전문가, 창의·융합형산업디자이너, 1인미디어크리에이터 등 학과 연계 12학점 규모 전문기술 과정",
  "skillKeywords": [
   "마이크로디그리",
   "AI",
   "디자인",
   "콘텐츠제작",
   "뷰티",
   "패션",
   "전문기술"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/tech/degree.html",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 전문기술인력양성팀"
 },
 {
  "programTitle": "[RISE] 소셜 크리에이터 양성과정",
  "summary": "만 20세 이상 20명이 4주간 SNS 콘텐츠 기획·제작 역량을 배우는 무료 오픈학습과정",
  "skillKeywords": [
   "콘텐츠제작",
   "SNS",
   "크리에이터",
   "미디어",
   "포트폴리오"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/ongoing_view.html?no=23&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "[RISE] AI기반 영상PD 스페셜리스트 마이크로디그리 과정",
  "summary": "만 25세 이상 20명 대상 총 180시간 집중 과정으로 AI를 활용한 영상 연출·제작 실무를 배우고 마이크로디그리 취득",
  "skillKeywords": [
   "AI",
   "영상제작",
   "연출",
   "마이크로디그리",
   "취업",
   "실무경험"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/ongoing_view.html?no=22&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "[RISE] 드론 운용 전문가 과정(1~4종)",
  "summary": "만 25세 이상 20명 대상 3시간×10회로 1~4종 드론 운용 실무를 익히는 자격 연계 직업교육",
  "skillKeywords": [
   "드론",
   "자격증",
   "실습",
   "직업교육",
   "취업"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/previous_view.html?no=18&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "[RISE] 방과후 웹툰강사 양성과정",
  "summary": "만 20세 이상 20명 대상 2시간×8회 과정으로 웹툰 제작과 방과후 강사 교수법을 익힘",
  "skillKeywords": [
   "웹툰",
   "일러스트",
   "강사양성",
   "교육",
   "콘텐츠제작"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/previous_view.html?no=15&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "[RISE] 사회서비스 전문가 양성과정 (취업 연계)",
  "summary": "사회복지사 2급 소지 만 25세 이상 30명 대상 180시간 무료 과정, 재직자 멘토 지원과 고용복지플러스센터 연계 취업 상담·사후관리",
  "skillKeywords": [
   "사회복지",
   "취업",
   "멘토링",
   "직무교육"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/previous_view.html?no=10&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "[RISE] 웃음인문학 (웃음 교육 지도사 1급 자격증 취득 과정)",
  "summary": "만 20세 이상 20명 대상 3시간×5회로 웃음·소통 코칭을 배우고 웃음교육지도사 1급 자격증 취득",
  "skillKeywords": [
   "자격증",
   "커뮤니케이션",
   "인문학",
   "코칭"
  ],
  "sourceUrl": "https://rise.mjc.ac.kr/program/previous_view.html?no=16&page=1",
  "sourceDomain": "rise.mjc.ac.kr",
  "postedAt": null,
  "department": "RISE사업단 평생교육·지역상생팀"
 },
 {
  "programTitle": "교환학생 파견 (OUTBOUND, 일어권/중국어권)",
  "summary": "협약 국외대학에 파견돼 수학하고 최대 20학점 인정, 파견교 등록금 면제. 1학기 이상 이수·평점 3.0 이상·어학기준(TOEIC 500/JLPT 3급/HSK 3급) 필요",
  "skillKeywords": [
   "교환학생",
   "해외파견",
   "학점인정",
   "일본어",
   "중국어",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/ibuilder.do?menu_idx=3396",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": null,
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "복수학위 과정",
  "summary": "복수학위 협약 국외 교육기관과 연계해 졸업요건 충족 시 본교 학위 수여, 현지 취득학점 40% 인정",
  "skillKeywords": [
   "복수학위",
   "국제교류",
   "학위과정",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/ibuilder.do?menu_idx=3394",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": null,
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "단·장기 해외연수 (하계/동계방학)",
  "summary": "자매대학·교육기관에 파견돼 어학·문화를 체험하는 방학 연수, 연수비 일체 지원·최대 2회. 직전학기 12학점 이수 재학생 대상, 하계 4~5월/동계 9~10월 공고",
  "skillKeywords": [
   "해외연수",
   "어학",
   "방학프로그램",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/ibuilder.do?menu_idx=3397",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": null,
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "글로벌 현장학습 (해외 인턴십, 18학점 인정)",
  "summary": "1학기 사전교육 후 2학기 해외 파견, 18학점 인정. 연수·교육·항공비 일체 지원, 2학기 이상 수료·누계평점 3.0 이상·어학자격 소지자 대상",
  "skillKeywords": [
   "해외인턴십",
   "현장실습",
   "학점인정",
   "글로벌",
   "실무경험"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/ibuilder.do?menu_idx=3397",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": null,
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "외국어 학습동아리",
  "summary": "외국어 저성취 학생 공동체를 지원해 학습 분위기를 조성하는 2학기 운영 비교과 프로그램",
  "skillKeywords": [
   "학습동아리",
   "어학",
   "동료학습",
   "협업"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/ibuilder.do?menu_idx=3397",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": null,
  "department": "글로벌교육센터"
 },
 {
  "programTitle": "ISIC 국제학생증 인증비 지원행사 (무료 발급)",
  "summary": "재학생·휴학생 대상 국제학생증 무료 발급(인증비 19,000원 은행 부담), 전세계 15만여 학생할인 혜택",
  "skillKeywords": [
   "국제학생증",
   "해외여행",
   "학생할인",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/bbs/data/view.do?menu_idx=3419&bbs_mst_idx=BM0000002969&data_idx=BD0000000003",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": "2026-05-07",
  "department": "유학생지원팀"
 },
 {
  "programTitle": "서울인재해외교환학생장학금",
  "summary": "서울미래인재재단이 2026-2학기 해외 교환·방문학생 파견자 60명에게 아시아 400만원/비아시아 550만원 지원, 평점 백분위 85점 이상",
  "skillKeywords": [
   "장학금",
   "교환학생",
   "해외파견",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/bbs/data/view.do?menu_idx=3416&bbs_mst_idx=BM0000002970&data_idx=BD0000000002",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": "2026-04-30",
  "department": "글로벌교육팀"
 },
 {
  "programTitle": "엔젤루트국제교류장학회 일본 어학연수 장학생 선발",
  "summary": "일본 어학연수 장학생을 선발하는 외부 장학·연수 프로그램",
  "skillKeywords": [
   "어학",
   "일본어",
   "장학금",
   "해외연수",
   "글로벌"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/bbs/data/list.do?menu_idx=3417",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": "2026-06-25",
  "department": "유학생지원팀"
 },
 {
  "programTitle": "TOPIK(한국어능력시험) 응시 안내 및 신청 지원",
  "summary": "외국인 유학생 대상 TOPIK 응시 안내 및 신청 절차 지원",
  "skillKeywords": [
   "TOPIK",
   "한국어",
   "자격증",
   "유학생"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/bbs/data/list.do?menu_idx=3417",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": "2026-04-22",
  "department": "유학생지원팀"
 },
 {
  "programTitle": "조기적응프로그램 (한국법령 이해교육)",
  "summary": "외국인 유학생의 국내 조기 적응을 돕는 한국 법령 이해 교육",
  "skillKeywords": [
   "조기적응",
   "한국법령",
   "유학생",
   "생활적응"
  ],
  "sourceUrl": "https://inter.mjc.ac.kr/bbs/data/list.do?menu_idx=3417",
  "sourceDomain": "inter.mjc.ac.kr",
  "postedAt": "2026-04-17",
  "department": "유학생지원팀"
 },
 {
  "programTitle": "[집단상담] 마음토닥 힐링아트 e-book / 색을 활용한 감정소통 예술치료",
  "summary": "예술 표현·색채를 매개로 감정을 다루는 집단상담형 심리치유 프로그램",
  "skillKeywords": [
   "집단상담",
   "예술치료",
   "심리정서",
   "자기이해"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "상담센터"
 },
 {
  "programTitle": "[집단상담] 너를 보고 나를 본다 — 에고그램 활용 의사소통 훈련",
  "summary": "에고그램 검사로 자신의 의사소통 패턴을 파악하고 훈련하는 집단상담",
  "skillKeywords": [
   "에고그램",
   "커뮤니케이션",
   "집단상담",
   "대인관계",
   "자기이해"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "상담센터"
 },
 {
  "programTitle": "[열린상담] MBTI / TCI 기질·성격 / CST 강점검사 및 해석상담",
  "summary": "MBTI·TCI·CST 검사를 실시하고 전문가 해석상담을 제공(3·4·5월 매월 운영)",
  "skillKeywords": [
   "MBTI",
   "성격검사",
   "강점검사",
   "진단검사",
   "1:1상담",
   "자기이해"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "상담센터"
 },
 {
  "programTitle": "직무·기업 타겟형 취업역량 강화 프로그램",
  "summary": "전문대학혁신지원사업으로 운영되는 직무·목표기업 타겟형 취업역량 강화 프로그램",
  "skillKeywords": [
   "직무분석",
   "기업분석",
   "취업준비",
   "진로설계"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "스마트케어 취업역량강화 (AI 자기소개서 / AI 모의면접 / 이력서 / 목표기업탐색 / 채용추천)",
  "summary": "학생역량이력관리시스템(Smart Care System) 내 AI 자기소개서 첨삭·AI 모의면접·이력서 작성·기업 탐색·채용 추천 서비스",
  "skillKeywords": [
   "AI",
   "자기소개서",
   "면접준비",
   "이력서",
   "취업준비",
   "기업분석"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "취ㆍ창업팀 / AI·IR센터"
 },
 {
  "programTitle": "스마트케어 진로역량설계 (진로적성검사 / 진로준비도검사 / 직업선호도검사 L형 / 목표직업탐색)",
  "summary": "진로 진단검사 3종과 목표 직업·직업가치 설정 도구를 제공하는 진로설계 트랙",
  "skillKeywords": [
   "진로적성검사",
   "진단검사",
   "직업탐색",
   "진로설계",
   "자기이해"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "AI융합진로지원센터"
 },
 {
  "programTitle": "핵심역량진단(MJC-ACT) / 핵심역량계획 / 스마트케어인증제",
  "summary": "핵심역량 진단 → 개발계획 수립 → 인증까지 이어지는 스마트케어 핵심역량개발 트랙",
  "skillKeywords": [
   "핵심역량",
   "진단검사",
   "역량개발계획",
   "인증제",
   "학습이력"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "AI·IR센터"
 },
 {
  "programTitle": "직무역량로드맵 / 경력로드맵",
  "summary": "희망 직무·경력 경로를 단계별로 설계하는 스마트케어 커리어 로드맵 도구",
  "skillKeywords": [
   "직무역량",
   "경력설계",
   "커리어로드맵",
   "진로설계"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "AI·IR센터"
 },
 {
  "programTitle": "상담예약 (교수님 상담 / 취업·진로 상담 / 심리상담 / 종합심리검사)",
  "summary": "스마트케어 상담예약 메뉴에서 기초조사지 작성 후 신청하는 4종 상담·검사 서비스",
  "skillKeywords": [
   "교수상담",
   "취업준비",
   "심리상담",
   "진단검사",
   "1:1상담"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "상담센터 / 취ㆍ창업팀"
 },
 {
  "programTitle": "취업캘린더 (겁나빠른 공채달력)",
  "summary": "실시간 채용·공채 일정을 한눈에 보는 취업캘린더 서비스",
  "skillKeywords": [
   "채용일정",
   "취업준비",
   "진로설계"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Community/Notice/RecruitCalendar.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "취ㆍ창업팀"
 },
 {
  "programTitle": "듣말쓰 챌린지 : 글쓰기 (기초/심화/확산)",
  "summary": "기초·심화·확산 3단계로 운영되는 글쓰기 역량 강화 챌린지",
  "skillKeywords": [
   "글쓰기",
   "문해력",
   "커뮤니케이션",
   "자기개발"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "교수학습팀"
 },
 {
  "programTitle": "듣말쓰 챌린지 : 듣기·말하기 (기초/심화/확산)",
  "summary": "듣기·말하기 중심 의사소통 역량 강화 챌린지 3단계 과정",
  "skillKeywords": [
   "발표력",
   "경청",
   "프레젠테이션",
   "커뮤니케이션"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "교수학습팀"
 },
 {
  "programTitle": "[특강] 스펙보다 강력한 멘탈 수업",
  "summary": "취업 준비생의 멘탈 관리를 다루는 단회성 특강",
  "skillKeywords": [
   "멘탈관리",
   "회복탄력성",
   "특강",
   "취업준비"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "상담센터"
 },
 {
  "programTitle": "Learning C.R.E.W 실시간 특강 — 시간관리·학습전략(AI활용)",
  "summary": "AI를 활용한 시간관리·학습전략을 다루는 실시간 학습법 특강",
  "skillKeywords": [
   "학습전략",
   "시간관리",
   "AI",
   "자기주도학습"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "교수학습팀"
 },
 {
  "programTitle": "Learning C.R.E.W 대면특강 — 슬기로운 팀플과 협업법",
  "summary": "팀 프로젝트 협업 스킬을 다루는 대면 특강",
  "skillKeywords": [
   "프로젝트",
   "협업",
   "커뮤니케이션"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "교수학습팀"
 },
 {
  "programTitle": "전자정보(E-learning) 활성화 우수 이용자 이벤트",
  "summary": "도서관 전자정보 이용을 장려하는 우수 이용자 이벤트(2026.03.01~05.31)",
  "skillKeywords": [
   "전자정보",
   "정보활용",
   "리서치"
  ],
  "sourceUrl": "https://mpu.mjc.ac.kr/Main/default.aspx",
  "sourceDomain": "mpu.mjc.ac.kr",
  "postedAt": null,
  "department": "학술정보팀"
 },
 {
  "programTitle": "교양교과연계 리빙랩 솔버스(Solve Us)",
  "summary": "교양교과와 연계해 학생 팀이 지역사회 문제 해결안을 제안·발표하고 평가받는 프로그램(매 학기 팀 발표평가)",
  "skillKeywords": [
   "리빙랩",
   "지역문제해결",
   "프로젝트",
   "문제해결",
   "발표력",
   "협업"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/community/notice_view.html?no=34&page=1",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": "2026-06-15",
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "리빙랩 솔버스 플랫폼 (주민참여형/사회혁신/R&D 리빙랩)",
  "summary": "대학 구성원과 지역주민이 함께 지역 현안을 실험적으로 해결하는 리빙랩 플랫폼, 교과·비교과로 참여",
  "skillKeywords": [
   "리빙랩",
   "사회혁신",
   "지역사회",
   "협업",
   "문제해결"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/business/solvers.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": null,
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "진로체험기관 교육기부 프로그램",
  "summary": "학과 특성을 살린 진로체험 프로그램을 개발해 중·고등학생에게 제공하는 교육기부 활동(교원+학생+조교 봉사자 참여)",
  "skillKeywords": [
   "교육기부",
   "진로체험",
   "봉사활동",
   "재능기부"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/business/experience.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": null,
  "department": "지역상생협력센터(MRCC) / 진로체험센터"
 },
 {
  "programTitle": "지역상생 봉사·문화행사 참여신청 (학내 구성원 대상)",
  "summary": "명지전문대 학생·교수·직원이 참여 가능한 지역상생 봉사·행사 참여신청 창구",
  "skillKeywords": [
   "봉사활동",
   "지역상생",
   "문화행사",
   "사회공헌"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/application/notice.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": "2023-01-27",
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "디지털 뉴딜 취창업지원 드론항공촬영 및 편집 고급과정 (무료)",
  "summary": "무료 드론 항공촬영·영상편집 고급 과정, 정원 20명",
  "skillKeywords": [
   "드론",
   "항공촬영",
   "영상편집",
   "취업",
   "창업"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/program/course_general.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": "2024-07-26",
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "AI 두피 진단기 활용 스캘프 케어 전문가 과정",
  "summary": "AI 두피 진단기를 활용하는 두피관리 전문가 양성 과정",
  "skillKeywords": [
   "AI",
   "뷰티",
   "두피관리",
   "전문가과정",
   "실무기술"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/volunteer/program_previous.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": null,
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "[무료] 시제품 제작 역량 개발 양성과정",
  "summary": "무료로 운영된 시제품 제작·프로토타이핑 역량 개발 과정",
  "skillKeywords": [
   "시제품제작",
   "프로토타이핑",
   "메이커",
   "제조기술"
  ],
  "sourceUrl": "https://mrcc.mjc.ac.kr/volunteer/program_previous.html",
  "sourceDomain": "mrcc.mjc.ac.kr",
  "postedAt": null,
  "department": "지역상생협력센터(MRCC)"
 },
 {
  "programTitle": "AID 묶음강좌 — AI 콘텐츠 크리에이터 양성과정 (평생교육본부 상세)",
  "summary": "AI·디지털 온라인 묶음강좌 3종(LLM 사무업무 효율화 / AI 소셜 콘텐츠 제작 / AI 영상제작 마스터 클래스), 총 16주, 수료 시 총장 명의 디지털배지",
  "skillKeywords": [
   "AI",
   "LLM",
   "프롬프트",
   "콘텐츠제작",
   "영상제작",
   "디지털배지"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/aid/aid.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": null,
  "department": "평생교육본부 성인학습지원센터"
 },
 {
  "programTitle": "AID 30+ 집중캠프 — AI 콘텐츠 크리에이터 부트캠프",
  "summary": "블렌디드(온라인 4주+오프라인 2주) 캠프 3종: 스마트 워크 AI 자동화 캠프 / AI 소셜 콘텐츠 제작 부트캠프 / AI 영상 크리에이터 마스터 클래스, 디지털배지 수여",
  "skillKeywords": [
   "AI",
   "자동화",
   "부트캠프",
   "영상편집",
   "포트폴리오",
   "디지털배지"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/aid/aid_30.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": null,
  "department": "평생교육본부 성인학습지원센터"
 },
 {
  "programTitle": "서울마이칼리지 — 명지 AI 미디어아트 브릿지 (정규 4과정)",
  "summary": "AI 활용 K-일러스트레이터 / AI 캐릭터디자인·웹툰 스토리텔링 / AI 모션그래픽·숏폼 광고 / 실감형 미디어아트 디렉터, 각 25명·45시간. 4개 이수 시 마이크로디그리, 3개 이수 시 나노디그리",
  "skillKeywords": [
   "AI",
   "일러스트",
   "웹툰",
   "모션그래픽",
   "미디어아트",
   "마이크로디그리"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/academy/academy03_6.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": null,
  "department": "평생교육본부"
 },
 {
  "programTitle": "서대문구 9개 대학 연합 행복캠퍼스 — AI와 드론을 활용한 360 영상촬영·편집 완성",
  "summary": "AVATA360 드론과 AI를 활용한 영상편집 전문가 양성 과정, 40명·18시간(6회)",
  "skillKeywords": [
   "드론",
   "360영상",
   "영상편집",
   "AI",
   "실무경험"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/academy/academy03_5.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": "2026-05-15",
  "department": "평생교육본부"
 },
 {
  "programTitle": "학점은행제 학위과정 (사회복지·미용·문헌정보학·경영·실용음악)",
  "summary": "평생교육본부 운영 학점은행제 전문학사/학사 과정",
  "skillKeywords": [
   "학점은행제",
   "학위과정",
   "사회복지",
   "미용",
   "문헌정보학"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/degree/welfare.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": null,
  "department": "평생교육본부"
 },
 {
  "programTitle": "KBO 야구심판 양성과정",
  "summary": "야구심판 기술·이론·지도자 소양을 교육하는 비학위과정, 11월~1월 10주간 주 3회, 일반과정 150명",
  "skillKeywords": [
   "야구심판",
   "자격과정",
   "스포츠",
   "비학위과정"
  ],
  "sourceUrl": "https://edu.mjc.ac.kr/academy/academy01_1.html",
  "sourceDomain": "edu.mjc.ac.kr",
  "postedAt": null,
  "department": "평생교육본부"
 },
 {
  "programTitle": "연계 산업체 인턴십 프로그램 (커뮤니케이션디자인과)",
  "summary": "디지털미디어·영상디자인 분야 협력업체 자율 현장실습 연계, 포트폴리오 경진대회로 인턴을 선발해 동계 표준 현장실습 이수",
  "skillKeywords": [
   "인턴십",
   "현장실습",
   "포트폴리오",
   "디지털미디어",
   "영상디자인",
   "산학협력"
  ],
  "sourceUrl": "https://mjcd.mjc.ac.kr/ibuilder.do?menu_idx=647",
  "sourceDomain": "mjcd.mjc.ac.kr",
  "postedAt": null,
  "department": "커뮤니케이션디자인과"
 },
 {
  "programTitle": "전공성 심사제도 및 진로지도 (커뮤니케이션디자인과)",
  "summary": "2학년 1학기 이수 후 세부 전공분야별 심사와 진로교수 상담으로 진로 결정, 미결정자는 직업선호도검사 후 직업훈련 연계",
  "skillKeywords": [
   "전공심사",
   "진로설계",
   "직업선호도검사",
   "1:1상담"
  ],
  "sourceUrl": "https://mjcd.mjc.ac.kr/ibuilder.do?menu_idx=647",
  "sourceDomain": "mjcd.mjc.ac.kr",
  "postedAt": null,
  "department": "커뮤니케이션디자인과"
 },
 {
  "programTitle": "컴퓨터공학과 학생회 활동 (총무·기획·교육·홍보·체육·소통부)",
  "summary": "학과 자치조직으로 학술 활동 행사 지원, 체육행사, 동문 교류 등을 부서별로 운영",
  "skillKeywords": [
   "학생자치",
   "학술행사",
   "리더십",
   "네트워킹",
   "협업"
  ],
  "sourceUrl": "https://mjcs.mjc.ac.kr/ibuilder.do?menu_idx=806",
  "sourceDomain": "mjcs.mjc.ac.kr",
  "postedAt": null,
  "department": "컴퓨터공학과"
 }
];

/** 수집 시점 — 화면에 "언제 기준 데이터인지" 표시할 때 쓴다 */
export const FALLBACK_COLLECTED_AT = '2026-08-06';

/**
 * 키워드로 폴백 프로그램을 찾는다.
 * 실시간 검색이 실패했을 때 갭 역량과 가장 관련 있는 것을 골라준다.
 *
 * @param {string[]} gapNames  부족한 역량 이름들
 * @param {number}   limit
 */
/**
 * 어느 프로그램에나 들어 있어 변별력이 없는 낱말.
 *
 * ★ 이게 없으면 무관한 프로그램이 "검증된 데이터"로 추천된다.
 *   실제 사례: 치위생과 학생의 "치석제거 실습" 갭에
 *   "실습" 한 낱말이 걸려 「AI 코딩 배우기」가 추천됐다.
 *   화면에는 파란 "수집 데이터" 배지까지 붙어 신뢰도가 얹힌다.
 *   ★없는 것을 없다고 하는 것보다, 틀린 것을 자신 있게 말하는 게 훨씬 나쁘다.★
 */
const STOP_WORDS = new Set([
  '실습', '실무', '경험', '교육', '과정', '능력', '역량', '이해', '활용', '관리',
  '지원', '기초', '기본', '심화', '전문', '및', '등', '관련', '사용', '수행',
  '지식', '기술', '분야', '업무', '작성', '학습', '프로그램', '참여', '취득',
]);

/** 프로그램 하나를 검색 대상 문자열로 만든다 */
function haystackOf(p) {
  return [p.programTitle, p.summary, ...(p.skillKeywords || [])].join(' ').toLowerCase();
}

/**
 * ★제목·키워드만 따로 본다.★
 *
 * 요약(summary)까지 합쳐 놓고 보면 "그 프로그램이 무엇에 관한 것인가"와
 * "설명에 그 낱말이 한 번 스쳤는가"가 구별되지 않는다.
 * 실제로 「ai」로 34건이 걸렸는데 그중 9건은 제목에 AI가 없었다 —
 * 「잡카페(JOB CAFE)」·「도전! 학습톡톡」·「커리어 잡고 가자!」 같은 것들이
 * AI 목표를 넣은 학생에게 딸려 나오고 있었다.
 */
function subjectOf(p) {
  return [p.programTitle, ...(p.skillKeywords || [])].join(' ').toLowerCase();
}

/** 미리 계산해두는 검색 색인 (143건 × 1회) */
const HAYSTACKS = FALLBACK_PROGRAMS.map(haystackOf);
const SUBJECTS = FALLBACK_PROGRAMS.map(subjectOf);

/**
 * 낱말이 몇 건에 등장하는지 — ★희소성★ 판단에 쓴다.
 * "unity"는 몇 건에만 있어 변별력이 크고, "프로젝트"는 수십 건에 있어 거의 없다.
 */
function docFreq(word) {
  let n = 0;
  for (const h of HAYSTACKS) if (h.includes(word)) n++;
  return n;
}

/** 이 건수 이하로 등장하면 "그 낱말 하나만 맞아도 인정"할 만큼 변별력이 있다고 본다 */
const RARE_MAX = 12;

/**
 * 키워드로 폴백 프로그램을 찾는다.
 *
 * 규칙
 *   ① 변별력 없는 낱말(STOP_WORDS)은 검색어에서 뺀다
 *   ② 남은 낱말을 ★희소성으로 가중★한다
 *        희소한 낱말(12건 이하 등장) = 2점  — 하나만 맞아도 인정
 *        흔한 낱말                  = 1점  — 두 개 이상 맞아야 인정
 *   ③ 2점 미만이면 억지로 채우지 않고 뺀다
 *   ④ ★흔한 낱말 하나로만 걸린 경우에는 제목·키워드에 있어야 인정한다.★
 *
 * 이렇게 하면
 *   "Unity 엔진 활용 능력"  → unity(희소) 하나로 실감콘텐츠 과정이 잡히고
 *   "치석제거 실습"         → 치석제거(0건)·실습(불용어) → 0건으로 정직하게 비운다
 *
 * ─────────────────────────────────────────────────────────
 * ④를 나중에 덧붙인 이유 — 「뭘 넣든 결과가 똑같다」
 *
 * ③의 문턱은 `min(2, 가능한최대점수)`라서, 살아남은 낱말이 흔한 것 하나뿐이면
 * 문턱이 1로 내려간다. 그러면 ★그 낱말이 어딘가 있기만 하면 전부 통과★하고,
 * 전부 같은 1점이라 순위도 갈리지 않는다. 앞에서 8개를 자르면
 * 언제나 같은 8개다.
 *
 * 실측: 「AI 활용 능력」과 「AI 모델 이해」의 결과가 ★8건 전부 동일★했다.
 *       둘 다 남는 낱말이 "ai" 하나뿐이고(활용·능력·이해는 불용어, 모델은 0건),
 *       "ai"는 143건 중 34건에 있어서 그 34건의 앞쪽 8개가 그대로 나온 것이다.
 *
 * 이 문턱 완화 자체는 필요하다 — 「포트폴리오」처럼 낱말 하나가 곧 질의 전체인
 * 경우까지 막아버리면 안 된다. 그래서 없애는 대신 ★어디에 맞았는지★를 본다.
 * 제목이나 키워드에 있으면 그 프로그램은 실제로 그것에 관한 것이고,
 * 요약에만 스쳤으면 아니다. 34건 중 9건이 후자였다.
 *
 * ★이걸로도 안 풀리는 부분이 남는다 — 숨기지 않고 적어둔다.★
 * 고친 뒤에도 「AI 활용 능력」과 「AI 모델 이해」는 여전히 결과가 같다.
 * 둘 다 쓸 수 있는 낱말이 "ai" 하나로 줄어드는데, 수집 자료에 AI 제목이
 * 25건 있을 뿐 그 안을 더 가를 정보가 없기 때문이다("모델"은 0건).
 * 이건 점수 계산이 아니라 ★자료 범위★의 문제라서 여기서는 못 고친다.
 * 교외 활동 검색(searchExternalActivities)을 옵션으로 둔 이유가 이것이다 —
 * 교내에 없는 것은 교내 자료를 아무리 잘 뒤져도 나오지 않는다.
 *
 * @param {string[]} gapNames  부족한 역량 이름들
 * @param {number}   limit
 */
/**
 * ★정규 학사과정·학사제도·학과 조직인가.★ (= 신청해서 참여하는 비교과 프로그램이 아니다)
 *
 * 이 도구가 약속한 것은 "갭을 메울 교내 ★프로그램★"이다.
 * 「융복합 모듈전공 트랙」·「복수학위 과정」·「학점은행제」는 프로그램이 아니라
 * ★학과·학부 소개에 가깝다.★ "이 전공을 이수하세요"는 완전히 다른 무게의 제안이다.
 *
 * 수집 143건 중 29건(20%)이 여기 해당하고, 그중 10건이
 * 「융복합 모듈전공 트랙 「…」」 하나짜리 카탈로그다.
 *
 * findFallback 은 낱말이 겹치는지로 고르는 단순 매칭이라, 이런 항목이 많으면
 * 낱말 하나만 스쳐도 상위권을 차지한다.
 * 실측: "머신러닝·딥러닝 이론 및 평가 지표" 갭에
 *   1위 「마이크로코딩」 마이크로전공과정 / 2위 「사회조사분석」
 * 이 올라왔다. ★"분석"이라는 낱말 하나 때문이다.★
 * 화면에서도 5장 중 2장이 이것이었다.
 *
 * ★실시간 검색으로 올라오는 것은 막지 않는다★ — 그건 모델이 관련성을 판단한 결과다.
 * 낱말이 겹친다는 이유만으로 권하지 않겠다는 것이지, 진짜 맞으면 나와도 된다.
 *
 * 반대로 「○○ 양성과정」·「전문가 과정」처럼 ★신청해서 듣는 것★은 남긴다.
 * 규칙을 넓힐 때마다 진짜가 죽지 않는지 6개 목표로 재측정한다(scripts/test.mjs).
 */
export const CURRICULUM_RE =
  /모듈전공|마이크로디그리|마이크로전공|융복합전공|통합전공|연계전공|복수전공|복수학위|학위과정|전공기초과정|전공 브릿지|학점은행제|교육과정|학점인정|학점제|장학제도|심사제도|학생회/;

/** 정규 학사과정·제도·조직인가 (비교과 프로그램이 아닌가) */
export function isCurriculum(p) {
  // ★공백을 지우고 본다.★ 「융복합전공」은 잡는데 「융복합 전공」은 놓치면
  //   같은 것을 띄어쓰기만 다르게 쓴 항목이 새어 나간다.
  //   교내 프로그램 판별에서도 같은 이유로 공백을 지우고 비교한다(isStudentProgram).
  return CURRICULUM_RE.test(String(p?.programTitle || '').replace(/\s+/g, ''));
}

export function findFallback(gapNames = [], limit = 8) {
  const needles = [...new Set(
    gapNames
      .join(' ')
      .toLowerCase()
      .split(/[\s,·/()]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w)),
  )];

  if (!needles.length) return [];

  const weighted = needles
    .map((n) => ({ n, df: docFreq(n) }))
    .filter((x) => x.df > 0)                       // 아무 데도 없는 낱말은 무시
    .map((x) => ({ ...x, w: x.df <= RARE_MAX ? 2 : 1 }));

  // 쓸 만한 낱말이 하나도 없으면 = 이 갭을 메울 데이터가 우리에게 없다는 뜻
  if (!weighted.length) return [];

  // 기준은 2점이지만, 애초에 2점이 나올 수 없는 질의(흔한 낱말 하나뿐)라면
  // 그 낱말이 맞는 것만으로 인정한다. 예: "포트폴리오"(16건), "AI 활용 능력"→"ai"(34건)
  const maxPossible = weighted.reduce((s, x) => s + x.w, 0);
  const threshold = Math.min(2, maxPossible);

  const scored = FALLBACK_PROGRAMS.map((p, i) => {
    const hay = HAYSTACKS[i];
    const subject = SUBJECTS[i];
    let score = 0;
    let subjectHits = 0;   // 제목·키워드에 맞은 낱말 수
    let hitCount = 0;      // 어디든 맞은 낱말 수
    for (const { n, w } of weighted) {
      if (!hay.includes(n)) continue;
      score += w;
      hitCount += 1;
      if (subject.includes(n)) subjectHits += 1;
    }
    return { p, score, subjectHits, hitCount };
  });

  return scored
    .filter((s) => s.score >= threshold)
    // ★규칙 ④ — 낱말 하나로만 걸렸으면 그게 제목·키워드에 있어야 한다.★
    //   두 개 이상 맞았다면 요약에만 있어도 우연이라고 보기 어려우니 통과시킨다.
    .filter((s) => s.hitCount >= 2 || s.subjectHits >= 1)
    // ★정규 교육과정은 여기서 빼낸다.★ 위 CURRICULUM_RE 주석 참조 —
    //   낱말이 겹친다는 이유만으로 "이 전공 트랙을 이수하세요"를 권할 수는 없다.
    .filter((s) => !CURRICULUM_RE.test(s.p.programTitle))
    // 점수가 같으면 ★제목·키워드에 맞은 것을 앞으로.★
    //   이게 없으면 동점일 때 수집 순서가 곧 순위가 된다.
    .sort((a, b) => b.score - a.score || b.subjectHits - a.subjectHits)
    .slice(0, limit)
    .map((s) => s.p);
}

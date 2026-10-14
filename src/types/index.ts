export type SiteReference = {
  sourceType: string;
  publishedAt: string;
  title: string;
  url: string;
};

export type Site = {
  id: string;
  /** B열 응모연도(회차) 원문, 예: "2000 (1회)" */
  roundLabel: string;
  /** 회차 숫자, 예: 1 (파싱 실패 시 0) */
  round: number;
  year: string;
  /** C열 응모당시 사이트 명 */
  name: string;
  /** D열 기록자 */
  recorder: string;
  /** E열 유산 구분 (자연유산 / 문화유산 / …) */
  heritageType: string;
  /** F열을 지도 영역 id로 정규화한 값 */
  region: string;
  /** 표시용 주소 (현재 주소가 변경된 경우 AD~AF 우선) */
  address: string;
  /** 응모 당시 주소 (F~H) — 현재 주소와 다를 때만 값이 있음 */
  originalAddress: string;
  /** AC열 현재명 (응모 당시 이름과 다를 때만) */
  currentName: string;
  lat: number | null;
  lng: number | null;
  /** L열 대분류 (자연·생태 / 역사·문화 / 사회·지역) */
  valueCategories: string[];
  /** M / N / O열 세부 가치 */
  natureValues: string[];
  historyValues: string[];
  socialValues: string[];
  /** P열 희소성·대표성 */
  rarity: string;
  /** Q열 핵심 키워드 */
  keywords: string;

  // 응모 당시 위협 (S~W)
  threatStage: string;
  threatCause: string;
  threatTarget: string;
  threatActor: string;
  // 응모 당시 대응 (X~AA)
  pastResponse: string;
  pastResponseActorType: string;
  pastResponseActor: string;
  pastResponseType: string;

  // 현재 상태
  /** AG열 현재보전상태 */
  status: string;
  /** AH열 복원·정비 여부 */
  restoration: string;
  /** AI열 응모당시 대비 위협 변화 */
  threatChange: string;
  /** AJ열 현재 활용상태 */
  currentUse: string;
  /** AL~AN열 관리 상태 */
  managed: string;
  managerType: string;
  managerName: string;
  /** AO~AQ열 법적 보호 */
  legalProtection: string;
  protectionName: string;
  protectionYear: string;
  /** AR~AU열 현재 대응 */
  currentResponse: string;
  currentResponseActorType: string;
  currentResponseActor: string;
  currentResponseType: string;

  /** BB열 주요연혁 */
  history: string;
  /** BN열 기록자 한마디 */
  recorderNote: string;
  references: SiteReference[];
  /** BO열 사진 */
  photoUrl: string;
};

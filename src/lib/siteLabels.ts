import { KOREA_REGIONS } from '@/lib/koreaRegions';

export type StatusStyle = {
  /** 진한 기준 색 (배지 배경, 강조 텍스트) */
  color: string;
  /** 옅은 배경 */
  soft: string;
};

/** AG열 현재보전상태 표시 순서 */
export const STATUS_ORDER = ['보전', '일부 보전', '복원', '훼손', '확인불가'] as const;

const STATUS_STYLES: Record<string, StatusStyle> = {
  '보전': { color: '#1F7A4D', soft: '#E3F2EA' },
  '일부 보전': { color: '#A86B00', soft: '#FBF0DC' },
  '복원': { color: '#2563A8', soft: '#E1ECF8' },
  '훼손': { color: '#C2362F', soft: '#FBE4E2' },
  '확인불가': { color: '#6B6B73', soft: '#EEEEF0' },
};

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES['확인불가'];
}

/** L열 대분류와 세부 가치(M/N/O) 연결 */
export const VALUE_CATEGORIES = [
  { id: '자연·생태', label: '자연·생태', field: 'natureValues' },
  { id: '역사·문화', label: '역사·문화', field: 'historyValues' },
  { id: '사회·지역', label: '사회·지역', field: 'socialValues' },
] as const;

export type ValueField = (typeof VALUE_CATEGORIES)[number]['field'];

/** E열 유산 구분 표시 순서 (그 외 값은 뒤에 이어 붙음) */
export const HERITAGE_ORDER = ['자연유산', '문화유산'];

export function sortHeritageTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ia = HERITAGE_ORDER.indexOf(a);
    const ib = HERITAGE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'ko');
  });
}

/** "2000 (1회)" → "제1회 선정" */
export function formatRound(round: number, fallback = ''): string {
  return round > 0 ? `제${round}회 선정` : fallback;
}

/** 시트·경계 데이터의 시/도 표기 → 지도(KOREA_REGIONS) id */
const REGION_ALIASES: Record<string, string> = {
  '강원도': '강원특별자치도',
  '전라북도': '전북특별자치도',
  '광주광역시': '전남광주통합특별시',
  '전라남도': '전남광주통합특별시',
  '전남특별자치도': '전남광주통합특별시',
  '전남광주특별시': '전남광주통합특별시',
};

export function normalizeRegion(name: string): string {
  const trimmed = name.trim();
  return REGION_ALIASES[trimmed] ?? trimmed;
}

const REGION_SHORT = new Map(KOREA_REGIONS.map((region) => [region.id, region.shortName]));

export function getRegionShortName(region: string): string {
  return REGION_SHORT.get(region) ?? region;
}

/**
 * 구글 드라이브 사진을 원하는 폭의 JPEG로 받는 주소.
 * 원본이 PNG인 경우가 많아 JPEG(-rj)로 받으면 용량이 크게 줄어듦.
 */
export function getSizedPhotoUrl(url: string, width: number): string {
  if (/^https:\/\/lh3\.googleusercontent\.com\/d\/[^=/?]+$/.test(url)) {
    return `${url}=w${width}-rj`;
  }
  return url;
}

import { cache } from 'react';
import { normalizeRegion } from '@/lib/siteLabels';
import type { Site, SiteReference } from '@/types';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID ?? '1pwko9B9PvaOj-4sLFBGa9VU2mmY1x-46y1MnWUJsNdU';
// '총합 데이터(기존 수상지)' 탭
const SHEET_GID = process.env.SHEET_GID ?? '1845618267';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/** 시트 데이터 캐시 시간(초) */
const REVALIDATE_SECONDS = 300;

/** 화면에 표시하지 않는 입력 안내용 값 */
const EMPTY_VALUES = new Set(['', '입력불필요', '해당없음', '해당 없음', '-', '동일', '변동없음']);

/** 스프레드시트 열 문자 → 0-based index */
function col(letters: string): number {
  return [...letters].reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** 셀 안의 다중 선택 값 분리: `"강, 하천, 습지", 희귀·멸종위기 생물 서식` → ['강, 하천, 습지', '희귀·멸종위기 생물 서식'] */
function splitMulti(value: string): string[] {
  const cleaned = value.trim();
  if (!cleaned) return [];

  return (parseCsv(cleaned)[0] ?? [])
    .map((item) => item.trim())
    .filter((item) => !EMPTY_VALUES.has(item));
}

function clean(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return EMPTY_VALUES.has(trimmed) ? '' : trimmed;
}

function joinUnique(...values: string[]): string {
  return [...new Set(values.map(clean).filter(Boolean))].join(' · ');
}

function normalizePhotoUrl(value: string): string {
  const url = value.trim();
  if (!url) return '';

  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (driveFileMatch) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  const driveIdMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && driveIdMatch) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  return url;
}

function parseRound(label: string): { round: number; year: string } {
  const round = Number(label.match(/(\d+)\s*회/)?.[1] ?? 0);
  const year = label.match(/(\d{4})/)?.[1] ?? '';
  return { round, year };
}

/** BP열 보전현안 표기 통일: '진행 중' → '진행중' */
function normalizeIssueStatus(value: string): string {
  return clean(value).replace(/\s+/g, '');
}

function toNumber(value: string): number | null {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function buildReference(row: string[], start: string): SiteReference | null {
  const i = col(start);
  const reference = {
    sourceType: clean(row[i]),
    publishedAt: clean(row[i + 1]),
    title: clean(row[i + 2]),
    url: clean(row[i + 3]),
  };

  return reference.title || reference.url ? reference : null;
}

function rowToSite(row: string[]): Site {
  const get = (letters: string) => (row[col(letters)] ?? '').trim();
  const { round, year } = parseRound(get('B'));

  const originalAddress = [get('F'), get('G'), get('H')].map(clean).filter(Boolean).join(' ');
  // AD~AF: 주소가 변경된 경우에만 값이 있음 ('변동없음' / '입력불필요'는 무시)
  const currentAddress = [get('AD'), get('AE'), get('AF')].map(clean).filter(Boolean).join(' ');
  const currentName = clean(get('AC'));

  return {
    id: get('A') || '',
    roundLabel: get('B'),
    round,
    roundKey: round > 0 ? String(round) : get('B'),
    year,
    name: get('C'),
    recorder: clean(get('D')),
    heritageType: get('E') || '기타',
    region: normalizeRegion(get('F')),
    address: currentAddress || originalAddress,
    originalAddress: currentAddress && currentAddress !== originalAddress ? originalAddress : '',
    currentName: currentName && currentName !== get('C') ? currentName : '',
    lat: toNumber(get('I')),
    lng: toNumber(get('J')),
    valueCategories: splitMulti(get('L')).filter((v) => v !== '기타'),
    natureValues: splitMulti(get('M')),
    historyValues: splitMulti(get('N')),
    socialValues: splitMulti(get('O')),
    rarity: clean(get('P')),
    keywords: clean(get('Q')),

    threatStage: clean(get('S')),
    threatCause: clean(get('T')),
    threatTarget: clean(get('U')),
    threatActor: joinUnique(get('V'), get('W')),
    pastResponse: clean(get('X')),
    pastResponseActorType: clean(get('Y')),
    pastResponseActor: clean(get('Z')),
    pastResponseType: clean(get('AA')),

    status: clean(get('AG')) || '확인불가',
    restoration: clean(get('AH')),
    threatChange: clean(get('AI')),
    currentUse: clean(get('AJ')),
    managed: clean(get('AL')),
    managerType: clean(get('AM')),
    managerName: clean(get('AN')),
    legalProtection: clean(get('AO')),
    protectionName: clean(get('AP')),
    protectionYear: clean(get('AQ')),
    currentResponse: clean(get('AR')),
    currentResponseActorType: clean(get('AS')),
    currentResponseActor: clean(get('AT')),
    currentResponseType: clean(get('AU')),

    history: clean(get('BB')),
    recorderNote: clean(get('BN')),
    references: [buildReference(row, 'BF'), buildReference(row, 'BJ')].filter(
      (ref): ref is SiteReference => ref !== null,
    ),
    photoUrl: normalizePhotoUrl(get('BO')),
    issueStatus: normalizeIssueStatus(get('BP')),
  };
}

export const getSites = cache(async function getSites(): Promise<Site[]> {
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];

    const rows = parseCsv(await res.text());
    // 상단의 안내/그룹 헤더 행을 건너뛰고 '번호' 헤더 다음 행부터 데이터로 사용
    const headerIndex = rows.findIndex((row) => row[0]?.trim() === '번호');
    const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;

    const seen = new Map<string, number>();

    return dataRows
      .filter((row) => (row[col('C')] ?? '').trim())
      .map(rowToSite)
      .map((site, index) => {
        // 번호가 비었거나 중복이면 고유 id 보정
        const base = site.id || `row-${index + 1}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return { ...site, id: count ? `${base}-${count + 1}` : base };
      })
      // 회차가 없는 행(신규 훼손지 등)은 가장 최근 회차 뒤에 표시
      .sort(
        (a, b) =>
          (a.round || Infinity) - (b.round || Infinity) ||
          a.id.localeCompare(b.id, 'ko', { numeric: true }),
      );
  } catch {
    return [];
  }
});

export const getSiteById = cache(async function getSiteById(id: string) {
  const sites = await getSites();
  return sites.find((site) => site.id === id) ?? null;
});

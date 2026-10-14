'use client';

import { useEffect, useMemo, useState } from 'react';
import KoreaMap from './KoreaMap';
import NaverMap from './NaverMap';
import ShareButton from './ShareButton';
import SiteCard from './SiteCard';
import SiteDetail from './SiteDetail';
import {
  getStatusStyle,
  sortHeritageTypes,
  STATUS_ORDER,
  VALUE_CATEGORIES,
} from '@/lib/siteLabels';
import type { Site } from '@/types';

type Filters = {
  query: string;
  status: string | null;
  value: string | null;
  subValue: string | null;
  round: number | null;
};

type Props = {
  sites: Site[];
  initialRegion?: string | null;
  initialSiteId?: string | null;
};

const EMPTY_FILTERS: Filters = { query: '', status: null, value: null, subValue: null, round: null };

/** 네이버 클라우드 플랫폼 Maps Client ID. 없으면 기본 SVG 지도를 사용 */
const NAVER_MAP_KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID ?? '';

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.3;

function countBy<T>(items: T[], getKeys: (item: T) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const key of getKeys(item)) {
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function getValueField(value: string) {
  return VALUE_CATEGORIES.find((category) => category.id === value)?.field ?? null;
}

function matchesQuery(site: Site, query: string): boolean {
  const q = query.trim().replace(/\s+/g, '');
  if (!q) return true;
  return [site.name, site.currentName, site.address, site.keywords]
    .some((text) => text.replace(/\s+/g, '').includes(q));
}

function matchesFilters(site: Site, filters: Filters): boolean {
  if (!matchesQuery(site, filters.query)) return false;
  if (filters.status && site.status !== filters.status) return false;
  if (filters.round && site.round !== filters.round) return false;
  if (filters.value) {
    if (!site.valueCategories.includes(filters.value)) return false;
    const field = getValueField(filters.value);
    if (filters.subValue && field && !site[field].includes(filters.subValue)) return false;
  }
  return true;
}

export default function MapPage({ sites, initialRegion = null, initialSiteId = null }: Props) {
  const initialSite = initialSiteId ? sites.find((site) => site.id === initialSiteId) ?? null : null;
  const [selectedRegion, setSelectedRegion] = useState<string | null>(initialSite?.region || initialRegion);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [zoom, setZoom] = useState(1);
  const [modalSite, setModalSite] = useState<Site | null>(initialSite);

  // 검색 등으로 URL이 바뀌면 prop이 변경되므로 렌더 중에 state를 동기화
  const propsKey = `${initialSiteId ?? ''}|${initialRegion ?? ''}`;
  const [syncedPropsKey, setSyncedPropsKey] = useState(propsKey);
  if (propsKey !== syncedPropsKey) {
    setSyncedPropsKey(propsKey);
    const found = initialSiteId ? sites.find((site) => site.id === initialSiteId) ?? null : null;
    if (found) {
      setSelectedRegion(found.region || null);
      setModalSite(found);
    } else if (initialRegion) {
      setSelectedRegion(initialRegion);
      setModalSite(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (selectedRegion) {
      params.set('region', selectedRegion);
    } else {
      params.delete('region');
    }

    if (modalSite) {
      params.set('site', modalSite.id);
    } else {
      params.delete('site');
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [modalSite, selectedRegion]);

  // 지역을 제외한 필터가 적용된 목록 (지도 숫자·핀에 사용)
  const mapSource = useMemo(
    () => sites.filter((site) => matchesFilters(site, filters)),
    [sites, filters],
  );

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const site of mapSource) {
      if (site.region) counts[site.region] = (counts[site.region] ?? 0) + 1;
    }
    return counts;
  }, [mapSource]);

  const visibleSites = useMemo(
    () => (selectedRegion ? mapSource.filter((site) => site.region === selectedRegion) : mapSource),
    [mapSource, selectedRegion],
  );

  return (
    <>
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* 지도 패널 */}
        {NAVER_MAP_KEY_ID ? (
          <div className="relative h-[60vh] shrink-0 lg:sticky lg:top-0 lg:h-screen lg:w-[38%] lg:self-start">
            <NaverMap
              keyId={NAVER_MAP_KEY_ID}
              selectedRegion={selectedRegion}
              regionCounts={regionCounts}
              onRegionSelect={setSelectedRegion}
              sites={visibleSites}
              onSiteSelect={setModalSite}
            />
          </div>
        ) : (
          <div
            className="shrink-0 p-4 lg:sticky lg:top-0 lg:min-h-screen lg:w-[38%] lg:self-start"
            style={{ backgroundColor: '#DCEBE4' }}
          >
            <div className="relative mx-auto flex w-full max-w-[42rem] flex-col items-center">
              <KoreaMap
                selectedRegion={selectedRegion}
                regionCounts={regionCounts}
                onRegionSelect={setSelectedRegion}
                zoom={zoom}
              />

              <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
                <button
                  onClick={() => setZoom((value) => Math.min(+(value + ZOOM_STEP).toFixed(2), MAX_ZOOM))}
                  disabled={zoom >= MAX_ZOOM}
                  className="flex h-9 w-9 items-center justify-center border border-zinc-200 bg-white text-lg font-bold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-30"
                  aria-label="지도 확대"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom((value) => Math.max(+(value - ZOOM_STEP).toFixed(2), MIN_ZOOM))}
                  disabled={zoom <= MIN_ZOOM}
                  className="flex h-9 w-9 items-center justify-center border border-zinc-200 bg-white text-lg font-bold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-30"
                  aria-label="지도 축소"
                >
                  −
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-xs text-zinc-500">
              지도에서 지역을 클릭하면 해당 지역의 대상지를 볼 수 있습니다
            </p>
          </div>
        )}

        {/* 목록 패널 */}
        <div className="flex flex-col border-t border-zinc-200 bg-[#E6F1EB] lg:w-[62%] lg:border-l lg:border-t-0">
          <div className="flex-1">
            <SiteListPanel
              allSites={sites}
              sites={visibleSites}
              filters={filters}
              onFiltersChange={setFilters}
              region={selectedRegion}
              onRegionReset={() => setSelectedRegion(null)}
              onSelect={setModalSite}
            />
          </div>
        </div>
      </div>

      {modalSite && <SiteModal site={modalSite} onClose={() => setModalSite(null)} />}
    </>
  );
}

function SiteListPanel({
  allSites,
  sites,
  filters,
  onFiltersChange,
  region,
  onRegionReset,
  onSelect,
}: {
  allSites: Site[];
  sites: Site[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  region: string | null;
  onRegionReset: () => void;
  onSelect: (site: Site) => void;
}) {
  const statusCounts = useMemo(() => countBy(allSites, (site) => [site.status]), [allSites]);
  const valueCounts = useMemo(() => countBy(allSites, (site) => site.valueCategories), [allSites]);
  const roundOptions = useMemo(() => {
    const map = new Map<number, { year: string; count: number }>();
    for (const site of allSites) {
      if (!site.round) continue;
      const entry = map.get(site.round) ?? { year: site.year, count: 0 };
      entry.count++;
      map.set(site.round, entry);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [allSites]);

  const subField = filters.value ? getValueField(filters.value) : null;
  const subValueOptions = useMemo(() => {
    if (!filters.value || !subField) return [];
    const counts = countBy(
      allSites.filter((site) => site.valueCategories.includes(filters.value!)),
      (site) => site[subField],
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allSites, filters.value, subField]);

  const grouped = useMemo(() => {
    const map = new Map<string, Site[]>();
    for (const site of sites) {
      const list = map.get(site.heritageType) ?? [];
      list.push(site);
      map.set(site.heritageType, list);
    }
    return sortHeritageTypes([...map.keys()]).map((type) => [type, map.get(type)!] as const);
  }, [sites]);

  const statusOptions = STATUS_ORDER.filter((status) => statusCounts.has(status));
  const hasFilter = Boolean(
    filters.query.trim() || filters.status || filters.value || filters.round || region,
  );

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-8 mt-[10px] sm:mt-0">
        <div className="flex items-center gap-2">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900">{region ?? '전체 대상지'}</h2>
          {region && <ResetButton onClick={onRegionReset} label="전체 대상지 보기" />}
        </div>
        <p className="mt-1 text-base text-zinc-500">대상지 {sites.length}곳</p>
      </div>

      <div className="mb-8 space-y-5">
        <FilterRow label="검색">
          <div className="relative w-full max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
              placeholder="대상지 이름, 주소, 키워드"
              autoComplete="off"
              className="h-9 w-full border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
              aria-label="대상지 검색"
            />
          </div>
        </FilterRow>

        <FilterRow label="현재 상태">
          <Chip active={!filters.status} onClick={() => onFiltersChange({ ...filters, status: null })}>
            전체
          </Chip>
          {statusOptions.map((status) => {
            const style = getStatusStyle(status);
            const active = filters.status === status;
            return (
              <Chip
                key={status}
                active={active}
                activeColor={style.color}
                onClick={() => onFiltersChange({ ...filters, status: active ? null : status })}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? '#fff' : style.color }}
                />
                {status}
                <span className="opacity-60">{statusCounts.get(status)}</span>
              </Chip>
            );
          })}
        </FilterRow>

        <FilterRow label="가치">
          <Chip
            active={!filters.value}
            onClick={() => onFiltersChange({ ...filters, value: null, subValue: null })}
          >
            전체
          </Chip>
          {VALUE_CATEGORIES.map((category) => {
            const active = filters.value === category.id;
            return (
              <Chip
                key={category.id}
                active={active}
                onClick={() =>
                  onFiltersChange({ ...filters, value: active ? null : category.id, subValue: null })
                }
              >
                {category.label}
                <span className="opacity-60">{valueCounts.get(category.id) ?? 0}</span>
              </Chip>
            );
          })}
        </FilterRow>

        {/* 가치 세부 필터: 대분류를 고른 경우에만 노출 */}
        {filters.value && subValueOptions.length > 0 && (
          <div className="-mt-2 flex flex-wrap gap-1.5 border-l-2 border-zinc-200 pl-3 sm:ml-[5.5rem]">
            {subValueOptions.map(([subValue, count]) => {
              const active = filters.subValue === subValue;
              return (
                <button
                  key={subValue}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, subValue: active ? null : subValue })}
                  className={`border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-zinc-800 bg-zinc-800 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {subValue} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <FilterRow label="선정 회차">
          <select
            value={filters.round ?? ''}
            onChange={(event) =>
              onFiltersChange({ ...filters, round: event.target.value ? Number(event.target.value) : null })
            }
            className="h-9 min-w-[12rem] border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 focus:border-zinc-400 focus:outline-none"
            aria-label="선정 회차"
          >
            <option value="">전체 회차</option>
            {roundOptions.map(([round, { year, count }]) => (
              <option key={round} value={round}>
                제{round}회{year ? ` (${year})` : ''} · {count}곳
              </option>
            ))}
          </select>
        </FilterRow>

        {hasFilter && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onFiltersChange(EMPTY_FILTERS);
                onRegionReset();
              }}
              className="text-sm font-semibold text-zinc-400 underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {sites.length === 0 && <EmptyState message="조건에 맞는 대상지가 없습니다." />}

      {grouped.map(([type, list]) => (
        <section key={type} className="mb-10">
          <div className="mb-4 flex items-baseline gap-3">
            <h3 className="text-2xl font-black tracking-tight text-zinc-900">{type}</h3>
            <span className="text-base font-semibold text-zinc-400">{list.length}곳</span>
          </div>
          <SiteGrid sites={list} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="w-[4.5rem] shrink-0 text-sm font-bold text-zinc-500">{label}</p>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  activeColor = '#18181B',
  onClick,
  children,
}: {
  active: boolean;
  activeColor?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 border px-3 py-1 text-sm font-semibold transition-colors"
      style={
        active
          ? { backgroundColor: activeColor, borderColor: activeColor, color: '#fff' }
          : { backgroundColor: '#fff', borderColor: '#e4e4e7', color: '#52525b' }
      }
    >
      {children}
    </button>
  );
}

function SiteGrid({ sites, onSelect }: { sites: Site[]; onSelect: (site: Site) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} onClick={() => onSelect(site)} />
      ))}
    </div>
  );
}

function ResetButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center border border-zinc-200 p-1.5 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-700"
      aria-label={label}
      title={label}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center border border-dashed border-zinc-200 p-8 text-center">
      <p className="text-base text-zinc-400">{message}</p>
    </div>
  );
}

function SiteModal({ site, onClose }: { site: Site; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const shareParams = new URLSearchParams({ site: site.id });
  if (site.region) shareParams.set('region', site.region);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="modal-card relative max-h-[92vh] w-full max-w-5xl overflow-hidden border border-zinc-200 bg-white"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${site.name} 상세 정보`}
      >
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <ShareButton title={site.name} sharePath={`/?${shareParams.toString()}`} />
          <button
            onClick={onClose}
            className="cursor-pointer border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
            aria-label="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[92vh] overflow-y-auto">
          <SiteDetail site={site} />
        </div>
      </div>
    </div>
  );
}

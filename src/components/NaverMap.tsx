'use client';

import { useEffect, useRef, useState } from 'react';
import { getStatusStyle, normalizeRegion, STATUS_ORDER } from '@/lib/siteLabels';
import type { Site } from '@/types';

type Props = {
  keyId: string;
  selectedRegion: string | null;
  regionCounts: Record<string, number>;
  onRegionSelect: (id: string | null) => void;
  /** 지도에 핀으로 표시할 대상지 */
  sites: Site[];
  onSiteSelect: (site: Site) => void;
};

type BoundsLiteral = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

/** 남한 본토와 제주가 보이는 기본 범위 */
const KOREA_BOUNDS: BoundsLiteral = [125.0, 33.1, 129.6, 38.6];

/** 핀 스타일 (지도 라이브러리가 만드는 DOM에 적용되므로 컴포넌트에서 직접 주입) */
const PIN_CSS = `
.site-pin { position: relative; width: 16px; height: 16px; cursor: pointer; }
.site-pin-dot {
  display: block; width: 16px; height: 16px; border-radius: 9999px; box-sizing: border-box;
  border: 2.5px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  transition: transform 0.12s ease-out;
}
.site-pin:hover .site-pin-dot { transform: scale(1.3); }
.site-pin-label {
  display: none; position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%);
  white-space: nowrap; padding: 3px 8px; border-radius: 6px;
  background: #18181B; color: #fff; font-size: 12px; font-weight: 700; line-height: 1.4;
  pointer-events: none;
}
.site-pin:hover .site-pin-label { display: block; }
`;

let scriptPromise: Promise<void> | null = null;

function loadNaverMaps(keyId: string): Promise<void> {
  if (typeof naver !== 'undefined' && naver.maps) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(keyId)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** GeoJSON 좌표를 훑어 시/도별 경계 범위 계산 */
function computeRegionBounds(geojson: GeoJSON.FeatureCollection): Record<string, BoundsLiteral> {
  const result: Record<string, BoundsLiteral> = {};

  const visit = (coords: unknown, bounds: BoundsLiteral) => {
    if (typeof (coords as number[])[0] === 'number') {
      const [lng, lat] = coords as number[];
      bounds[0] = Math.min(bounds[0], lng);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lng);
      bounds[3] = Math.max(bounds[3], lat);
      return;
    }
    for (const child of coords as unknown[]) visit(child, bounds);
  };

  for (const feature of geojson.features) {
    const region = normalizeRegion(String(feature.properties?.name ?? ''));
    const bounds = result[region] ?? [Infinity, Infinity, -Infinity, -Infinity];
    if (feature.geometry && 'coordinates' in feature.geometry) {
      visit(feature.geometry.coordinates, bounds);
    }
    result[region] = bounds;
  }

  return result;
}

function toNaverBounds([minLng, minLat, maxLng, maxLat]: BoundsLiteral) {
  return new naver.maps.LatLngBounds(
    new naver.maps.LatLng(minLat, minLng),
    new naver.maps.LatLng(maxLat, maxLng),
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function getRegionFill(count: number, maxCount: number): string {
  if (count === 0) return '#9CA3AF';
  const t = count / maxCount;
  return `hsl(148 ${30 + t * 15}% ${55 - t * 20}%)`;
}

export default function NaverMap({
  keyId,
  selectedRegion,
  regionCounts,
  onRegionSelect,
  sites,
  onSiteSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const regionBoundsRef = useRef<Record<string, BoundsLiteral>>({});
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이벤트 핸들러에서 최신 props를 참조하기 위한 ref
  const latest = useRef({ selectedRegion, regionCounts, onRegionSelect, onSiteSelect });
  useEffect(() => {
    latest.current = { selectedRegion, regionCounts, onRegionSelect, onSiteSelect };
  });

  // 지도 + 시/도 경계 초기화 (최초 1회)
  useEffect(() => {
    let cancelled = false;
    const listeners: naver.maps.MapEventListener[] = [];

    window.navermap_authFailure = () => {
      setError('네이버 지도 인증에 실패했습니다. Client ID와 서비스 URL 등록을 확인해 주세요.');
    };

    Promise.all([
      loadNaverMaps(keyId),
      fetch('/korea-provinces.json').then((res) => res.json() as Promise<GeoJSON.FeatureCollection>),
    ])
      .then(([, geojson]) => {
        if (cancelled || !containerRef.current) return;

        const map = new naver.maps.Map(containerRef.current, {
          minZoom: 6,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
          mapDataControl: false,
          scaleControl: false,
        });
        map.fitBounds(toNaverBounds(KOREA_BOUNDS));
        mapRef.current = map;

        regionBoundsRef.current = computeRegionBounds(geojson);
        map.data.addGeoJson(geojson, false);

        const regionOf = (feature: naver.maps.Feature) =>
          normalizeRegion(String(feature.getProperty('name') ?? ''));

        listeners.push(
          naver.maps.Event.addListener(map.data, 'click', (event: naver.maps.PointerEvent) => {
            const region = regionOf(event.feature);
            const { selectedRegion: current, onRegionSelect: select } = latest.current;
            select(current === region ? null : region);
          }),
          naver.maps.Event.addListener(map.data, 'mouseover', (event: naver.maps.PointerEvent) => {
            const region = regionOf(event.feature);
            // 같은 시/도에 속한 폴리곤(예: 광주·전남)을 함께 강조
            map.data.forEach((feature) => {
              if (regionOf(feature) === region) {
                map.data.overrideStyle(feature, { fillOpacity: 0.45, strokeWeight: 2 });
              }
            });
          }),
          naver.maps.Event.addListener(map.data, 'mouseout', () => {
            map.data.forEach((feature) => map.data.revertStyle(feature));
          }),
        );

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError('네이버 지도를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
      if (typeof naver !== 'undefined') naver.maps.Event.removeListener(listeners);
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [keyId]);

  // 시/도 경계 스타일 (대상지 수, 선택 상태 반영)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const maxCount = Math.max(1, ...Object.values(regionCounts));
    map.data.setStyle((feature) => {
      const region = normalizeRegion(String(feature.getProperty('name') ?? ''));
      const isSelected = region === selectedRegion;
      const count = regionCounts[region] ?? 0;

      return {
        fillColor: isSelected ? '#2F6B4F' : getRegionFill(count, maxCount),
        fillOpacity: isSelected ? 0.35 : selectedRegion ? 0.08 : 0.25,
        strokeColor: isSelected ? '#1F4D38' : '#3F6E56',
        strokeWeight: isSelected ? 2.5 : 1.2,
        strokeOpacity: isSelected ? 1 : 0.8,
      };
    });
  }, [ready, regionCounts, selectedRegion]);

  // 선택한 시/도로 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const bounds = selectedRegion ? regionBoundsRef.current[selectedRegion] : null;
    map.fitBounds(toNaverBounds(bounds ?? KOREA_BOUNDS), { top: 24, right: 24, bottom: 24, left: 24 });
  }, [ready, selectedRegion]);

  // 대상지 핀
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const listeners: naver.maps.MapEventListener[] = [];
    markersRef.current = sites
      .filter((site) => site.lat !== null && site.lng !== null)
      .map((site) => {
        const color = getStatusStyle(site.status).color;
        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(site.lat!, site.lng!),
          title: `${site.name} (${site.status})`,
          icon: {
            content: `<div class="site-pin"><span class="site-pin-dot" style="background:${color}"></span><span class="site-pin-label">${escapeHtml(site.name)}</span></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
        });
        listeners.push(
          naver.maps.Event.addListener(marker, 'click', () => latest.current.onSiteSelect(site)),
        );
        return marker;
      });

    return () => {
      if (typeof naver !== 'undefined') naver.maps.Event.removeListener(listeners);
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };
  }, [ready, sites]);

  return (
    <div className="relative h-full w-full">
      <style>{PIN_CSS}</style>
      <div ref={containerRef} className="h-full w-full" />

      {ready && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-x-3 gap-y-1 bg-white/90 px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm">
          {STATUS_ORDER.map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getStatusStyle(status).color }} />
              {status}
            </span>
          ))}
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
          지도를 불러오는 중…
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#DCEBE4] p-6 text-center text-sm text-zinc-600">
          {error}
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    navermap_authFailure?: () => void;
  }
}

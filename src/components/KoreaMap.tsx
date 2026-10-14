'use client';

import { useState, useRef, useEffect } from 'react';
import { KOREA_REGIONS } from '@/lib/koreaRegions';

type Props = {
  selectedRegion: string | null;
  regionCounts: Record<string, number>;
  onRegionSelect: (id: string | null) => void;
  zoom?: number;
};

export default function KoreaMap({
  selectedRegion,
  regionCounts,
  onRegionSelect,
  zoom = 1,
}: Props) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const wasMovedRef = useRef(false);

  useEffect(() => {
    if (zoom > 1) {
      return;
    }

    const frame = requestAnimationFrame(() => setPan({ x: 0, y: 0 }));
    return () => cancelAnimationFrame(frame);
  }, [zoom]);

  const z = zoom;
  const vbW = 430 / z;
  const vbH = 415 / z;
  const vbX = 270 - 215 / z + pan.x;
  const vbY = 262.5 - 207.5 / z + pan.y;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const canPan = zoom > 1;

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!canPan) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    wasMovedRef.current = false;
    setIsDragging(true);
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasMovedRef.current = true;
    if (!wasMovedRef.current) return;

    const rect = svgRef.current!.getBoundingClientRect();
    const scaleX = (430 / z) / rect.width;
    const scaleY = (415 / z) / rect.height;
    setPan({
      x: dragRef.current.startPanX - dx * scaleX,
      y: dragRef.current.startPanY - dy * scaleY,
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setIsDragging(false);
    setTimeout(() => { wasMovedRef.current = false; }, 0);
  }

  const maxCount = Math.max(1, ...Object.values(regionCounts));

  function getFill(id: string): string {
    if (selectedRegion === id) return '#2F6B4F';
    if (hoveredRegion === id) return '#B9D7C6';
    const count = regionCounts[id] ?? 0;
    if (count === 0) return '#F4F4F1';
    // 대상지 수에 따라 옅은 녹색 단계
    const t = count / maxCount;
    const light = Math.round(92 - t * 22);
    return `hsl(148 28% ${light}%)`;
  }

  function getStroke(id: string): string {
    if (selectedRegion === id) return '#1F4D38';
    if (hoveredRegion === id) return '#4E7F66';
    return '#A9B8AE';
  }

  function getStrokeWidth(id: string, isCity: boolean): number {
    if (selectedRegion === id) return 2;
    if (hoveredRegion === id) return 1.5;
    return isCity ? 0.8 : 1;
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="w-full h-full"
      style={{
        display: 'block',
        cursor: canPan ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: canPan ? 'none' : 'auto',
      }}
      aria-label="대한민국 지도"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Sea / background */}
      <rect x="-500" y="-500" width="2000" height="2000" fill="#DCEBE4" />

      {KOREA_REGIONS.map(({ id, shortName, d, cx, cy, isCity }) => {
        const count = regionCounts[id] ?? 0;
        const isSelected = selectedRegion === id;
        const isHovered = hoveredRegion === id;

        return (
          <g
            key={id}
            onClick={() => {
              if (wasMovedRef.current) return;
              onRegionSelect(isSelected ? null : id);
            }}
            onMouseEnter={() => !isDragging && setHoveredRegion(id)}
            onMouseLeave={() => setHoveredRegion(null)}
            style={{ cursor: canPan ? 'inherit' : 'pointer' }}
            role="button"
            aria-label={`${id} - 대상지 ${count}곳`}
            aria-pressed={isSelected}
          >
            <path
              d={d}
              fill={getFill(id)}
              stroke={getStroke(id)}
              strokeWidth={getStrokeWidth(id, isCity)}
              strokeLinejoin="round"
            />

            {/* Province name */}
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isCity ? 8 : 11}
              fontWeight={isSelected || isHovered ? '700' : '500'}
              fill={isSelected ? '#fff' : '#27352D'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {shortName}
            </text>

            {/* 대상지 수 */}
            {count > 0 && (
              <text
                x={cx}
                y={cy + (isCity ? 10 : 13)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isCity ? 7 : 9}
                fill={isSelected ? '#E3F2EA' : '#4B5E53'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {count}곳
              </text>
            )}
          </g>
        );
      })}

    </svg>
  );
}

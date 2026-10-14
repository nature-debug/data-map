import SitePhoto from './SitePhoto';
import { formatRound, getRegionShortName, getSizedPhotoUrl, getStatusStyle } from '@/lib/siteLabels';
import type { Site } from '@/types';

export default function SiteCard({
  site,
  onClick,
}: {
  site: Site;
  onClick: () => void;
}) {
  const status = getStatusStyle(site.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col overflow-hidden bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* 대표사진 + 현재 상태 */}
      <div className="relative w-full overflow-hidden bg-zinc-100" style={{ aspectRatio: '4/3' }}>
        <SitePhoto
          src={getSizedPhotoUrl(site.photoUrl, 600)}
          alt={site.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <span
          className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          style={{ backgroundColor: status.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {site.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3.5 py-3.5 sm:px-4 sm:py-4">
        <p className="text-lg font-black leading-snug text-zinc-900 sm:text-xl">{site.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-bold text-zinc-700">{formatRound(site.round, site.roundLabel)}</span>
          {site.region && (
            <span className="text-zinc-400">{getRegionShortName(site.region)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

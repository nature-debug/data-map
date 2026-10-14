import type { Metadata } from 'next';
import { getSiteById, getSites } from '@/lib/sheets';
import { getSizedPhotoUrl } from '@/lib/siteLabels';
import MapPage from '@/components/MapPage';

type SearchParams = Promise<{ region?: string; site?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { site: siteId } = await searchParams;
  const site = siteId ? await getSiteById(siteId.trim()) : null;

  if (!site) return {};

  const description = `${site.address} · 현재 보전상태: ${site.status}`;
  return {
    title: `${site.name} - 이곳만은 꼭 지키자`,
    description,
    openGraph: {
      title: site.name,
      description,
      images: site.photoUrl ? [getSizedPhotoUrl(site.photoUrl, 1200)] : undefined,
    },
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sites = await getSites();
  const { region, site } = await searchParams;

  return (
    <MapPage
      sites={sites}
      initialRegion={region?.trim() || null}
      initialSiteId={site?.trim() || null}
    />
  );
}

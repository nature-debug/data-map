import type { ReactNode } from 'react';
import { formatRound, getSizedPhotoUrl, getStatusStyle, VALUE_CATEGORIES } from '@/lib/siteLabels';
import type { Site } from '@/types';
import SitePhoto from './SitePhoto';

type Item = { label: string; value: string };

/** 주요연혁(BB열) 문단을 항목 단위로 나눔. 연도/글머리로 시작하지 않는 줄은 앞 항목에 이어 붙임 */
function splitHistory(history: string): string[] {
  const items: string[] = [];

  for (const raw of history.split(/\n+|\s*\/\s*(?=\d{4})/)) {
    const line = raw.trim();
    if (!line) continue;

    const startsNew = /^(\d{4}|[-•·▶▷○●*]|\d+\.)/.test(line);
    if (startsNew || items.length === 0) {
      items.push(line.replace(/^[-•·▶▷○●*]\s*/, ''));
    } else {
      items[items.length - 1] += ` ${line}`;
    }
  }

  return items;
}

function join(...values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(' · ');
}

export default function SiteDetail({ site }: { site: Site }) {
  const status = getStatusStyle(site.status);
  const history = splitHistory(site.history);

  const values: Item[] = [
    ...VALUE_CATEGORIES.map((category) => ({
      label: category.label,
      value: site[category.field].join(', '),
    })),
    { label: '희소성·대표성', value: site.rarity },
    { label: '핵심 키워드', value: site.keywords },
  ];

  const threatItems: Item[] = [
    { label: '위협 진행상태', value: site.threatStage },
    { label: '위협 원인', value: site.threatCause },
    { label: '위협 대상', value: site.threatTarget },
    { label: '위협 주체', value: site.threatActor },
    {
      label: '응모 당시 대응',
      value: join(
        site.pastResponse,
        site.pastResponseActorType,
        site.pastResponseActor,
        site.pastResponseType,
      ),
    },
  ];

  const currentItems: Item[] = [
    { label: '위협 변화', value: site.threatChange },
    { label: '현재 활용', value: site.currentUse },
    { label: '관리 상태', value: join(site.managed, site.managerType, site.managerName) },
    { label: '복원·정비', value: site.restoration },
    {
      label: '법적 보호',
      value: join(
        site.legalProtection,
        site.protectionName,
        site.protectionYear && /^\d{4}$/.test(site.protectionYear)
          ? `${site.protectionYear}년 지정`
          : site.protectionYear,
      ),
    },
    {
      label: '현재 대응',
      value: join(
        site.currentResponse,
        site.currentResponseActorType,
        site.currentResponseActor,
        site.currentResponseType,
      ),
    },
  ];

  return (
    <article className="bg-white">
      {/* 1. 장소명 + 주소 */}
      <header className="px-5 pb-5 pt-6 pr-16 sm:px-8 sm:pt-8 sm:pr-40">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="bg-zinc-900 px-2.5 py-0.5 text-sm font-bold text-white">
            {formatRound(site.round, site.roundLabel)}
          </span>
          {site.year && (
            <span className="bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600">
              {site.year}년
            </span>
          )}
          <span className="bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600">
            {site.heritageType}
          </span>
        </div>
        <h2 className="text-3xl font-black leading-tight tracking-tight text-zinc-900 sm:text-4xl">
          {site.name}
        </h2>
        {site.currentName && (
          <p className="mt-1.5 text-base font-semibold text-zinc-500">현재 이름: {site.currentName}</p>
        )}
        {site.address && (
          <p className="mt-2 flex items-start gap-1.5 text-base text-zinc-600">
            <svg className="mt-1 h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>
              {site.address}
              {site.originalAddress && (
                <span className="block text-sm text-zinc-400">응모 당시 주소: {site.originalAddress}</span>
              )}
            </span>
          </p>
        )}
      </header>

      {/* 2. 대표사진 */}
      <div className="relative w-full bg-zinc-100" style={{ aspectRatio: '16/9' }}>
        <SitePhoto src={getSizedPhotoUrl(site.photoUrl, 1600)} alt={site.name} sizes="(max-width: 1024px) 100vw, 1024px" />
      </div>

      {/* 현재 보전상태 (가장 강조) */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-5 sm:px-8"
        style={{ backgroundColor: status.soft, borderBottom: `3px solid ${status.color}` }}
      >
        <p className="text-sm font-bold" style={{ color: status.color }}>현재 보전상태</p>
        <p className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: status.color }}>
          {site.status}
        </p>
      </div>

      <div className="space-y-10 px-5 py-8 sm:px-8">
        <Section number={1} title="주요 가치">
          <InfoTable items={values} />
        </Section>

        <Section number={2} title="당시의 위협과 대응">
          <InfoTable items={threatItems} />
        </Section>

        <Section number={3} title="현재 상태">
          <InfoTable items={currentItems} />
        </Section>

        <Section number={4} title="변화의 기록">
          <p className="mb-3 text-sm font-bold text-zinc-500">주요 연혁</p>
          {history.length > 0 ? (
            <ol className="relative ml-1.5 space-y-3 border-l-2 border-zinc-200 pl-5">
              {history.map((item, index) => (
                <li key={index} className="relative text-base leading-7 text-zinc-700">
                  <span className="absolute -left-[27px] top-2.5 h-3 w-3 rounded-full border-2 border-white bg-zinc-400" />
                  {item}
                </li>
              ))}
            </ol>
          ) : (
            <Empty />
          )}

          {site.recorderNote && (
            <figure className="mt-6 bg-zinc-50 px-5 py-5 sm:px-6">
              <svg className="mb-2 h-6 w-6 text-zinc-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>
              <blockquote className="whitespace-pre-line text-base leading-7 text-zinc-700">
                {site.recorderNote}
              </blockquote>
              {site.recorder && (
                <figcaption className="mt-3 text-sm font-bold text-zinc-500">— 기록자 {site.recorder}</figcaption>
              )}
            </figure>
          )}
        </Section>

        <Section number={5} title="관련 자료">
          {site.references.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {site.references.map((reference, index) => {
                const isLink = /^https?:\/\//.test(reference.url);
                const content = (
                  <>
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500">
                      <span>자료 {index + 1}</span>
                      {reference.sourceType && (
                        <span className="bg-zinc-100 px-1.5 py-0.5 text-zinc-600">{reference.sourceType}</span>
                      )}
                      {reference.publishedAt && <span>{reference.publishedAt}</span>}
                    </div>
                    <p className="text-base font-bold leading-snug text-zinc-900 group-hover:underline">
                      {reference.title || reference.url}
                    </p>
                    {isLink && (
                      <p className="mt-1 truncate text-xs text-zinc-400">{reference.url}</p>
                    )}
                  </>
                );

                return (
                  <li key={index}>
                    {isLink ? (
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block h-full border border-zinc-200 px-4 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="h-full border border-zinc-200 px-4 py-4">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>
      </div>
    </article>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-4 flex items-baseline gap-2.5 text-2xl font-black tracking-tight text-zinc-900">
        <span className="text-base font-bold text-zinc-300">{String(number).padStart(2, '0')}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoTable({ items }: { items: Item[] }) {
  return (
    <table className="w-full border-collapse border-t-2 border-zinc-800 text-left">
      <tbody>
        {items.map((item) => (
          <tr key={item.label} className="border-b border-zinc-200">
            <th
              scope="row"
              className="w-28 bg-zinc-50 px-3 py-3 align-baseline text-sm font-bold text-zinc-500 sm:w-40 sm:px-4"
            >
              {item.label}
            </th>
            <td className={`px-3 py-3 align-baseline text-base leading-relaxed sm:px-4 ${item.value ? 'text-zinc-800' : 'text-zinc-300'}`}>
              {item.value || '기록 없음'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty() {
  return <p className="text-base text-zinc-400">기록 없음</p>;
}

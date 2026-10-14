const CREDITS = [
  { role: '주관', names: ['내셔널트러스트'] },
  { role: '협력', names: ['투명사회를위한정보공개센터', '도토리랩스'] },
  { role: '지원', names: ['서울시공익활동지원센터'] },
];

export default function Footer() {
  return (
    <footer className="bg-[#14211A]">
      <div className="max-w-screen-xl mx-auto px-5 py-8">
        <p className="text-base font-black tracking-tight text-white">이곳만은 꼭 지키자</p>
        <p className="mt-1 text-xs text-[#7F9488]">선정지, 그 후의 기록</p>
        <dl className="mt-5 flex flex-col gap-y-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          {CREDITS.map(({ role, names }) => (
            <div key={role} className="flex gap-2">
              <dt className="shrink-0 font-bold text-[#A9BDB1]">{role}</dt>
              <dd className="text-[#D5E1DA]">{names.join(', ')}</dd>
            </div>
          ))}
        </dl>
        <div className="my-5 border-t border-[#25362C]" />
        <p className="text-xs text-[#5C7064]">
          데이터는 시민 기록자들이 조사한 내용을 바탕으로 하며, 실제 현황과 다를 수 있습니다.
        </p>
      </div>
    </footer>
  );
}

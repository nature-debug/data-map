'use client';

import { useEffect, useState } from 'react';

type Feedback = 'idle' | 'copied' | 'shared';

type Props = {
  title: string;
  sharePath: string;
};

export default function ShareButton({ title, sharePath }: Props) {
  const [feedback, setFeedback] = useState<Feedback>('idle');

  useEffect(() => {
    if (feedback === 'idle') {
      return undefined;
    }

    const timer = window.setTimeout(() => setFeedback('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleShare = async () => {
    const shareUrl = new URL(sharePath, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title}의 지금을 확인해보세요.`, url: shareUrl });
        setFeedback('shared');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback('copied');
        return;
      } catch {
        // Fall through to the prompt fallback.
      }
    }

    window.prompt('이 링크를 복사해 공유해 주세요.', shareUrl);
  };

  const label =
    feedback === 'copied' ? '링크 복사됨' : feedback === 'shared' ? '공유 완료' : '공유하기';

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
        aria-label={label}
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 512 512" aria-hidden="true">
          <path d="M503.691 189.836 327.687 37.851C312.102 24.098 288 35.235 288 56v80.1C165.2 137.8 64 252.5 64 394.7V456c0 13.255 10.745 24 24 24 6.804 0 13.285-2.859 17.821-7.871C153.206 419.067 222.899 384 288 384v80c0 20.765 24.102 31.902 39.687 18.149l176.004-151.985c10.39-9.226 10.39-25.102 0-34.328z" />
        </svg>
        <span className="hidden sm:inline">{label}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {feedback === 'idle' ? '' : label}
      </span>
    </>
  );
}

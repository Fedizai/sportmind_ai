"use client";

/**
 * Play a video from wherever it came from.
 *
 * A YouTube or Vimeo watch URL has to be embedded rather than handed to a
 * <video> element, which would show a black rectangle. Anything else is a
 * direct file — an upload's download URL included — and plays natively.
 */

function youTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
}

function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const youtube = youTubeId(url);
  if (youtube) {
    return (
      <iframe
        className={className ?? 'h-full w-full'}
        src={`https://www.youtube.com/embed/${youtube}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return (
      <iframe
        className={className ?? 'h-full w-full'}
        src={`https://player.vimeo.com/video/${vimeo}`}
        title="Vimeo video"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return <video src={url} controls className={className ?? 'h-full w-full bg-black'} />;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";

import { useTranslation } from "@/hooks/use-translation";

/**
 * Play a video from wherever it came from — without loading Google or Vimeo
 * until the viewer says so.
 *
 * A YouTube or Vimeo watch URL has to be embedded rather than handed to a
 * <video> element, which would show a black rectangle. But the moment such an
 * iframe mounts, that third party has the viewer's IP address and sets its own
 * cookies, and neither is necessary for SportMind to work. Under the ePrivacy
 * rules that is the one thing on this site that genuinely needs consent, so the
 * player is replaced by a card that says what will happen and waits to be
 * pressed. Nothing loads before that; nothing here needs a site-wide banner.
 *
 * The answer is remembered for the session only. A choice about third-party
 * tracking should not be permanent by default, and `sessionStorage` also keeps
 * this out of the strictly-necessary storage listed in the cookie policy.
 *
 * Direct files — an upload's own download URL included — are served from our
 * own storage and play natively with no gate.
 */

const SESSION_KEY = "sportmind:embed-consent";

const S = {
  youtubeTitle: { en: "YouTube video", fr: "Vidéo YouTube" },
  vimeoTitle: { en: "Vimeo video", fr: "Vidéo Vimeo" },
  youtubeNotice: {
    en: "This video is hosted by YouTube. Playing it shares your IP address with Google and lets it set its own cookies.",
    fr: "Cette vidéo est hébergée par YouTube. La lire transmet votre adresse IP à Google et lui permet de déposer ses propres cookies.",
  },
  vimeoNotice: {
    en: "This video is hosted by Vimeo. Playing it shares your IP address with Vimeo and lets it set its own cookies.",
    fr: "Cette vidéo est hébergée par Vimeo. La lire transmet votre adresse IP à Vimeo et lui permet de déposer ses propres cookies.",
  },
  load: { en: "Load the video", fr: "Charger la vidéo" },
  policy: { en: "Cookie policy", fr: "Politique cookies" },
} as const;

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

function ConsentGate({
  provider,
  src,
  title,
  allow,
  className,
}: {
  provider: "youtube" | "vimeo";
  src: string;
  title: string;
  allow: string;
  className: string;
}) {
  const { language } = useTranslation();
  const tr = (b: { en: string; fr: string }) => (language === "fr" ? b.fr : b.en);
  const [allowed, setAllowed] = useState(false);

  // Read after mount: sessionStorage does not exist during server rendering,
  // and a private window can throw on access rather than return null.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "granted") setAllowed(true);
    } catch { /* storage blocked; the gate simply asks every time */ }
  }, []);

  const accept = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, "granted"); } catch { /* as above */ }
    setAllowed(true);
  }, []);

  if (allowed) {
    return <iframe className={className} src={src} title={title} allow={allow} allowFullScreen />;
  }

  const notice = provider === "youtube" ? S.youtubeNotice : S.vimeoNotice;

  return (
    <div className={`${className} flex flex-col items-center justify-center gap-3 bg-black/60 p-5 text-center`}>
      <p className="max-w-[46ch] text-sm leading-relaxed text-white/80">{tr(notice)}</p>
      <button
        type="button"
        onClick={accept}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        {tr(S.load)}
      </button>
      <a
        href="/cookies"
        className="text-xs text-white/70 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {tr(S.policy)}
      </a>
    </div>
  );
}

export function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const { language } = useTranslation();
  const tr = (b: { en: string; fr: string }) => (language === "fr" ? b.fr : b.en);
  const box = className ?? "h-full w-full";

  const youtube = youTubeId(url);
  if (youtube) {
    return (
      <ConsentGate
        provider="youtube"
        // youtube-nocookie.com is the same player without the tracking cookie
        // set on load. It is not consent-free, which is why the gate is still
        // here, but it is the lesser of the two once consent is given.
        src={`https://www.youtube-nocookie.com/embed/${youtube}`}
        title={tr(S.youtubeTitle)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className={box}
      />
    );
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return (
      <ConsentGate
        provider="vimeo"
        // dnt=1 is Vimeo's own do-not-track flag: no session cookie, no analytics.
        src={`https://player.vimeo.com/video/${vimeo}?dnt=1`}
        title={tr(S.vimeoTitle)}
        allow="autoplay; fullscreen; picture-in-picture"
        className={box}
      />
    );
  }

  return <video src={url} controls className={`${box} bg-black`} />;
}

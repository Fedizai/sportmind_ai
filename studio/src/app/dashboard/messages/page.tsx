
"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { DesktopMessaging } from "@/components/messaging/desktop-messaging";
import { MobileMessaging } from "@/components/messaging/mobile-messaging";

export default function MessagesPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="h-full flex-grow">
      {isDesktop ? (
          <DesktopMessaging />
      ) : (
          <MobileMessaging />
      )}
    </div>
  );
}

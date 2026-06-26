import { cn } from "@/lib/utils";
import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("relative w-40 h-12", className)}>
      <Image
        src="/my_logo.png"
        alt="SportMind AI Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}

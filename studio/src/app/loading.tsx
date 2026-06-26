
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="relative h-20 w-20 animate-spin-slow">
        <Image
          src="/my_logo.png"
          alt="Loading..."
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

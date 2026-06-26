
import { cn } from "@/lib/utils";

export const TennisBallIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6", className)}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M19.33 6.67A10.03 10.03 0 0 0 4.67 17.33" />
    <path d="M17.33 4.67A10.03 10.03 0 0 1 6.67 19.33" />
  </svg>
);

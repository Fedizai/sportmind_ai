
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressCircleProps extends React.SVGProps<SVGSVGElement> {
  value?: number
}

const ProgressCircle = React.forwardRef<SVGSVGElement, ProgressCircleProps>(
  ({ className, value = 0, ...props }, ref) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference

    return (
      <svg
        ref={ref}
        className={cn("animate-progress-circle", className)}
        viewBox="0 0 100 100"
        {...props}
      >
        <circle
          className="stroke-muted"
          strokeWidth="10"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="stroke-primary"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
        />
      </svg>
    )
  }
)
ProgressCircle.displayName = "ProgressCircle"

export { ProgressCircle }

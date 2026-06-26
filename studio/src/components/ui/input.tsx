
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background/50 dark:bg-white/[0.04] px-4 py-2 text-sm",
          "backdrop-blur-sm",
          "ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground/60",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:bg-background/80 dark:focus-visible:bg-white/[0.07]",
          "focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.15),0_0_12px_rgba(59,130,246,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

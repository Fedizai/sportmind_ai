"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-input bg-background/50 dark:bg-white/[0.04] px-4 py-3 text-sm backdrop-blur-sm",
          "placeholder:text-muted-foreground/60 transition-all duration-200 resize-none",
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
Textarea.displayName = "Textarea"

export { Textarea }

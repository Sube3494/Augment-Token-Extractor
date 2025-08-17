"use client"

import * as React from "react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="group relative w-10 h-10 rounded-xl bg-background border border-border hover:bg-accent transition-all duration-200 ace-press ace-ripple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="切换主题"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Sun icon */}
        <svg
          className={`w-5 h-5 text-foreground transition-all duration-200 ${
            resolvedTheme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>

        {/* Moon icon */}
        <svg
          className={`absolute w-5 h-5 text-foreground transition-all duration-200 ${
            resolvedTheme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  )
}

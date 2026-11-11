import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type StatusScreenProps = {
  icon: LucideIcon
  title: string
  /** h1 when the screen is the page's only title; h2 under the list header. */
  headingLevel?: "h1" | "h2"
  /** "alert" for failures, so screen readers announce them when they appear. */
  role?: "alert"
  description: ReactNode
  actions: ReactNode
}

/** Shared layout for 404 and error screens: icon, title, one sentence, ways out. */
export function StatusScreen({
  icon: Icon,
  title,
  headingLevel = "h1",
  role,
  description,
  actions,
}: StatusScreenProps) {
  const Heading = headingLevel
  return (
    <div role={role} className="mx-auto flex max-w-[420px] flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-18 items-center justify-center rounded-card border border-border bg-surface">
        <Icon aria-hidden className="size-8 text-accent" strokeWidth={1.8} />
      </div>
      <Heading className="font-display text-2xl font-bold">{title}</Heading>
      <p className="text-base text-text-secondary">{description}</p>
      <div className="mt-2 flex w-full flex-col gap-2">{actions}</div>
    </div>
  )
}

const primaryClassName =
  "flex min-h-13 items-center justify-center rounded-card bg-accent px-6 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
const secondaryClassName =
  "flex min-h-12 items-center justify-center rounded-card border border-border bg-surface px-6 text-base font-semibold transition-colors duration-150 hover:border-border-strong"

type ActionStyle = { variant?: "primary" | "secondary" }

export function StatusButton({
  variant = "primary",
  onClick,
  children,
}: ActionStyle & { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(variant === "primary" ? primaryClassName : secondaryClassName)}
    >
      {children}
    </button>
  )
}

export function StatusLink({
  variant = "primary",
  href,
  isExternal = false,
  children,
}: ActionStyle & { href: string; isExternal?: boolean; children: ReactNode }) {
  const className = variant === "primary" ? primaryClassName : secondaryClassName
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

const FOOTER_LINKS = [
  { href: "https://gmkrikor.com.br/", label: "Site oficial" },
  { href: "https://www.youtube.com/@GMKrikor", label: "YouTube" },
  { href: "https://github.com/refeals/gm-krikor-sleeprun-data", label: "GitHub" },
]

const linkClassName =
  "text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline"

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-[calc(env(safe-area-inset-bottom)+24px)] md:px-6">
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-text-muted md:flex-row md:items-center md:justify-between">
        <p>
          Criado por{" "}
          {/* Inside a sentence, color alone doesn't mark a link (WCAG 1.4.1): keep the underline. */}
          <a
            href="https://rafaelsiqueira.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClassName} underline`}
          >
            Rafael Siqueira
            <span className="sr-only"> (abre em nova aba)</span>
          </a>{" "}
          para a comunidade do GM Krikor Mekhitarian.
        </p>
        <ul className="-mx-2 flex flex-wrap">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center px-2 ${linkClassName}`}
              >
                {link.label}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

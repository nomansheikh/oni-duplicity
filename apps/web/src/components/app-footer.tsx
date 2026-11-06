import { ExternalLink } from 'lucide-react'

const REPO = 'https://github.com/nomansheikh/oni-duplicity'

/** Version, build commit and source link, at the bottom of every page. */
export function AppFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink px-3 py-2 type-caption text-muted-foreground">
      <span className="tabular-nums">
        Duplicity v{__APP_VERSION__}
        {' · '}
        <a
          href={`${REPO}/commit/${__APP_COMMIT__}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {__APP_COMMIT__}
        </a>
      </span>
      <a
        href={REPO}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        Source on GitHub <ExternalLink className="size-3.5" />
      </a>
    </footer>
  )
}

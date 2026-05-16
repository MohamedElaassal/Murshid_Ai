import { PropsWithChildren } from 'react'

import { NotificationPanel } from '../components/NotificationPanel'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'
import { OutbreakAlert } from '../types'

interface AppLayoutProps extends PropsWithChildren {
  onFocusMap?: (alert: OutbreakAlert) => void
}

export const AppLayout = ({ children, onFocusMap }: AppLayoutProps): JSX.Element => {
  const { lang, cycleLang, langLabel, t } = useLang()
  const { isDark, toggleTheme } = useTheme()

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        lang === 'AR' ? "font-['IBM_Plex_Sans_Arabic']" : "font-['IBM_Plex_Sans']"
      }`}
      style={{ backgroundColor: 'var(--mourchid-bg)', color: 'var(--mourchid-text)' }}
    >
      <header
        className="sticky top-0 z-40 w-full border-b backdrop-blur-md px-4 py-3 md:px-8 flex items-center justify-between rtl:flex-row-reverse"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mourchid-surface) 92%, transparent)',
          borderColor: 'var(--mourchid-border)',
        }}
      >
        <div className="flex items-center gap-3 rtl:flex-row-reverse">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--mourchid-primary), #0d3d24)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 3c-4 0-7 2.5-7 6 0 5 7 12 7 12s7-7 7-12c0-3.5-3-6-7-6z" />
              <circle cx="12" cy="9" r="2" />
            </svg>
          </div>
          <span className="font-semibold text-base" style={{ color: 'var(--mourchid-primary)' }}>
            {t('national_dashboard')}
          </span>
        </div>

        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          <NotificationPanel onFocusMap={onFocusMap} />

          <Button
            type="button"
            variant="outline"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 border rounded-lg"
            style={{ borderColor: 'var(--mourchid-border)', backgroundColor: 'var(--mourchid-surface)' }}
            aria-label={isDark ? t('light_mode') : t('dark_mode')}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={cycleLang}
            className="h-9 min-w-[7.5rem] px-3 text-sm font-medium rounded-lg border"
            style={{
              borderColor: 'var(--mourchid-border)',
              backgroundColor: 'var(--mourchid-primary-soft)',
              color: 'var(--mourchid-primary)',
            }}
            title={t('switch_language')}
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {langLabel}
            </span>
          </Button>
        </div>
      </header>
      <Separator className="opacity-60" style={{ backgroundColor: 'var(--mourchid-border)' }} />
      <main>{children}</main>
    </div>
  )
}

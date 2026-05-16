import { router, usePage } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useLang } from '../hooks/useLang'
import { OutbreakAlert, SharedPageProps, TranslationKey } from '../types'

const severityClassName = (severity: OutbreakAlert['severity']): string => {
  if (severity === 'high') {
    return 'bg-red-100 text-red-800 border-red-200'
  }
  if (severity === 'medium') {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

const severityKey = (severity: OutbreakAlert['severity']): TranslationKey => {
  if (severity === 'high') return 'severity_high'
  if (severity === 'medium') return 'severity_medium'
  return 'severity_low'
}

const formatAlertTime = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleString()
}

interface NotificationPanelProps {
  onFocusMap?: (alert: OutbreakAlert) => void
}

export const NotificationPanel = ({ onFocusMap }: NotificationPanelProps): JSX.Element => {
  const { outbreak_alerts: alerts, unread_alert_count: unreadCount } =
    usePage<SharedPageProps>().props
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markRead = (id: string): void => {
    router.post(`/app/alerts/${id}/read`, {}, { preserveScroll: true })
  }

  const markAllRead = (): void => {
    router.post('/app/alerts/read-all', {}, { preserveScroll: true })
  }

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="relative border-gray-200"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('notifications')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-[min(92vw,380px)] rounded-xl z-50 overflow-hidden border"
          style={{
            backgroundColor: 'var(--mourchid-surface)',
            borderColor: 'var(--mourchid-border)',
            boxShadow: 'var(--mourchid-shadow)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b rtl:flex-row-reverse"
            style={{ borderColor: 'var(--mourchid-border)' }}
          >
            <div className="rtl:text-right">
              <p className="text-sm font-semibold">{t('notifications')}</p>
              {unreadCount > 0 && (
                <p className="text-xs" style={{ color: 'var(--mourchid-muted)' }}>
                  {unreadCount} {t('unread_alerts')}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button type="button" variant="ghost" className="text-xs h-8" onClick={markAllRead}>
                {t('mark_all_read')}
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--mourchid-muted)' }}>
                {t('no_notifications')}
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-4 py-3 border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--mourchid-border)',
                    backgroundColor: alert.read_at
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--mourchid-accent) 12%, var(--mourchid-surface))',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 rtl:flex-row-reverse">
                    <div className="rtl:text-right min-w-0">
                      <p className="text-sm font-medium">{alert.detected_disease}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--mourchid-muted)' }}>
                        {alert.region} · {alert.report_count} {t('reports_clustered')}
                      </p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--mourchid-muted)' }}>
                        {alert.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--mourchid-muted)' }}>
                        {formatAlertTime(alert.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={severityClassName(alert.severity)}>
                      {t(severityKey(alert.severity))}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2 rtl:flex-row-reverse">
                    {onFocusMap && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          onFocusMap(alert)
                          setOpen(false)
                        }}
                      >
                        {t('view_on_map')}
                      </Button>
                    )}
                    {!alert.read_at && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => markRead(alert.id)}
                      >
                        {t('mark_read')}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

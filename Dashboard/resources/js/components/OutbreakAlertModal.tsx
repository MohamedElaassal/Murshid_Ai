import { router } from '@inertiajs/react'

import { Button } from './ui/button'
import { useLang } from '../hooks/useLang'
import { localizeDisease, localizeRegion } from '../translations'
import { OutbreakAlert } from '../types'

interface OutbreakAlertModalProps {
  alerts: OutbreakAlert[]
  open: boolean
  onClose: () => void
  onViewMap: () => void
}

export const OutbreakAlertModal = ({
  alerts,
  open,
  onClose,
  onViewMap,
}: OutbreakAlertModalProps): JSX.Element | null => {
  const { t, lang } = useLang()

  if (!open || alerts.length === 0) {
    return null
  }

  const markAllRead = (): void => {
    router.post('/app/alerts/read-all', {}, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-red-100 overflow-hidden">
        <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-start gap-3 rtl:flex-row-reverse">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.8"
            >
              <path d="M10.3 3.3 2.6 17.2a2 2 0 0 0 1.8 2.8h15.2a2 2 0 0 0 1.8-2.8L13.7 3.3a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <div className="rtl:text-right">
            <p className="text-sm font-semibold text-red-900">{t('outbreak_risk_title')}</p>
            <p className="text-xs text-red-700 mt-1">{t('outbreak_risk_body')}</p>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-5 py-3 space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 rtl:text-right"
            >
              <p className="text-sm font-medium text-gray-900">
                {t('potential_outbreak')}: {localizeDisease(lang, alert.detected_disease)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {localizeRegion(lang, alert.region)} — {alert.report_count} {t('reports_clustered')} (
                {alert.density_percent}%)
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-gray-100 rtl:flex-row-reverse">
          <Button type="button" className="bg-[#1a5c38] hover:bg-[#164d2f]" onClick={onViewMap}>
            {t('view_on_map')}
          </Button>
          <Button type="button" variant="outline" onClick={markAllRead}>
            {t('mark_all_read')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('dismiss')}
          </Button>
        </div>
      </div>
    </div>
  )
}

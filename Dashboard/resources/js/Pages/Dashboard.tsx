declare const L: any

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePage } from '@inertiajs/react'

import { AppLayout } from '../Layouts/AppLayout'
import { OutbreakAlertModal } from '../components/OutbreakAlertModal'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'
import {
  DashboardProps,
  DiseaseReport,
  MapMarker,
  OutbreakAlert,
  OutbreakZone,
  TranslationKey,
} from '../types'

interface LeafletMap {
  setView: (coords: [number, number], zoom: number) => LeafletMap
  remove: () => void
}

interface LeafletLayerGroup {
  clearLayers: () => void
  addLayer: (layer: unknown) => void
  addTo: (map: LeafletMap) => void
}

interface LeafletTileLayer {
  addTo: (map: LeafletMap) => void
}

interface LeafletCircleMarker {
  bindPopup: (content: string) => void
}

interface LeafletCircle {
  bindPopup: (content: string) => LeafletCircle
}

const diseaseColors: Record<string, string> = {
  'Peacock Spot': '#ef4444',
  'Verticillium Wilt': '#f97316',
  'Citrus Greening': '#eab308',
  Fusarium: '#8b5cf6',
  Mildiou: '#3b82f6',
  'Oïdium': '#ec4899',
  Alternaria: '#14b8a6',
  Rhizoctonia: '#6b7280',
}

const diseaseColorClasses: Record<string, string> = {
  'Peacock Spot': 'bg-[#ef4444]',
  'Verticillium Wilt': 'bg-[#f97316]',
  'Citrus Greening': 'bg-[#eab308]',
  Fusarium: 'bg-[#8b5cf6]',
  Mildiou: 'bg-[#3b82f6]',
  'Oïdium': 'bg-[#ec4899]',
  Alternaria: 'bg-[#14b8a6]',
  Rhizoctonia: 'bg-[#6b7280]',
}

const regions = [
  'Souss-Massa',
  'Meknès',
  'Saïss',
  'Gharb',
  'Haouz',
  'Tadla-Azilal',
  'Oriental',
  'Doukkala-Abda',
  'Marrakech-Safi',
  'Drâa-Tafilalet',
]

const diseases = [
  'Peacock Spot',
  'Verticillium Wilt',
  'Citrus Greening',
  'Fusarium',
  'Mildiou',
  'Oïdium',
  'Alternaria',
  'Rhizoctonia',
]

const formatTime = (value: string): string => {
  const date = new Date(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${hours}:${minutes} ${day}/${month}`
}

const statusToKey = (status: DiseaseReport['status']): TranslationKey => {
  if (status === 'CLOSED_SUCCESS') return 'resolved'
  if (status === 'CLOSED_FAILED') return 'escalated'
  return 'pending'
}

const statusClassName = (status: DiseaseReport['status']): string => {
  if (status === 'CLOSED_SUCCESS') {
    return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300'
  }
  if (status === 'CLOSED_FAILED') {
    return 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300'
  }
  return 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300'
}

const exportCsv = (rows: DiseaseReport[], t: (key: TranslationKey) => string): void => {
  const header = [
    t('ticket'),
    t('time'),
    t('region'),
    t('crop'),
    t('disease'),
    t('status'),
    t('chemical'),
    t('feedback'),
  ]

  const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`

  const dataRows = rows.map((row) => {
    const statusLabel = t(statusToKey(row.status))
    return [
      row.report_id,
      formatTime(row.created_at),
      row.region ?? '',
      row.crop_type,
      row.detected_disease,
      statusLabel,
      row.prescribed_chemical,
      row.farmer_feedback ?? '',
    ].map(escapeCsv)
  })

  const csv = [header.map(escapeCsv).join(','), ...dataRows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'mourchid-reports.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const outbreakZoneColor = (severity: OutbreakZone['severity']): string => {
  if (severity === 'high') return '#dc2626'
  if (severity === 'medium') return '#ea580c'
  return '#ca8a04'
}

const Dashboard = (): JSX.Element => {
  const { props } = usePage<DashboardProps>()
  const { t, lang } = useLang()
  const { isDark } = useTheme()

  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [filterDisease, setFilterDisease] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAll, setShowAll] = useState<boolean>(false)
  const [showLoginAlert, setShowLoginAlert] = useState<boolean>(props.show_outbreak_modal)
  const attributionText = t('openstreetmap_attribution')

  const mapRef = useRef<LeafletMap | null>(null)
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null)
  const zonesLayerRef = useRef<LeafletLayerGroup | null>(null)
  const mapSectionRef = useRef<HTMLElement | null>(null)

  const primaryAlert = useMemo(
    () => props.outbreak_alerts.find((alert) => alert.status === 'active') ?? null,
    [props.outbreak_alerts],
  )

  const unreadActiveAlerts = useMemo(
    () => (primaryAlert && !primaryAlert.read_at ? [primaryAlert] : []),
    [primaryAlert],
  )

  const focusMapOnAlert = (alert: OutbreakAlert): void => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    mapRef.current?.setView([alert.centroid_latitude, alert.centroid_longitude], 9)
  }

  const filteredMarkers = useMemo(() => {
    return props.map_markers.filter((marker: MapMarker) => {
      if (filterRegion !== 'all' && marker.region !== filterRegion) {
        return false
      }
      if (filterDisease !== 'all' && marker.detected_disease !== filterDisease) {
        return false
      }
      if (filterStatus !== 'all' && marker.status !== filterStatus) {
        return false
      }
      return true
    })
  }, [props.map_markers, filterRegion, filterDisease, filterStatus])

  const filteredReports = useMemo(() => {
    return props.latest_reports.filter((report: DiseaseReport) => {
      if (filterRegion !== 'all' && report.region !== filterRegion) {
        return false
      }
      if (filterDisease !== 'all' && report.detected_disease !== filterDisease) {
        return false
      }
      if (filterStatus !== 'all' && report.status !== filterStatus) {
        return false
      }
      return true
    })
  }, [props.latest_reports, filterRegion, filterDisease, filterStatus])

  const reportsToShow = showAll ? filteredReports : filteredReports.slice(0, 10)
  const maxCount = Math.max(1, ...props.reports_last_7_days.map((d) => d.count))
  const maxDiseaseCount = Math.max(1, ...props.disease_breakdown.map((d) => d.count))

  useEffect(() => {
    if (mapRef.current) {
      return
    }

    const map = L.map('mourchid-map').setView([31.7917, -7.0926], 5) as LeafletMap
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    const tiles = L.tileLayer(tileUrl, {
      attribution: attributionText,
    }) as LeafletTileLayer

    tiles.addTo(map)

    const markersLayer = L.layerGroup() as LeafletLayerGroup
    markersLayer.addTo(map)

    const zonesLayer = L.layerGroup() as LeafletLayerGroup
    zonesLayer.addTo(map)

    mapRef.current = map
    markersLayerRef.current = markersLayer
    zonesLayerRef.current = zonesLayer

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markersLayerRef.current = null
      zonesLayerRef.current = null
    }
  }, [attributionText, isDark])

  useEffect(() => {
    if (!zonesLayerRef.current) {
      return
    }

    zonesLayerRef.current.clearLayers()

    props.outbreak_zones.forEach((zone) => {
      const color = outbreakZoneColor(zone.severity)
      const circle = L.circle([zone.centroid_latitude, zone.centroid_longitude], {
        color,
        fillColor: color,
        fillOpacity: 0.15,
        radius: zone.radius_km * 1000,
        weight: 2,
        dashArray: '6 4',
      }) as LeafletCircle

      const popup = `
        <div>
          <div><strong>${t('potential_outbreak')}</strong></div>
          <div>${zone.detected_disease}</div>
          <div>${zone.region}</div>
          <div>${zone.report_count} ${t('reports_clustered')}</div>
          <div>${zone.density_percent}%</div>
        </div>
      `

      circle.bindPopup(popup)
      zonesLayerRef.current?.addLayer(circle)
    })
  }, [props.outbreak_zones, t, lang])

  useEffect(() => {
    if (!markersLayerRef.current) {
      return
    }

    markersLayerRef.current.clearLayers()

    filteredMarkers.forEach((marker) => {
      const color = diseaseColors[marker.detected_disease] ?? '#1a5c38'
      const circle = L.circleMarker([marker.latitude, marker.longitude], {
        color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: 6,
        weight: 1,
      }) as LeafletCircleMarker

      const statusLabel = t(statusToKey(marker.status))
      const popup = `
        <div>
          <div><strong>${marker.report_id.slice(0, 8)}</strong></div>
          <div>${marker.crop_type}</div>
          <div>${marker.detected_disease}</div>
          <div>${marker.region}</div>
          <div>${statusLabel}</div>
        </div>
      `

      circle.bindPopup(popup)
      markersLayerRef.current?.addLayer(circle)
    })
  }, [filteredMarkers, t, lang])

  return (
    <AppLayout onFocusMap={focusMapOnAlert}>
      <OutbreakAlertModal
        alerts={unreadActiveAlerts}
        open={showLoginAlert && unreadActiveAlerts.length > 0}
        onClose={() => setShowLoginAlert(false)}
        onViewMap={() => {
          setShowLoginAlert(false)
          if (unreadActiveAlerts[0]) {
            focusMapOnAlert(unreadActiveAlerts[0])
          }
        }}
      />

      {primaryAlert && (
        <div
          className="mx-4 md:mx-8 mt-5 rounded-2xl border px-4 py-3.5 flex items-start gap-3 rtl:flex-row-reverse"
          style={{
            borderColor: 'color-mix(in srgb, var(--mourchid-accent) 50%, transparent)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--mourchid-accent) 12%, var(--mourchid-surface)), var(--mourchid-surface))',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--mourchid-accent) 25%, transparent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mourchid-accent)" strokeWidth="2">
              <path d="M10.3 3.3 2.6 17.2a2 2 0 0 0 1.8 2.8h15.2a2 2 0 0 0 1.8-2.8L13.7 3.3a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4" />
            </svg>
          </div>
          <div className="rtl:text-right flex-1 min-w-0">
            <p className="text-sm font-semibold">{t('outbreak_risk_title')}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--mourchid-muted)' }}>
              {primaryAlert.detected_disease} · {primaryAlert.region} — {primaryAlert.report_count}{' '}
              {t('reports_clustered')} ({primaryAlert.density_percent}%)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 h-8 text-xs"
            onClick={() => focusMapOnAlert(primaryAlert)}
          >
            {t('view_on_map')}
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 px-4 pt-6 sm:grid-cols-3 md:px-8 mb-6 rtl:text-right">
        <Card>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--mourchid-muted)' }}>{t('reports_today')}</p>
              <p className="text-3xl font-bold tracking-tight">{props.total_reports_today}</p>
            </div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-[#1a5c38]"
            >
              <path d="M8 5h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
              <path d="M9 3h6v4H9z" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--mourchid-muted)' }}>{t('active_outbreaks')}</p>
              <p className="text-3xl font-bold tracking-tight">{props.active_outbreaks}</p>
            </div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-[#c9922a]"
            >
              <path d="M10.3 3.3 2.6 17.2a2 2 0 0 0 1.8 2.8h15.2a2 2 0 0 0 1.8-2.8L13.7 3.3a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--mourchid-muted)' }}>{t('ai_resolution_rate')}</p>
              <p className="text-3xl font-bold tracking-tight">{props.ai_resolution_rate}%</p>
            </div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-[#1a5c38]"
            >
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 px-4 md:px-8 mb-6 sm:flex-row rtl:text-right">
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('all_regions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_regions')}</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDisease} onValueChange={setFilterDisease}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('all_diseases')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_diseases')}</SelectItem>
            {diseases.map((disease) => (
              <SelectItem key={disease} value={disease}>
                {disease}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('all_statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_statuses')}</SelectItem>
            <SelectItem value="OPEN">{t('pending')}</SelectItem>
            <SelectItem value="CLOSED_SUCCESS">{t('resolved')}</SelectItem>
            <SelectItem value="CLOSED_FAILED">{t('escalated')}</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section ref={mapSectionRef} className="px-4 md:px-8 mb-6 rtl:text-right">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 rtl:flex-row-reverse">
              <span>{t('epidemiological_map')}</span>
              {primaryAlert && (
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--mourchid-accent) 15%, transparent)',
                    color: 'var(--mourchid-accent)',
                    borderColor: 'color-mix(in srgb, var(--mourchid-accent) 40%, transparent)',
                  }}
                >
                  1 {t('potential_outbreak')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="mourchid-map" className="w-full h-[300px] md:h-[420px] rounded-lg z-0" />
            <div className="flex flex-wrap gap-4 mt-3">
              {diseases.map((disease) => (
                <div key={disease} className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${diseaseColorClasses[disease]}`}
                  />
                  <span className="text-xs ml-1 rtl:ml-0 rtl:mr-1" style={{ color: 'var(--mourchid-muted)' }}>
                    {disease}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 px-4 md:px-8 mb-6 md:grid-cols-5 rtl:text-right">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>{t('reports_last_7_days')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-52 flex items-end justify-between gap-1 px-1">
              <div
                className="absolute inset-x-0 bottom-7 flex flex-col justify-between h-[calc(100%-1.75rem)] pointer-events-none"
                aria-hidden
              >
                {[0, 1, 2, 3].map((line) => (
                  <div
                    key={line}
                    className="border-t border-dashed w-full"
                    style={{ borderColor: 'var(--mourchid-border)' }}
                  />
                ))}
              </div>
              {props.reports_last_7_days.map((day) => {
                const height = Math.max(8, Math.round((day.count / maxCount) * 140))
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5 group">
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: 'var(--mourchid-primary)' }}
                    >
                      {day.count}
                    </span>
                    <div
                      className="w-full max-w-[2.25rem] rounded-t-lg transition-all duration-300 group-hover:scale-y-105 origin-bottom"
                      style={{
                        height: `${height}px`,
                        background:
                          'linear-gradient(180deg, var(--mourchid-primary), color-mix(in srgb, var(--mourchid-primary) 55%, #000))',
                        boxShadow:
                          '0 4px 14px color-mix(in srgb, var(--mourchid-primary) 35%, transparent)',
                      }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--mourchid-muted)' }}>
                      {day.day_label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('disease')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {props.disease_breakdown.map((item) => {
              const width = Math.round((item.count / maxDiseaseCount) * 100)
              const barColor = diseaseColors[item.disease] ?? 'var(--mourchid-primary)'
              return (
                <div key={item.disease}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 rtl:flex-row-reverse">
                    <p className="text-sm font-medium truncate">{item.disease}</p>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--mourchid-muted)' }}>
                      {item.count}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full h-2.5 overflow-hidden"
                    style={{ backgroundColor: 'var(--mourchid-chart-track)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 70%, white))`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="px-4 md:px-8 mb-10 rtl:text-right">
        <Card>
          <CardHeader>
            <CardTitle>{t('latest_reports')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportCsv(filteredReports, t)}
            >
              {t('export_csv')}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ticket')}</TableHead>
                  <TableHead>{t('time')}</TableHead>
                  <TableHead>{t('region')}</TableHead>
                  <TableHead>{t('crop')}</TableHead>
                  <TableHead>{t('disease')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsToShow.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400">
                      {t('no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  reportsToShow.map((report) => (
                    <TableRow key={report.report_id}>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {report.report_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatTime(report.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{report.region}</TableCell>
                      <TableCell className="text-sm text-gray-700">{report.crop_type}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {report.detected_disease}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClassName(report.status)}>
                          {t(statusToKey(report.status))}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? t('see_less') : t('see_more')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  )
}

export default Dashboard

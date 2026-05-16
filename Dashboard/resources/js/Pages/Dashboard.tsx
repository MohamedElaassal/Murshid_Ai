declare const L: any

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePage } from '@inertiajs/react'

import { AppLayout } from '../Layouts/AppLayout'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useLang } from '../hooks/useLang'
import {
  DashboardProps,
  DiseaseReport,
  MapMarker,
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
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (status === 'CLOSED_FAILED') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
  return 'bg-gray-100 text-gray-600 border-gray-200'
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

const Dashboard = (): JSX.Element => {
  const { props } = usePage<DashboardProps>()
  const { t, lang } = useLang()

  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [filterDisease, setFilterDisease] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAll, setShowAll] = useState<boolean>(false)
  const attributionText = t('openstreetmap_attribution')

  const mapRef = useRef<LeafletMap | null>(null)
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null)

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
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: attributionText,
    }) as LeafletTileLayer

    tiles.addTo(map)

    const layerGroup = L.layerGroup() as LeafletLayerGroup
    layerGroup.addTo(map)

    mapRef.current = map
    markersLayerRef.current = layerGroup

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [attributionText])

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
    <AppLayout>
      <section className="grid grid-cols-1 gap-4 px-4 pt-6 sm:grid-cols-3 md:px-8 mb-6 rtl:text-right">
        <Card>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('reports_today')}</p>
              <p className="text-3xl font-semibold text-[#111827]">{props.total_reports_today}</p>
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
              <p className="text-xs text-gray-500 mb-1">{t('active_outbreaks')}</p>
              <p className="text-3xl font-semibold text-[#111827]">{props.active_outbreaks}</p>
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
              <p className="text-xs text-gray-500 mb-1">{t('ai_resolution_rate')}</p>
              <p className="text-3xl font-semibold text-[#111827]">{props.ai_resolution_rate}%</p>
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

      <section className="px-4 md:px-8 mb-6 rtl:text-right">
        <Card>
          <CardHeader>
            <CardTitle>{t('epidemiological_map')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="mourchid-map" className="w-full h-[300px] md:h-[420px] rounded-lg z-0" />
            <div className="flex flex-wrap gap-4 mt-3">
              {diseases.map((disease) => (
                <div key={disease} className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${diseaseColorClasses[disease]}`}
                  />
                  <span className="text-xs text-gray-600 ml-1 rtl:ml-0 rtl:mr-1">{disease}</span>
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
          <CardContent className="flex items-end justify-around gap-2 h-44">
            {props.reports_last_7_days.map((day) => {
              const height = Math.round((day.count / maxCount) * 160)
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{day.count}</span>
                  <div
                    className="bg-[#1a5c38] rounded-t-sm w-8"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-xs text-gray-500">{day.day_label}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('disease')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {props.disease_breakdown.map((item) => {
              const width = Math.round((item.count / maxDiseaseCount) * 100)
              return (
                <div key={item.disease}>
                  <p className="text-sm text-gray-700 mb-1">{item.disease}</p>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#1a5c38] h-2 rounded-full"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{item.count}</p>
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

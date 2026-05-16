export interface DiseaseReport {
  report_id: string
  telegram_chat_id: string
  crop_type: string
  detected_disease: string
  prescribed_chemical: string
  farmer_feedback: string | null
  status: 'OPEN' | 'CLOSED_SUCCESS' | 'CLOSED_FAILED'
  latitude: number | null
  longitude: number | null
  region: string | null
  created_at: string
  updated_at: string
}

export interface MapMarker {
  report_id: string
  latitude: number
  longitude: number
  detected_disease: string
  crop_type: string
  region: string
  status: 'OPEN' | 'CLOSED_SUCCESS' | 'CLOSED_FAILED'
  ai_confidence: number
}

export interface DiseaseBreakdown {
  disease: string
  count: number
}

export interface DayReport {
  date: string
  day_label: string
  count: number
}

export interface Agronomist {
  id: number
  name: string
  region: string
  phone: string
  email: string
  active_tickets: number
}

export interface DashboardProps {
  total_reports_today: number
  active_outbreaks: number
  ai_resolution_rate: number
  reports_last_7_days: DayReport[]
  latest_reports: DiseaseReport[]
  map_markers: MapMarker[]
  disease_breakdown: DiseaseBreakdown[]
  top_regions: { region: string; count: number }[]
}

export type Lang = 'FR' | 'AR' | 'EN'

export type TranslationKey =
  | 'reports_today' | 'active_outbreaks' | 'ai_resolution_rate'
  | 'epidemiological_map' | 'reports_last_7_days' | 'latest_reports'
  | 'time' | 'region' | 'crop' | 'disease' | 'status' | 'resolved'
  | 'escalated' | 'pending' | 'confidence' | 'ticket' | 'national_dashboard'
  | 'all_regions' | 'all_diseases' | 'all_statuses' | 'export_csv'
  | 'loading' | 'no_data' | 'last_30_days' | 'agronomists' | 'search'
  | 'see_more' | 'see_less' | 'chemical' | 'phone' | 'feedback'
  | 'openstreetmap_attribution'

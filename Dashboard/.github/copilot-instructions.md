You are a senior full-stack engineer. Build me a complete, production-ready MVP of a government agricultural dashboard called Mourchid-AI. The stack is Laravel 12 + React with TypeScript (via Inertia.js) + PostgreSQL + Tailwind CSS + shadcn/ui. Give me every file I need to run this locally. No file should be truncated — every file must be complete and immediately runnable.

PROJECT STRUCTURE — this is mandatory, do not deviate:
mourchid-ai/
├── docker-compose.yml         ← already exists, do not regenerate
├── backend/                   ← Laravel 12 app lives entirely here
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── resources/
│   │   ├── views/
│   │   └── js/
│   │       ├── Pages/
│   │       ├── Layouts/
│   │       ├── hooks/
│   │       ├── types/
│   │       │   └── index.ts
│   │       ├── translations.ts
│   │       └── app.tsx
│   ├── public/
│   ├── .env
│   └── ...
└── README.md
The Laravel backend and the React/TypeScript frontend both live inside the backend/ folder — this is the standard Laravel + Inertia.js monorepo structure where Vite compiles the React frontend and Laravel serves it. There is no separate frontend/ folder at the root. The root only contains docker-compose.yml and README.md alongside the backend/ folder.

DOCKER — do not generate this file, it already exists at the project root:
yamlversion: "3.9"
services:
  db:
    image: postgres:16
    container_name: mourchid_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mourchid_ai
      POSTGRES_USER: mourchid
      POSTGRES_PASSWORD: mourchid_secret
    ports:
      - "5432:5432"
    volumes:
      - mourchid_db_data:/var/lib/postgresql/data
volumes:
  mourchid_db_data:
The .env inside backend/ must use these exact values:
envDB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=mourchid_ai
DB_USERNAME=mourchid
DB_PASSWORD=mourchid_secret

TYPESCRIPT RULES — mandatory for all frontend files:

All React files use .tsx extension, all non-JSX TypeScript files use .ts extension. Zero .js or .jsx files in the frontend.
Define explicit TypeScript interfaces for all props and data shapes in backend/resources/js/types/index.ts.
Required interfaces:

tsexport interface DiseaseReport {
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

useLang hook must be fully typed: lang is Lang, t(key: TranslationKey): string.
No any types anywhere. Use unknown and type guards if needed.


What this app is:
Mourchid-AI is a Moroccan government dashboard for the Ministry of Agriculture (ONCA). Farmers send photos of sick plants via Telegram. An AI backend (built separately by a teammate) identifies the disease and logs every report into the shared PostgreSQL database. This dashboard reads from that same database and visualizes the reports in real-time. Since the AI backend is not ready yet, populate everything with realistic synthetic Moroccan agricultural data using Laravel seeders.

STACK RULES — read before writing a single line:

Tailwind CSS for all styling. Zero inline style={{}} props in React. Zero <style> blocks anywhere. Every class must be a Tailwind utility class.
shadcn/ui for all UI components: use Card, CardContent, CardHeader, CardTitle for KPI cards, Select, SelectTrigger, SelectContent, SelectItem for dropdowns, Badge for status pills, Button for the language toggle, Table, TableHeader, TableRow, TableHead, TableBody, TableCell for the reports table, Separator for dividers.
No Chart.js, no Recharts, no D3. The bar chart and disease leaderboard are built with pure Tailwind div-based layouts.
No Leaflet npm package. Load Leaflet CSS and JS from CDN inside the Laravel Blade file. Access it as window.L inside the React component. Add declare const L: any at the top of any .tsx file that uses Leaflet to satisfy TypeScript.
Responsive: every layout must work on mobile (375px) and desktop (1280px+). Use Tailwind responsive prefixes (sm:, md:, lg:) everywhere. KPI cards: 1 column mobile → 3 columns desktop. Map+chart section: stacked mobile → side-by-side desktop.
shadcn/ui components must be installed properly. Include the exact npx shadcn@latest add commands for every component used.


DATABASE — PostgreSQL:
The reports table is the shared table that both the AI/Telegram backend and this dashboard use. Generate the migration for it inside the Laravel backend. The schema is:
report_id            UUID, primary key, default gen_random_uuid()
telegram_chat_id     VARCHAR(32)       — farmer's Telegram chat ID
crop_type            VARCHAR(128)      — free text, e.g. "bssla", "olive"
detected_disease     VARCHAR(256)      — disease or problem identified
prescribed_chemical  TEXT              — full treatment plan in Darija (TTS-ready text)
farmer_feedback      TEXT, nullable    — farmer reply after treatment: "1" (worked), "2" (failed), or free text
status               VARCHAR(20)       — one of: OPEN, CLOSED_SUCCESS, CLOSED_FAILED
latitude             DECIMAL(9,6), nullable  — from Telegram location sharing
longitude            DECIMAL(9,6), nullable  — from Telegram location sharing
region               VARCHAR(64), nullable   — derived from coordinates
created_at           TIMESTAMPTZ       — when the photo was sent
updated_at           TIMESTAMPTZ       — when feedback was received
Status lifecycle:

Farmer sends photo → OPEN
Farmer replies "1" (worked) → CLOSED_SUCCESS
Farmer replies "2" (failed) → CLOSED_FAILED

Status display mapping in the dashboard UI:

OPEN → badge label from t('pending'), gray badge: bg-gray-100 text-gray-600
CLOSED_SUCCESS → badge label from t('resolved'), green badge: bg-green-100 text-green-800
CLOSED_FAILED → badge label from t('escalated'), gold badge: bg-yellow-100 text-yellow-800

KPI computation logic:

total_reports_today → COUNT(*) WHERE created_at::date = CURRENT_DATE
active_outbreaks → COUNT(DISTINCT detected_disease) WHERE status = 'OPEN' AND created_at >= NOW() - INTERVAL '7 days'
ai_resolution_rate → ROUND( COUNT(*) FILTER (WHERE status = 'CLOSED_SUCCESS') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status IN ('CLOSED_SUCCESS','CLOSED_FAILED')), 0), 1)

Second table — agronomists (dashboard-only, not used by the AI backend):
id               BIGINT, primary key, auto increment
name             VARCHAR — realistic Moroccan Arabic full name
region           VARCHAR
phone            VARCHAR
email            VARCHAR
active_tickets   INTEGER default 0
timestamps

SEEDER — generate 500 fake reports rows and 10 agronomists:
Reports seeder rules:

report_id: Str::uuid()
telegram_chat_id: random string like "21261XXXXXXX" (9 random digits after 21261)
crop_type: one of: Olive, Citrus, Tomate, Blé, Argan, Oignon, Pomme de terre, Amandier
detected_disease: one of: Peacock Spot, Verticillium Wilt, Citrus Greening, Fusarium, Mildiou, Oïdium, Alternaria, Rhizoctonia
prescribed_chemical: a realistic full Darija treatment sentence that matches the disease. Examples:

Peacock Spot → "Dir Copper Oxychloride, 3g l'litre d'lma, trosh koll 15 yum"
Citrus Greening → "Ma kaynch dwa direct, qle3 shajra w 3qqem lmkan"
Mildiou → "Ste3mel Mancozeb 80%, 2.5g l'litre, trosh men luwwel lkhrif"
(write similar realistic sentences for all 8 diseases)


farmer_feedback: 65% = "1", 20% = "2", 15% = null
status: derived from feedback — "1" → CLOSED_SUCCESS, "2" → CLOSED_FAILED, null → OPEN
region and coordinates: assign one of the 10 regions below with matching GPS ranges:

Souss-Massa: lat 29.8–30.8, lng -9.5–-8.0
Meknès: lat 33.6–34.2, lng -5.8–-4.8
Saïss: lat 33.8–34.3, lng -5.5–-4.5
Gharb: lat 34.2–34.9, lng -6.5–-5.5
Haouz: lat 31.4–31.9, lng -8.5–-7.5
Tadla-Azilal: lat 32.2–32.8, lng -6.8–-6.0
Oriental: lat 34.5–35.2, lng -3.0–-1.5
Doukkala-Abda: lat 32.5–33.2, lng -9.0–-8.0
Marrakech-Safi: lat 31.5–32.2, lng -8.2–-7.5
Drâa-Tafilalet: lat 30.5–31.5, lng -5.5–-4.0


created_at: spread across last 30 days, with meaningfully higher volume in last 7 days. Use Carbon::now()->subDays(rand(0,30))->subHours(rand(0,23))  but weight the last 7 days — generate 60% of records with subDays(rand(0,6))
updated_at: if status is not OPEN, set to created_at + random 1 to 48 hours; otherwise same as created_at

Agronomists seeder: 10 rows, one per region, with realistic Moroccan Arabic full names (e.g. "فاطمة الزهراء بنعلي", "محمد أمين الإدريسي"), realistic @onca.gov.ma email addresses, Moroccan phone numbers starting with +21266 or +21261.

BACKEND — Laravel:
One DashboardController@index returning an Inertia response with:

total_reports_today — computed as described above
active_outbreaks — computed as described above
ai_resolution_rate — computed as described above
reports_last_7_days — array of {date, day_label, count} for last 7 days, ordered oldest to newest
latest_reports — last 10 reports, all columns, ordered by created_at desc
map_markers — all reports from last 30 days where latitude IS NOT NULL and longitude IS NOT NULL: report_id, latitude, longitude, detected_disease, crop_type, region, status
disease_breakdown — [{disease, count}] grouped by detected_disease, last 30 days, ordered by count desc
top_regions — [{region, count}] grouped by region, last 30 days, only non-null regions

API route GET /api/reports — paginated JSON response (20 per page), protected by Laravel Sanctum, returning all columns from reports ordered by created_at desc. This is for the AI/Telegram backend teammate to use later.

MULTILINGUAL SYSTEM:
File: backend/resources/js/translations.ts
tsimport { TranslationKey, Lang } from './types'

export const translations: Record<Lang, Record<TranslationKey, string>> = {
  FR: {
    reports_today: "Signalements aujourd'hui",
    active_outbreaks: "Foyers actifs",
    ai_resolution_rate: "Taux de résolution IA",
    epidemiological_map: "Carte épidémiologique",
    reports_last_7_days: "Signalements — 7 derniers jours",
    latest_reports: "Derniers signalements",
    time: "Heure",
    region: "Région",
    crop: "Culture",
    disease: "Maladie",
    status: "Statut",
    resolved: "Résolu",
    escalated: "Escaladé",
    pending: "En attente",
    confidence: "Confiance",
    ticket: "Ticket",
    national_dashboard: "Tableau de bord national",
    all_regions: "Toutes les régions",
    all_diseases: "Toutes les maladies",
    all_statuses: "Tous les statuts",
    export_csv: "Exporter CSV",
    loading: "Chargement...",
    no_data: "Aucune donnée",
    last_30_days: "30 derniers jours",
    agronomists: "Agronomes",
    search: "Rechercher",
    see_more: "Voir plus",
    see_less: "Voir moins",
    chemical: "Traitement",
    phone: "Téléphone",
    feedback: "Retour agriculteur",
  },
  AR: {
    reports_today: "التقارير اليوم",
    active_outbreaks: "البؤر النشطة",
    ai_resolution_rate: "معدل حل الذكاء الاصطناعي",
    epidemiological_map: "الخريطة الوبائية",
    reports_last_7_days: "البلاغات — آخر 7 أيام",
    latest_reports: "آخر البلاغات",
    time: "الوقت",
    region: "المنطقة",
    crop: "المحصول",
    disease: "المرض",
    status: "الحالة",
    resolved: "تم الحل",
    escalated: "تصعيد",
    pending: "قيد الانتظار",
    confidence: "الثقة",
    ticket: "التذكرة",
    national_dashboard: "لوحة القيادة الوطنية",
    all_regions: "كل المناطق",
    all_diseases: "كل الأمراض",
    all_statuses: "كل الحالات",
    export_csv: "تصدير CSV",
    loading: "جارٍ التحميل...",
    no_data: "لا توجد بيانات",
    last_30_days: "آخر 30 يوماً",
    agronomists: "المهندسون الزراعيون",
    search: "بحث",
    see_more: "عرض المزيد",
    see_less: "عرض أقل",
    chemical: "العلاج",
    phone: "الهاتف",
    feedback: "ملاحظات المزارع",
  },
  EN: {
    reports_today: "Reports Today",
    active_outbreaks: "Active Outbreaks",
    ai_resolution_rate: "AI Resolution Rate",
    epidemiological_map: "Epidemiological Map",
    reports_last_7_days: "Reports — Last 7 Days",
    latest_reports: "Latest Reports",
    time: "Time",
    region: "Region",
    crop: "Crop",
    disease: "Disease",
    status: "Status",
    resolved: "Resolved",
    escalated: "Escalated",
    pending: "Pending",
    confidence: "Confidence",
    ticket: "Ticket",
    national_dashboard: "National Dashboard",
    all_regions: "All Regions",
    all_diseases: "All Diseases",
    all_statuses: "All Statuses",
    export_csv: "Export CSV",
    loading: "Loading...",
    no_data: "No data",
    last_30_days: "Last 30 days",
    agronomists: "Agronomists",
    search: "Search",
    see_more: "See more",
    see_less: "See less",
    chemical: "Treatment",
    phone: "Phone",
    feedback: "Farmer Feedback",
  },
}
File: backend/resources/js/hooks/useLang.ts

Reads from localStorage.getItem('mourchid_lang') on init, defaults to 'FR'
Returns { lang, setLang, t } where t(key: TranslationKey): string
When setLang('AR'): sets document.documentElement.dir = 'rtl' and document.documentElement.lang = 'ar'
When setLang('FR') or setLang('EN'): sets document.documentElement.dir = 'ltr'
Persists choice to localStorage on every change
On first render, reads existing localStorage value and applies the correct dir attribute immediately


FRONTEND FILES:
backend/resources/views/app.blade.php — root Blade file, must include in <head>:

Google Fonts: IBM Plex Sans weights 400,600 and IBM Plex Sans Arabic weights 400,600
Leaflet CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
Leaflet JS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js — must load before @vite
@viteReactRefresh and @vite(['resources/css/app.css', 'resources/js/app.tsx'])

backend/resources/js/Layouts/AppLayout.tsx — top navbar, no sidebar:

Full width, white background, px-4 md:px-8 py-3 flex items-center justify-between
Left side: green rounded square w-8 h-8 bg-[#1a5c38] rounded-md + app name t('national_dashboard') in text-[#1a5c38] font-semibold text-base ml-3
Right side: three shadcn Button components for FR / AR / EN. Active: bg-[#1a5c38] text-white hover:bg-[#1a5c38]. Inactive: bg-white text-gray-500 border border-gray-200 hover:bg-gray-50
Below navbar: shadcn <Separator />
Root div font class switches: lang === 'AR' ? "font-['IBM_Plex_Sans_Arabic']" : "font-['IBM_Plex_Sans']"

backend/resources/js/Pages/Dashboard.tsx — main page:
Section 1 — KPI Cards:
grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 px-4 md:px-8 pt-6
Each uses shadcn Card + CardContent. Layout inside: flex items-start justify-between. Left side: label text-xs text-gray-500 mb-1 then value text-3xl font-semibold text-[#111827]. Right side: inline SVG icon, 24×24, green or gold.

Card 1: t('reports_today') / total_reports_today / clipboard SVG in text-[#1a5c38]
Card 2: t('active_outbreaks') / active_outbreaks / warning triangle SVG in text-[#c9922a]
Card 3: t('ai_resolution_rate') / ai_resolution_rate + "%" / checkmark circle SVG in text-[#1a5c38]

Section 2 — Filter Bar:
flex flex-col sm:flex-row gap-3 mb-6 px-4 md:px-8
Three shadcn Select components. Each SelectTrigger: w-full sm:w-52.

Region select: first option value "all" label t('all_regions'), then all 10 Moroccan regions
Disease select: first option value "all" label t('all_diseases'), then all 8 diseases
Status select: first option value "all" label t('all_statuses'), then OPEN / CLOSED_SUCCESS / CLOSED_FAILED with labels from t('pending') / t('resolved') / t('escalated')
Filters stored in React state: filterRegion, filterDisease, filterStatus. Filtering is pure frontend — no server requests.

Section 3 — Map:
Wrapper: px-4 md:px-8 mb-6
Card with title t('epidemiological_map') in CardHeader.
Map div: id="mourchid-map" with class w-full h-[300px] md:h-[420px] rounded-lg z-0
Leaflet setup in useEffect:

Declare declare const L: any at top of file
Use mapRef = useRef<any>(null) and markersLayerRef = useRef<any>(null)
On init: mapRef.current = L.map('mourchid-map').setView([31.7917, -7.0926], 5)
Add OpenStreetMap tiles
Create a L.layerGroup() for markers, store in markersLayerRef
On filter change (separate useEffect depending on filter state): clear markersLayerRef, re-add filtered markers
Cleanup on unmount: mapRef.current?.remove()
Guard against double-init with a check: if (mapRef.current) return
CircleMarker color map:

'Peacock Spot': '#ef4444'
'Verticillium Wilt': '#f97316'
'Citrus Greening': '#eab308'
'Fusarium': '#8b5cf6'
'Mildiou': '#3b82f6'
'Oïdium': '#ec4899'
'Alternaria': '#14b8a6'
'Rhizoctonia': '#6b7280'
Popup HTML string: show report_id (first 8 chars), crop_type, detected_disease, region, status label from translation, all in simple HTML.
Below map: disease legend flex flex-wrap gap-4 mt-3. Each item: colored inline-block w-3 h-3 rounded-full + text-xs text-gray-600 ml-1 disease name.
Section 4 — Charts:
grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 px-4 md:px-8
Left (col-span-3): shadcn Card. CardHeader title: t('reports_last_7_days'). CardContent: flex items-end justify-around gap-2 h-44. For each day in reports_last_7_days:

Outer div: flex flex-col items-center gap-1
Count: text-xs text-gray-400
Bar: bg-[#1a5c38] rounded-t-sm w-8 with style={{ height: ${Math.round((day.count / maxCount) * 160)}px` }}` — this is the only allowed inline style exception for dynamic pixel heights
Day label: text-xs text-gray-500

Right (col-span-2): shadcn Card. CardHeader title: t('disease'). CardContent: space-y-3. For each item in disease_breakdown:

Disease name: text-sm text-gray-700 mb-1
Track: w-full bg-gray-100 rounded-full h-2. Inner fill: bg-[#1a5c38] h-2 rounded-full with style={{ width: ${Math.round((item.count / maxDiseaseCount) * 100)}%` }}` — second and final inline style exception
Count: text-xs text-gray-400 mt-1

Section 5 — Reports Table:
px-4 md:px-8 mb-10
shadcn Card. CardHeader: title t('latest_reports') + a shadcn Button variant outline on the right: t('export_csv') (wire up a simple CSV download of filtered rows using Blob and URL.createObjectURL).
CardContent: shadcn Table.
Columns (all headers from t()): ticket / time / region / crop / disease / status

Ticket: first 8 chars of report_id in text-xs font-mono text-gray-500
Time: format created_at as HH:mm DD/MM using plain JS new Date()
Region: text-sm text-gray-700
Crop: text-sm text-gray-700
Disease: text-sm text-gray-700
Status badge using shadcn Badge with variant="outline" and manual className:

CLOSED_SUCCESS: bg-green-100 text-green-800 border-green-200
CLOSED_FAILED: bg-yellow-100 text-yellow-800 border-yellow-200
OPEN: bg-gray-100 text-gray-600 border-gray-200
Badge text: t('resolved') / t('escalated') / t('pending')
Show 10 rows by default. Below table: shadcn Button variant ghost, full width: shows t('see_more') / t('see_less') and toggles showing all filtered rows.
Table filters react to Section 2 filter state. The filtered array is derived with useMemo.



FILES TO GENERATE — every single one, complete, no truncation:
backend/database/migrations/xxxx_create_reports_table.php
backend/database/migrations/xxxx_create_agronomists_table.php
backend/database/factories/ReportFactory.php
backend/database/factories/AgronomistFactory.php
backend/database/seeders/DatabaseSeeder.php
backend/app/Models/Report.php
backend/app/Models/Agronomist.php
backend/app/Http/Controllers/DashboardController.php
backend/routes/web.php
backend/routes/api.php
backend/resources/js/types/index.ts
backend/resources/js/translations.ts
backend/resources/js/hooks/useLang.ts
backend/resources/js/Layouts/AppLayout.tsx
backend/resources/js/Pages/Dashboard.tsx
backend/resources/views/app.blade.php
backend/tailwind.config.js

After all files, give me the exact terminal commands in order to get this running:
bash# Step 1 — start the database (from project root, docker-compose.yml already exists)
docker compose up -d

# Step 2 — create the Laravel project inside backend/
composer create-project laravel/laravel backend
cd backend

# Step 3 — install PHP dependencies
composer require inertiajs/inertia-laravel
composer require laravel/sanctum

# Step 4 — install JS dependencies
npm install

# Step 5 — install and init shadcn
npx shadcn@latest init
npx shadcn@latest add card select badge button table separator

# Step 6 — environment setup
cp .env.example .env
# manually set DB_CONNECTION=pgsql, DB_HOST=127.0.0.1, DB_PORT=5432,
# DB_DATABASE=mourchid_ai, DB_USERNAME=mourchid, DB_PASSWORD=mourchid_secret
php artisan key:generate

# Step 7 — database
php artisan migrate --seed

# Step 8 — run
npm run dev
php artisan serve

ABSOLUTE HARD RULES — breaking any of these makes the output invalid:

No file is truncated. Every file is 100% complete and copy-pasteable as-is.
Zero inline style={{}} in React except the two explicitly documented exceptions: bar chart height and disease leaderboard fill width — both require runtime JS values that Tailwind cannot compute.
Zero <style> blocks anywhere in the entire codebase.
Zero hardcoded UI strings outside translations.ts.
No any TypeScript types. No .js or .jsx files in the frontend.
Leaflet loaded from CDN only — never from npm. Accessed as window.L with declare const L: any.
The language toggle must switch the entire UI — table headers, badge text, filter labels, bar chart day names, navbar, map popup content — instantly without any page reload.
When Arabic is active, the full layout must switch to RTL using Tailwind's rtl: variants (e.g. rtl:text-right, rtl:flex-row-reverse, rtl:mr-3).
The docker-compose.yml at the project root must not be regenerated or modified.
All seeded data must be specific to Morocco: real Moroccan region names, real crops grown in Morocco, real disease names, realistic Darija treatment sentences, realistic Moroccan phone numbers.
The app must be fully responsive — usable on a 375px mobile screen and a 1440px desktop.
The CSV export button must actually work — clicking it downloads a .csv file of the currently filtered rows using Blob and URL.createObjectURL, no server request needed.

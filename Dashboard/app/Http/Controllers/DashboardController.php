<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $totalReportsToday = Report::whereDate('created_at', Carbon::today())->count();
        $activeOutbreaks = Report::where('status', 'OPEN')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->distinct('detected_disease')
            ->count('detected_disease');

        $resolvedCount = Report::whereIn('status', ['CLOSED_SUCCESS', 'CLOSED_FAILED'])->count();
        $successCount = Report::where('status', 'CLOSED_SUCCESS')->count();
        $aiResolutionRate = $resolvedCount === 0
            ? 0
            : round(($successCount * 100) / $resolvedCount, 1);

        $start = Carbon::now()->subDays(6)->startOfDay();
        $end = Carbon::now()->endOfDay();
        $counts = Report::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('date')
            ->pluck('count', 'date');

        $reportsLast7Days = [];
        for ($i = 0; $i < 7; $i += 1) {
            $date = (clone $start)->addDays($i);
            $dateKey = $date->toDateString();

            $reportsLast7Days[] = [
                'date' => $dateKey,
                'day_label' => $date->format('d/m'),
                'count' => (int) ($counts[$dateKey] ?? 0),
            ];
        }

        $latestReports = Report::orderByDesc('created_at')->limit(10)->get();

        $mapMarkers = Report::where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select([
                'report_id',
                'latitude',
                'longitude',
                'detected_disease',
                'crop_type',
                'region',
                'status',
            ])
            ->selectRaw('75.0 as ai_confidence')
            ->get();

        $diseaseBreakdown = Report::where('created_at', '>=', Carbon::now()->subDays(30))
            ->selectRaw('detected_disease as disease, COUNT(*) as count')
            ->groupBy('detected_disease')
            ->orderByDesc('count')
            ->get();

        $topRegions = Report::where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('region')
            ->selectRaw('region, COUNT(*) as count')
            ->groupBy('region')
            ->orderByDesc('count')
            ->get();

        return Inertia::render('Dashboard', [
            'total_reports_today' => $totalReportsToday,
            'active_outbreaks' => $activeOutbreaks,
            'ai_resolution_rate' => $aiResolutionRate,
            'reports_last_7_days' => $reportsLast7Days,
            'latest_reports' => $latestReports,
            'map_markers' => $mapMarkers,
            'disease_breakdown' => $diseaseBreakdown,
            'top_regions' => $topRegions,
        ]);
    }
}

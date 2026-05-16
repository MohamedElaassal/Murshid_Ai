<?php

namespace App\Services;

use App\Models\OutbreakAlert;
use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class OutbreakDetector
{
    public function scan(): int
    {
        $config = config('mourchid.outbreak');
        $lookbackDays = (int) $config['lookback_days'];
        $minReports = (int) $config['min_reports'];
        $radiusKm = (float) $config['radius_km'];

        $reports = Report::query()
            ->where('created_at', '>=', Carbon::now()->subDays($lookbackDays))
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get(['report_id', 'detected_disease', 'crop_type', 'region', 'latitude', 'longitude', 'created_at']);

        $clusters = $this->findClusters($reports, $minReports, $radiusKm);
        $activeIds = [];

        foreach ($clusters as $cluster) {
            $alert = $this->upsertAlert($cluster, $radiusKm, $config['severity']);
            $activeIds[] = $alert->id;
        }

        OutbreakAlert::query()
            ->where('status', 'active')
            ->whereNotIn('id', $activeIds)
            ->update(['status' => 'resolved', 'updated_at' => now()]);

        return count($activeIds);
    }

    /**
     * @param  Collection<int, Report>  $reports
     * @return array<int, array<string, mixed>>
     */
    private function findClusters(Collection $reports, int $minReports, float $radiusKm): array
    {
        $clusters = [];

        foreach ($reports->groupBy('detected_disease') as $disease => $diseaseReports) {
            $visited = [];

            foreach ($diseaseReports as $seed) {
                if (isset($visited[$seed->report_id])) {
                    continue;
                }

                $members = $diseaseReports->filter(function (Report $report) use ($seed, $radiusKm, &$visited) {
                    if (isset($visited[$report->report_id])) {
                        return false;
                    }

                    return $this->distanceKm(
                        (float) $seed->latitude,
                        (float) $seed->longitude,
                        (float) $report->latitude,
                        (float) $report->longitude,
                    ) <= $radiusKm;
                })->values();

                if ($members->count() < $minReports) {
                    continue;
                }

                foreach ($members as $member) {
                    $visited[$member->report_id] = true;
                }

                $regionCounts = $members->countBy('region');
                $primaryRegion = $regionCounts->sortDesc()->keys()->first();
                $regionTotal = Report::query()
                    ->where('region', $primaryRegion)
                    ->where('created_at', '>=', Carbon::now()->subDays((int) config('mourchid.outbreak.lookback_days')))
                    ->count();

                $densityPercent = $regionTotal > 0
                    ? round(($members->count() / $regionTotal) * 100, 1)
                    : 0.0;

                $clusters[] = [
                    'detected_disease' => $disease,
                    'region' => $primaryRegion,
                    'crop_type' => $members->countBy('crop_type')->sortDesc()->keys()->first(),
                    'centroid_latitude' => round($members->avg('latitude'), 6),
                    'centroid_longitude' => round($members->avg('longitude'), 6),
                    'report_count' => $members->count(),
                    'density_percent' => $densityPercent,
                    'report_ids' => $members->pluck('report_id')->all(),
                ];
            }
        }

        return $clusters;
    }

    /**
     * @param  array<string, mixed>  $cluster
     * @param  array<string, int>  $severityThresholds
     */
    private function upsertAlert(array $cluster, float $radiusKm, array $severityThresholds): OutbreakAlert
    {
        $severity = 'low';
        if ($cluster['report_count'] >= $severityThresholds['high']) {
            $severity = 'high';
        } elseif ($cluster['report_count'] >= $severityThresholds['medium']) {
            $severity = 'medium';
        }

        $message = sprintf(
            'Potential outbreak: %d nearby reports of %s in %s (%.1f%% of regional cases in %d days).',
            $cluster['report_count'],
            $cluster['detected_disease'],
            $cluster['region'] ?? 'unknown region',
            $cluster['density_percent'],
            config('mourchid.outbreak.lookback_days'),
        );

        $existing = OutbreakAlert::query()
            ->where('status', 'active')
            ->where('detected_disease', $cluster['detected_disease'])
            ->where('region', $cluster['region'])
            ->whereBetween('centroid_latitude', [$cluster['centroid_latitude'] - 0.15, $cluster['centroid_latitude'] + 0.15])
            ->whereBetween('centroid_longitude', [$cluster['centroid_longitude'] - 0.15, $cluster['centroid_longitude'] + 0.15])
            ->first();

        if ($existing) {
            $existing->update([
                'crop_type' => $cluster['crop_type'],
                'centroid_latitude' => $cluster['centroid_latitude'],
                'centroid_longitude' => $cluster['centroid_longitude'],
                'radius_km' => $radiusKm,
                'report_count' => $cluster['report_count'],
                'density_percent' => $cluster['density_percent'],
                'severity' => $severity,
                'message' => $message,
                'report_ids' => $cluster['report_ids'],
            ]);

            return $existing->fresh();
        }

        return OutbreakAlert::create([
            'id' => (string) Str::uuid(),
            'detected_disease' => $cluster['detected_disease'],
            'region' => $cluster['region'],
            'crop_type' => $cluster['crop_type'],
            'centroid_latitude' => $cluster['centroid_latitude'],
            'centroid_longitude' => $cluster['centroid_longitude'],
            'radius_km' => $radiusKm,
            'report_count' => $cluster['report_count'],
            'density_percent' => $cluster['density_percent'],
            'severity' => $severity,
            'message' => $message,
            'report_ids' => $cluster['report_ids'],
            'status' => 'active',
        ]);
    }

    private function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }
}

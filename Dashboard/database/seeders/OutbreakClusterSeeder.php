<?php

namespace Database\Seeders;

use App\Models\OutbreakAlert;
use App\Models\Report;
use App\Services\OutbreakDetector;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OutbreakClusterSeeder extends Seeder
{
    public function run(): void
    {
        OutbreakAlert::query()->delete();

        $cluster = [
            'region' => 'Haouz',
            'crop' => 'Olive',
            'disease' => 'Peacock Spot',
            'chemical' => "Dir Copper Oxychloride, 3g l'litre d'lma, trosh koll 15 yum",
            'center' => ['lat' => 31.652, 'lng' => -7.985],
            'count' => 6,
        ];

        for ($i = 0; $i < $cluster['count']; $i += 1) {
            $createdAt = Carbon::now()
                ->subDays(random_int(0, 3))
                ->subHours(random_int(0, 8));

            Report::create([
                'report_id' => (string) Str::uuid(),
                'telegram_chat_id' => '21261'.random_int(100000000, 999999999),
                'crop_type' => $cluster['crop'],
                'detected_disease' => $cluster['disease'],
                'prescribed_chemical' => $cluster['chemical'],
                'farmer_feedback' => null,
                'status' => 'OPEN',
                'latitude' => $cluster['center']['lat'] + (mt_rand(-200, 200) / 10000),
                'longitude' => $cluster['center']['lng'] + (mt_rand(-200, 200) / 10000),
                'region' => $cluster['region'],
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        app(OutbreakDetector::class)->scan();

        $primary = OutbreakAlert::query()->orderByDesc('report_count')->first();
        if ($primary) {
            OutbreakAlert::query()->where('id', '!=', $primary->id)->delete();
        }
    }
}

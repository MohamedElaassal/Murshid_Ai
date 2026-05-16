<?php

namespace Database\Factories;

use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Report> */
class ReportFactory extends Factory
{
    public function definition(): array
    {
        $regions = [
            ['name' => 'Souss-Massa', 'lat' => [29.8, 30.8], 'lng' => [-9.5, -8.0]],
            ['name' => 'Meknès', 'lat' => [33.6, 34.2], 'lng' => [-5.8, -4.8]],
            ['name' => 'Saïss', 'lat' => [33.8, 34.3], 'lng' => [-5.5, -4.5]],
            ['name' => 'Gharb', 'lat' => [34.2, 34.9], 'lng' => [-6.5, -5.5]],
            ['name' => 'Haouz', 'lat' => [31.4, 31.9], 'lng' => [-8.5, -7.5]],
            ['name' => 'Tadla-Azilal', 'lat' => [32.2, 32.8], 'lng' => [-6.8, -6.0]],
            ['name' => 'Oriental', 'lat' => [34.5, 35.2], 'lng' => [-3.0, -1.5]],
            ['name' => 'Doukkala-Abda', 'lat' => [32.5, 33.2], 'lng' => [-9.0, -8.0]],
            ['name' => 'Marrakech-Safi', 'lat' => [31.5, 32.2], 'lng' => [-8.2, -7.5]],
            ['name' => 'Drâa-Tafilalet', 'lat' => [30.5, 31.5], 'lng' => [-5.5, -4.0]],
        ];

        $crops = ['Olive', 'Citrus', 'Tomate', 'Blé', 'Argan', 'Oignon', 'Pomme de terre', 'Amandier'];
        $diseases = [
            'Peacock Spot',
            'Verticillium Wilt',
            'Citrus Greening',
            'Fusarium',
            'Mildiou',
            'Oïdium',
            'Alternaria',
            'Rhizoctonia',
        ];
        $chemicalMap = [
            'Peacock Spot' => "Dir Copper Oxychloride, 3g l'litre d'lma, trosh koll 15 yum",
            'Verticillium Wilt' => "Qle3 l3rou9 lmsakha, ste3mel Trichoderma f turba w n9e9",
            'Citrus Greening' => "Ma kaynch dwa direct, qle3 shajra w 3qqem lmkan",
            'Fusarium' => "Sterilizi turba b'lw9t w ste3mel fungicide systemic 2 mrat",
            'Mildiou' => "Ste3mel Mancozeb 80%, 2.5g l'litre, trosh men luwwel lkhrif",
            'Oïdium' => "Trosh sulfur mou3allaq, 2g l'litre, w 3awed b3d 10 iyam",
            'Alternaria' => "Khfef rtooba, w ste3mel Azoxystrobin 0.75ml l'litre",
            'Rhizoctonia' => "Nqess s9i, w zed Trichoderma, w b3d trosh fungicide",
        ];

        $regionData = $regions[array_rand($regions)];
        $disease = $diseases[array_rand($diseases)];

        $feedbackRoll = $this->faker->numberBetween(1, 100);
        $farmerFeedback = $feedbackRoll <= 65 ? '1' : ($feedbackRoll <= 85 ? '2' : null);
        $status = $farmerFeedback === '1'
            ? 'CLOSED_SUCCESS'
            : ($farmerFeedback === '2' ? 'CLOSED_FAILED' : 'OPEN');

        $recentRoll = $this->faker->numberBetween(1, 100);
        $daysBack = $recentRoll <= 60
            ? $this->faker->numberBetween(0, 6)
            : $this->faker->numberBetween(7, 30);

        $createdAt = Carbon::now()
            ->subDays($daysBack)
            ->subHours($this->faker->numberBetween(0, 23))
            ->subMinutes($this->faker->numberBetween(0, 59));

        $updatedAt = $status === 'OPEN'
            ? $createdAt
            : (clone $createdAt)->addHours($this->faker->numberBetween(1, 48));

        return [
            'report_id' => (string) Str::uuid(),
            'telegram_chat_id' => '21261'.$this->faker->numerify('#########'),
            'crop_type' => $crops[array_rand($crops)],
            'detected_disease' => $disease,
            'prescribed_chemical' => $chemicalMap[$disease],
            'farmer_feedback' => $farmerFeedback,
            'status' => $status,
            'latitude' => $this->faker->randomFloat(6, $regionData['lat'][0], $regionData['lat'][1]),
            'longitude' => $this->faker->randomFloat(6, $regionData['lng'][0], $regionData['lng'][1]),
            'region' => $regionData['name'],
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];
    }
}

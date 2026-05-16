<?php

namespace Database\Seeders;

use App\Models\Agronomist;
use App\Models\Report;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Report::factory()->count(120)->create();

        $agronomists = [
            ['name' => 'فاطمة الزهراء بنعلي', 'region' => 'Souss-Massa', 'phone' => '+212661234567', 'email' => 'fatima.benali@onca.gov.ma', 'active_tickets' => 7],
            ['name' => 'محمد أمين الإدريسي', 'region' => 'Meknès', 'phone' => '+212612345678', 'email' => 'mohamed.idrissi@onca.gov.ma', 'active_tickets' => 4],
            ['name' => 'هند الكتاني', 'region' => 'Saïss', 'phone' => '+212661112233', 'email' => 'hind.kettani@onca.gov.ma', 'active_tickets' => 5],
            ['name' => 'ياسين الزرهوني', 'region' => 'Gharb', 'phone' => '+212612223344', 'email' => 'yassine.zarhouni@onca.gov.ma', 'active_tickets' => 3],
            ['name' => 'سناء الوديع', 'region' => 'Haouz', 'phone' => '+212661998877', 'email' => 'sanaa.elwadia@onca.gov.ma', 'active_tickets' => 6],
            ['name' => 'أسماء السلاوي', 'region' => 'Tadla-Azilal', 'phone' => '+212612889900', 'email' => 'asmaa.slaoui@onca.gov.ma', 'active_tickets' => 2],
            ['name' => 'يوسف الفاسي', 'region' => 'Oriental', 'phone' => '+212661556677', 'email' => 'youssef.fassi@onca.gov.ma', 'active_tickets' => 4],
            ['name' => 'نادية اليوسفي', 'region' => 'Doukkala-Abda', 'phone' => '+212612334455', 'email' => 'nadia.elyousfi@onca.gov.ma', 'active_tickets' => 5],
            ['name' => 'ربيع الصقلي', 'region' => 'Marrakech-Safi', 'phone' => '+212661778899', 'email' => 'rabii.sqli@onca.gov.ma', 'active_tickets' => 6],
            ['name' => 'خديجة المرابط', 'region' => 'Drâa-Tafilalet', 'phone' => '+212612556677', 'email' => 'khadija.morabite@onca.gov.ma', 'active_tickets' => 4],
        ];

        foreach ($agronomists as $agronomist) {
            Agronomist::create($agronomist);
        }

        $this->call(OutbreakClusterSeeder::class);
    }
}

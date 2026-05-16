<?php

namespace Database\Factories;

use App\Models\Agronomist;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Agronomist> */
class AgronomistFactory extends Factory
{
    public function definition(): array
    {
        $regions = [
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
        ];

        $phonePrefix = $this->faker->randomElement(['+21266', '+21261']);

        return [
            'name' => $this->faker->name(),
            'region' => $this->faker->randomElement($regions),
            'phone' => $phonePrefix.$this->faker->numerify('######'),
            'email' => $this->faker->unique()->userName().'@onca.gov.ma',
            'active_tickets' => $this->faker->numberBetween(0, 18),
        ];
    }
}

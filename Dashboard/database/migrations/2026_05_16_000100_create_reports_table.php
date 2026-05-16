<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        Schema::create('reports', function (Blueprint $table) {
            $table->uuid('report_id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('telegram_chat_id', 32);
            $table->string('crop_type', 128);
            $table->string('detected_disease', 256);
            $table->text('prescribed_chemical');
            $table->text('farmer_feedback')->nullable();
            $table->string('status', 20);
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->string('region', 64)->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};

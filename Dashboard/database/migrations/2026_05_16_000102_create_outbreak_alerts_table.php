<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbreak_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('detected_disease', 256);
            $table->string('region', 64)->nullable();
            $table->string('crop_type', 128)->nullable();
            $table->decimal('centroid_latitude', 10, 6);
            $table->decimal('centroid_longitude', 10, 6);
            $table->decimal('radius_km', 6, 2)->default(20);
            $table->unsignedInteger('report_count');
            $table->decimal('density_percent', 5, 2)->default(0);
            $table->string('severity', 16)->default('low');
            $table->text('message');
            $table->json('report_ids')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('detected_disease');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbreak_alerts');
    }
};

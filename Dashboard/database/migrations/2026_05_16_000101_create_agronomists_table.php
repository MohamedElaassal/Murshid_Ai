<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agronomists', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('region');
            $table->string('phone');
            $table->string('email');
            $table->unsignedInteger('active_tickets')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agronomists');
    }
};

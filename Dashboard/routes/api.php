<?php

use Illuminate\Support\Facades\Route;
use App\Models\Report;

Route::middleware('auth:sanctum')->get('/reports', function () {
    return Report::orderByDesc('created_at')->paginate(20);
});

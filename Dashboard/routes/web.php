<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OutbreakAlertController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;

Route::get('/', function () {
    return view('login');
})->name('login');

Route::post('/login', function () {
    $credentials = request()->only(['username', 'password']);

    if ($credentials['username'] === 'admin' && $credentials['password'] === 'admin') {
        Session::put('is_admin', true);
        Session::flash('show_outbreak_alerts', true);

        return redirect('/app');
    }

    return back()->withErrors([
        'login' => 'Invalid credentials.',
    ])->withInput();
})->name('login.submit');

Route::middleware('admin.session')->group(function () {
    Route::get('/app', [DashboardController::class, 'index'])->name('app');
    Route::post('/app/alerts/{id}/read', [OutbreakAlertController::class, 'markRead'])->name('alerts.read');
    Route::post('/app/alerts/read-all', [OutbreakAlertController::class, 'markAllRead'])->name('alerts.read-all');
});

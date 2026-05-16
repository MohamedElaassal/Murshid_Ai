<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;

Route::get('/', function () {
    return view('login');
})->name('login');

Route::post('/login', function () {
    $credentials = request()->only(['username', 'password']);

    if ($credentials['username'] === 'admin' && $credentials['password'] === 'admin') {
        Session::put('is_admin', true);

        return redirect('/app');
    }

    return back()->withErrors([
        'login' => 'Invalid credentials.',
    ])->withInput();
})->name('login.submit');

Route::get('/app', function () {
    if (!Session::get('is_admin')) {
        return redirect('/');
    }

    return view('app');
})->name('app');

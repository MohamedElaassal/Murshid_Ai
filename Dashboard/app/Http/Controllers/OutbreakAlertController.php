<?php

namespace App\Http\Controllers;

use App\Models\OutbreakAlert;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OutbreakAlertController extends Controller
{
    public function markRead(Request $request, string $id): RedirectResponse
    {
        OutbreakAlert::query()
            ->where('id', $id)
            ->update(['read_at' => now()]);

        return back();
    }

    public function markAllRead(): RedirectResponse
    {
        OutbreakAlert::query()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }
}

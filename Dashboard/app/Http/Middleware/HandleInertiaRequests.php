<?php

namespace App\Http\Middleware;

use App\Models\OutbreakAlert;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $isAdmin = $request->session()->get('is_admin', false);

        return array_merge(parent::share($request), [
            'show_outbreak_modal' => (bool) $request->session()->pull('show_outbreak_alerts', false),
            'outbreak_alerts' => $isAdmin
                ? OutbreakAlert::query()->orderByDesc('created_at')->limit(20)->get()
                : [],
            'unread_alert_count' => $isAdmin
                ? OutbreakAlert::query()->whereNull('read_at')->where('status', 'active')->count()
                : 0,
        ]);
    }
}

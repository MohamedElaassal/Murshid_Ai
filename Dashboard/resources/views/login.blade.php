<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Login — Mourchid-AI</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap"
        rel="stylesheet"
    >

    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-[#f7f6f3] font-['IBM_Plex_Sans'] text-slate-900 antialiased">
    <div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div class="w-full max-w-md">
            <div class="mb-8 flex flex-col items-center text-center">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a5c38] shadow-sm">
                    <svg
                        class="h-7 w-7 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        aria-hidden="true"
                    >
                        <path d="M12 3c-4.5 2.2-7.5 6.5-7.5 11.2 0 3.1 2.4 5.5 5.5 5.5s5.5-2.4 5.5-5.5C15.5 9.5 12.5 5.2 12 3z" />
                        <path d="M12 14v7" />
                        <path d="M8 18h8" />
                    </svg>
                </div>
                <h1 class="text-2xl font-semibold tracking-tight text-[#1a5c38]">Mourchid-AI</h1>
                <p class="mt-1 text-sm text-gray-500">National Agricultural Disease Dashboard</p>
            </div>

            <div class="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
                <h2 class="mb-1 text-lg font-semibold text-gray-900">Admin sign in</h2>
                <p class="mb-6 text-sm text-gray-500">Enter your credentials to access the dashboard.</p>

                @if ($errors->has('login'))
                    <div
                        class="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        role="alert"
                    >
                        <svg
                            class="mt-0.5 h-4 w-4 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                        </svg>
                        <span>{{ $errors->first('login') }}</span>
                    </div>
                @endif

                <form method="POST" action="{{ route('login.submit') }}" class="space-y-5">
                    @csrf

                    <div>
                        <label for="username" class="mb-1.5 block text-sm font-medium text-gray-700">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value="{{ old('username') }}"
                            required
                            autofocus
                            autocomplete="username"
                            placeholder="admin"
                            class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/20"
                        >
                    </div>

                    <div>
                        <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autocomplete="current-password"
                            placeholder="••••••••"
                            class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/20"
                        >
                    </div>

                    <button
                        type="submit"
                        class="w-full rounded-lg bg-[#1a5c38] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#154a2d] focus:outline-none focus:ring-2 focus:ring-[#1a5c38]/40 focus:ring-offset-2 active:bg-[#123d26]"
                    >
                        Sign in
                    </button>
                </form>
            </div>

            <p class="mt-6 text-center text-xs text-gray-400">
                ONCA — Office National de Sécurité Sanitaire des Produits Alimentaires
            </p>
        </div>
    </div>
</body>
</html>

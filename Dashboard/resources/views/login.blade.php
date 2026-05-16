<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Login</title>
</head>
<body>
    <main>
        <h1>Admin Login</h1>

        @if ($errors->has('login'))
            <p>{{ $errors->first('login') }}</p>
        @endif

        <form method="POST" action="{{ route('login.submit') }}">
            @csrf

            <div>
                <label for="username">Username</label>
                <input id="username" name="username" type="text" value="{{ old('username') }}" required>
            </div>

            <div>
                <label for="password">Password</label>
                <input id="password" name="password" type="password" required>
            </div>

            <button type="submit">Login</button>
        </form>
    </main>
</body>
</html>

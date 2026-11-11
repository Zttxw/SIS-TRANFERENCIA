<?php

declare(strict_types=1);

return [
    'client_id' => env('FIRMAPERU_CLIENT_ID'),
    'client_secret' => env('FIRMAPERU_CLIENT_SECRET'),
    'token_url' => env('FIRMAPERU_TOKEN_URL'),
    'public_url' => env('FIRMAPERU_PUBLIC_URL', env('APP_URL')),
    'session_minutes' => (int) env('FIRMAPERU_SESSION_MINUTES', 15),
];

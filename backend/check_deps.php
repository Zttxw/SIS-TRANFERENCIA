<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = \App\Models\User::find(44);
auth()->setUser($user);
$req = Illuminate\Http\Request::create('/api/dependencias?all=true&solo_activas=true', 'GET', ['all' => true, 'solo_activas' => true]);
$req->setUserResolver(fn() => $user);
$res = app()->make(\App\Modules\Organization\Controllers\DependenciaController::class)->index($req);
$data = json_decode($res->getContent(), true)['data'];
echo "Total dependencias returned: " . count($data) . "\n";
$found = array_filter($data, fn($d) => $d['id'] == 49 || str_contains($d['nombre'], 'CONCEJO'));
echo "Concejo in data: " . json_encode($found) . "\n";
$alcaldia = array_filter($data, fn($d) => $d['id'] == 155);
echo "Alcaldia in data: " . json_encode($alcaldia) . "\n";


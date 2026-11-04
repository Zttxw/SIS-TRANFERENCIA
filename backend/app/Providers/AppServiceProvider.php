<?php

declare(strict_types=1);

namespace App\Providers;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\Siga\SigaPatrimonioConnector;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SigaConnectorInterface::class, SigaPatrimonioConnector::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

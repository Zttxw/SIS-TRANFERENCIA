#!/bin/sh
set -eu

signature="$(sha256sum composer.json composer.lock)"
marker=vendor/.dependency-inputs

if [ -f vendor/autoload.php ] && [ -f "$marker" ] && [ "$(cat "$marker")" = "$signature" ]; then
    exit 0
fi

COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --prefer-dist --no-progress
chown -R www-data:www-data vendor
printf '%s\n' "$signature" > "$marker"

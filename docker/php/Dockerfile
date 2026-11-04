FROM php:8.4-fpm-alpine

# Dependencias del sistema
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    libxml2-dev \
    curl \
    git \
    unzip \
    unixodbc-dev

# Microsoft ODBC Driver 17 for SQL Server
RUN curl -O https://download.microsoft.com/download/607ebe2c-e17c-4c34-b367-10a75b83bef9/msodbcsql17_17.11.1.1-1_amd64.apk \
    && apk add --allow-untrusted msodbcsql17_17.11.1.1-1_amd64.apk \
    && rm -f msodbcsql17_17.11.1.1-1_amd64.apk

# Extensiones de PHP
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        pgsql \
        zip \
        gd \
        intl \
        mbstring \
        xml \
        bcmath \
        opcache \
    && apk add --no-cache --virtual .build-deps autoconf g++ make \
    && pecl install sqlsrv pdo_sqlsrv \
    && docker-php-ext-enable sqlsrv pdo_sqlsrv \
    && apk del .build-deps

# Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

USER www-data

EXPOSE 9000

CMD ["php-fpm"]

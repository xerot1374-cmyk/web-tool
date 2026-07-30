# Company Handoff

## Recommended ownership model

Use a company-owned GitHub repository and deploy the app from that repository to a company-owned hosting account.

This project is a Next.js app that also uses:

- PostgreSQL through Prisma
- `ffmpeg` for video generation
- `puppeteer` for browser rendering

Because of the `ffmpeg` and `puppeteer` runtime requirements, the safest production setup is a container deployment instead of a basic serverless deployment.

## Recommended hosting

Deploy the `Dockerfile` in one of these company-owned platforms:

- Railway
- Render
- Azure App Service for Containers
- AWS ECS / App Runner
- Google Cloud Run

## Required company assets

The company should own:

- The GitHub repository
- The hosting account
- The PostgreSQL database
- The production environment variables
- The application URL / domain

## Required environment variables

Create these values in the hosting platform:

- `DATABASE_URL`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`

Use [.env.example](/C:/Users/Sh74ahrzad/PycharmProjects/web-tool/tool/.env.example) as the template.

## Deployment flow

1. Create a company GitHub repository.
2. Push this codebase to that repository.
3. Create a PostgreSQL database owned by the company.
4. Deploy the repository using the included `Dockerfile`.
5. Set `DATABASE_URL` in the hosting platform.
6. Run Prisma migrations in the company environment:

```bash
npx prisma migrate deploy
```

7. Point the company domain to the deployed service.

## Access handoff

The company should add team access to:

- GitHub repository
- Hosting platform
- Database provider
- Domain / DNS provider

Do not share your personal `.env` file directly in chat or source control. Move those values into the company password manager or deployment secret store.


## Server .env Configuration


This document applies to the current production-style deployment defined in
`docker-compose.yml`.

The Test server and Production server must each have their own `.env` file in
the repository root, beside `docker-compose.yml`.

Do not commit either `.env` file to GitHub. The company must store the real
passwords in its password manager or secret store.

## Test server

Copy the following block into `.env` on the Test server:

```dotenv
APP_PORT=3100

POSTGRES_USER=web_tool_test
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_TEST_PASSWORD
POSTGRES_DB=web_tool_test

POSTGRES_VOLUME=web-tool-test-postgres-data
UPLOADS_VOLUME=web-tool-test-uploads-data

FINAL_VIDEO_MAX_DURATION_SECONDS=480
NEXT_PROXY_CLIENT_MAX_BODY_SIZE=100mb
VIDEO_UPLOAD_MAX_BYTES=104857600
NEXT_PUBLIC_VIDEO_UPLOAD_MAX_BYTES=104857600
```

Before starting the Test deployment, replace:

```text
REPLACE_WITH_A_LONG_RANDOM_TEST_PASSWORD
```

with a strong password created and owned by the company. Because the current
Compose file inserts this value directly into a PostgreSQL connection URL, use
a long random password containing letters and numbers.

## Production server

Copy the following block into `.env` on the Production server:

```dotenv
APP_PORT=3100

POSTGRES_USER=web_tool_production
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_PRODUCTION_PASSWORD
POSTGRES_DB=web_tool_production

POSTGRES_VOLUME=web-tool-production-postgres-data
UPLOADS_VOLUME=web-tool-production-uploads-data

FINAL_VIDEO_MAX_DURATION_SECONDS=480
NEXT_PROXY_CLIENT_MAX_BODY_SIZE=100mb
VIDEO_UPLOAD_MAX_BYTES=104857600
NEXT_PUBLIC_VIDEO_UPLOAD_MAX_BYTES=104857600
```

Before starting the Production deployment, replace:

```text
REPLACE_WITH_A_LONG_RANDOM_PRODUCTION_PASSWORD
```

with a different strong password created and owned by the company. Do not reuse
the Test database password.

If port `3100` is already occupied or the company's server configuration
requires another application port, the company must replace `APP_PORT=3100`
with the assigned port.

## What Docker Compose derives automatically

The company should not add `DATABASE_URL` for this deployment method.
`docker-compose.yml` constructs it automatically from:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

The application connects to the PostgreSQL container through the internal
Compose hostname `db`.

The company should also not add the following paths because the Docker image
and Compose file already provide them:

```dotenv
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

## Starting the deployment

After the correct `.env` file exists on the relevant server, run from the
repository root:

```bash
docker compose up --build -d
```

The current Compose configuration then:

1. Starts PostgreSQL.
2. Waits for the database health check to pass.
3. Runs the checked-in Prisma migrations.
4. Builds and starts the production Next.js application.
5. Preserves database data and uploaded files in the named volumes configured
   above.

## Variables not activated by the current Compose file

The application source supports SMTP email settings, email verification timing,
and an optional OpenAI API key. However, the current `docker-compose.yml` does
not pass those variables into the application container.

Adding them only to the server `.env` file would therefore not activate them in
the current Compose deployment. They are intentionally not included in the
copyable blocks above.

## If the company is not using `docker-compose.yml`

These templates are specifically for the included production-style Compose
stack. If the company deploys only the Dockerfile through Railway, Render,
Azure, AWS, Google Cloud, or another container platform, it must provide a
platform-managed `DATABASE_URL` for a separately provisioned PostgreSQL
database. The repository does not contain a provider-specific environment
template for that deployment path.


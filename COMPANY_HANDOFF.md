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

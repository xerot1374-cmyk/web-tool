This is a [Next.js](https://nextjs.org) project for the social media tool.

## Getting Started

### Local development with Docker Compose

```bash
docker compose up --build
```

Open [http://localhost:3100](http://localhost:3100) once the app container is running.

The compose stack starts Postgres, runs Prisma migrations, and then launches the app. Runtime uploads are stored in the `UPLOADS_VOLUME` Docker volume so uploaded profile images and media survive app container recreation.

To stop it:

```bash
docker compose down
```

### Local development without Docker

```bash
cp .env.example .env
npm install
npm run dev
```

If you already have a local Postgres instance running on `localhost:5432`, the default `.env.example` values work as-is.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

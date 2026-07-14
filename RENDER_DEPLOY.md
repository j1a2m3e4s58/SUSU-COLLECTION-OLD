# Render Deployment

The Render Blueprint deploys one Flask web service and one managed PostgreSQL database. Vite is built into `mail-api/public`, so the frontend and `/api/*` use the same HTTPS origin.

## Deploy

1. Push `main` to GitHub.
2. Open [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fj1a2m3e4s58%2FSUSU-COLLECTION-OLD).
3. Select `j1a2m3e4s58/SUSU-COLLECTION-OLD`, branch `main`, and create the Blueprint.
4. Enter the three secret values below when Render prompts you.

```txt
PORTAL_PUBLIC_URL=https://YOUR-RENDER-SERVICE.onrender.com
ALLOWED_ORIGINS=https://YOUR-RENDER-SERVICE.onrender.com
PORTAL_DEFAULT_INITIAL_PASSWORD=Use-A-Unique-Strong-Temporary-Password
```

Do not commit the password. It initializes accounts only when a password does not already exist. Change each account password after first access and remove the environment variable once initialization is complete.

## Verify Before Live Use

1. Open `/api/health` and require `{"ok":true,"storage":"postgresql"}`. Do not accept `local-json` for production.
2. Sign in as Owner Admin with `sitecreator@bawjiasecommunitybank.com` and the temporary password.
3. Create or reset agent access from **Users & Access** and privately share the generated six-digit setup code. It expires in 30 minutes.
4. Export an encrypted backup from **Portal Control**, then verify you can decrypt/import it in a test environment.
5. Test Owner Admin, Supervisor, and SUSU Agent access separately before switching the portal to Live mode.

## Important Limits

- Render free web services sleep when idle, so the first request can be slow.
- Render free PostgreSQL databases expire after Render's current free retention period. Upgrade the database before entering real banking data and configure external encrypted backups.
- Upload files are still stored on the web-service filesystem. Use a persistent disk or object storage before relying on profile/upload retention.
- Free web services do not support normal outbound SMTP. Registration and Forgot Password are hidden unless mail is configured; use an HTTPS email provider or a paid environment.

## Install On A Phone

Open the HTTPS Render URL in Chrome or Edge and choose **Install app** or **Add to Home screen**. The service worker caches only the application shell; financial API requests are never cached.

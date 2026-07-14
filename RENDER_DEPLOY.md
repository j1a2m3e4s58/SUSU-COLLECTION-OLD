# Render Deployment

This project should be deployed on Render as a single Python web service for the first test deployment. The service builds the Vite frontend into `mail-api/public`, then Flask serves both the frontend and `/api/*` backend from the same HTTPS domain.

## Deploy From Blueprint

1. Push the latest code to GitHub.
2. Open the [Render Blueprint creation page](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fj1a2m3e4s58%2FSUSU-COLLECTION-OLD).
3. Sign in and authorize Render to access GitHub if prompted.
4. Confirm the repository is `j1a2m3e4s58/SUSU-COLLECTION-OLD` and the branch is `main`.
5. Render will read `render.yaml` from the repository root.
6. Create the Blueprint and wait for the first deploy to become live.

## Required Values During Creation

Render will ask for the `sync: false` environment variables.

Use these for testing:

```txt
PORTAL_PUBLIC_URL=https://YOUR-RENDER-SERVICE.onrender.com
ALLOWED_ORIGINS=https://YOUR-RENDER-SERVICE.onrender.com
PORTAL_DEFAULT_INITIAL_PASSWORD=Choose-A-Temporary-Test-Password
```

The expected URL from the configured service name is:

```txt
https://susu-collection-portal.onrender.com
```

If Render assigns a different URL, update `PORTAL_PUBLIC_URL` and `ALLOWED_ORIGINS` on the service's **Environment** page, then choose **Save and deploy**.

Use a strong temporary initial password and do not commit it to GitHub. The password seeds the built-in test accounts when the JSON data directory is empty.

## Free-Tier Limitations

- The free web service filesystem is ephemeral. Customers, collections, passwords, sessions, uploads, and other JSON-backed changes can disappear whenever the service restarts, redeploys, or spins down. Use this deployment only for testing.
- Free web services spin down after 15 minutes without traffic, so the first request after idle time can take about a minute.
- Render blocks outbound SMTP ports `25`, `465`, and `587` on free web services. Email verification and password-reset delivery therefore will not work on the free plan. Do not add the `MAIL_*` variables unless you move to a paid service or replace SMTP with an HTTPS email API.
- Before storing real customer or deposit data, use a paid service with a persistent disk mounted at `/opt/render/project/src/mail-api/data`, or migrate the JSON stores to a managed database.

## Important Data Note

This Render setup is for testing. It uses JSON files inside the Render service filesystem. Before every redeploy and before moving to another host, use **Portal Control > Export Backup**.

## Verify The Deployment

1. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and confirm it returns `{"ok":true}`.
2. Open the service root URL and sign in with a built-in account and the value you supplied for `PORTAL_DEFAULT_INITIAL_PASSWORD`.
3. Do not enter live banking data on the free service.

## Install As App On Phone

After Render deploys with HTTPS:

1. Open the Render URL on Android Chrome or Edge.
2. Open the browser menu.
3. Press **Install app** or **Add to Home screen**.

The app includes `manifest.json` and `sw.js`, so it is installable once hosted over HTTPS.

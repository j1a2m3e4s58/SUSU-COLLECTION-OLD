# Render Deployment

The Render Blueprint deploys one Flask web service and one managed PostgreSQL database. Vite is built into `mail-api/public`, so the frontend and `/api/*` use the same HTTPS origin.

## Deploy

1. Push `main` to GitHub.
2. Open [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fj1a2m3e4s58%2FSUSU-COLLECTION-OLD).
3. Select `j1a2m3e4s58/SUSU-COLLECTION-OLD`, branch `main`, and create the Blueprint.
4. Enter the security values below when Render prompts you.

```txt
PORTAL_PUBLIC_URL=https://YOUR-RENDER-SERVICE.onrender.com
ALLOWED_ORIGINS=https://YOUR-RENDER-SERVICE.onrender.com
PORTAL_DEFAULT_INITIAL_PASSWORD=Use-A-Unique-Strong-Temporary-Password
AUDIT_HMAC_KEY=Generate-At-Least-32-Random-Characters-And-Store-Safely
MFA_SECRETS_JSON={"sitecreator@bawjiasecommunitybank.com":"BASE32-TOTP-SECRET"}
```

Do not commit passwords, audit keys, or MFA secrets. The initial password bootstraps only the Owner account; remove it from Render after the first password replacement. Add a Base32 TOTP secret to `MFA_SECRETS_JSON` for every active Owner/Supervisor before enabling Live Mode, and enroll those same secrets in their authenticator apps.

## Verify Before Live Use

1. Open `/api/health` and require `{"ok":true,"storage":"postgresql"}`. Do not accept `local-json` for production.
2. Sign in as Owner Admin with `sitecreator@bawjiasecommunitybank.com` and the temporary password.
3. Create or reset agent access from **Users & Access** and privately share the generated six-digit setup code. It expires in 30 minutes.
4. Export an encrypted backup from **Portal Control**, then verify you can decrypt/import it in a test environment.
5. Test Owner Admin, Supervisor, and SUSU Agent access separately before switching the portal to Live mode.
6. Confirm every deposit uses the server date/reference and that retrying the same request creates only one transaction.
7. Reject a test transaction and confirm the customer balance is recalculated and the original remains visible as reversed.
8. Restore an encrypted backup into a separate test deployment and reconcile customer totals against the transaction ledger.

## Production controls

- The Blueprint requests paid web/database resources and a persistent disk. Review the resulting Render charges before creating or updating it.
- Public registration is disabled. Provision staff from **Users & Access** and archive departed staff instead of deleting identities.
- Live Mode stays blocked unless PostgreSQL, HTTPS `PORTAL_PUBLIC_URL`, the audit HMAC key, and MFA for every privileged user are configured.
- Keep encrypted backups outside Render, run scheduled restore drills, monitor failed logins and reversals, and reconcile physical cash to the daily close every day.
- A persistent disk protects local profile uploads, but dedicated object storage is still recommended if file usage grows or the service must scale horizontally.

## Install On A Phone

Open the HTTPS Render URL in Chrome or Edge and choose **Install app** or **Add to Home screen**. The service worker caches only the application shell; financial API requests are never cached.

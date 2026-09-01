<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project Context

This is an Application Performance Monitoring (APM) and Uptime Monitoring platform.
Key systems:

1. **APM Ingestion (`/api/ingest`)**: Secure endpoint for the CDN-hosted SDK (`/api/public/sdk.ts`) to report errors in batch using API keys. Users do not use npm.
2. **Domain Verification (`/api/sites/verify`)**: Users must host a `webwatch-verify.txt` file to claim domain ownership before APM usage.
3. **Uptime Monitoring**: A Cloudflare Cron-triggered monitoring service.
4. **Notifications**: Sends critical alerts via Telegram.

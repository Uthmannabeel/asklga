import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cloudflare Workers build (npm run cf:build / cf:deploy). Vercel and Docker ignore this file.
export default defineCloudflareConfig();

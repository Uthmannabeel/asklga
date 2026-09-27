import type { NextConfig } from "next";

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // PGlite ships WASM and must not be bundled by Next.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Self-contained server for the Docker image (see Dockerfile). Vercel uses its own packaging.
  output: process.env.VERCEL ? undefined : "standalone",
  // The SQL migration is read from disk at startup; keep it in standalone/serverless bundles.
  outputFileTracingIncludes: { "/**/*": ["./src/db/migrations/**"] },
  async headers() {
    return [
      {
        // Only the widget page may be framed, by any site that installs the script.
        source: "/:lga/embed",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/((?!.*/embed$).*)",
        headers: [...baseHeaders, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;

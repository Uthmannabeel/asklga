import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and must not be bundled by Next.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;

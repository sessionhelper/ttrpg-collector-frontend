import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The BFF is the security boundary — no static export, no client-side
  // fetching of the data-api directly. Keep SSR enabled everywhere.
  reactStrictMode: true,
  // prom-client + @opentelemetry SDKs pull in node-only modules; mark them
  // external so Next.js doesn't try to bundle them for Edge.
  serverExternalPackages: ["prom-client", "@opentelemetry/sdk-node"],
};

export default nextConfig;

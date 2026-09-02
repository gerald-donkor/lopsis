import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's detached TypeScript CLI process returns empty output under Node 24.
  // The compiler API performs the same project check without that subprocess.
  experimental: {
    useTypeScriptCli: false,
    webpackBuildWorker: false,
  },
};

export default nextConfig;

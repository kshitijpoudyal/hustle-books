import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Bumped automatically on every merge to main (.github/workflows/version-bump.yml)
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;


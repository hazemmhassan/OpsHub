import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { env } from "./src/env";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keeps visited pages in the client router cache for 5 minutes. The
    // account pages render on demand, so Next.js treats them as dynamic,
    // whose default is 0: every account switch re-downloaded the whole list
    // (~850 KB), even back to an account seen seconds before. Measured with
    // 300: switching back makes no request. Matches the pages' ISR revalidate.
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;

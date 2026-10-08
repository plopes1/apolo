import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // A página de metas passou a se chamar "Ciclos".
    return [{ source: "/metas", destination: "/ciclos", permanent: true }];
  },
};

export default nextConfig;

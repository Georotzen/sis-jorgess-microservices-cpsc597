/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Static export (output: 'export') does NOT support client-side
  // routing with next/navigation router.push(). We need a Node.js server,
  // so we do NOT use static export. Dockerfile will run `next start` instead.
  // output: 'export',
  /*  experimental: {
    appDir: true,
  },
    // 👇 Add this line
  srcDir: 'src', */
  trailingSlash: true,

  // In `next dev` (localhost:3000) there is no Nginx sitting in front of
  // us, so relative API_BASE paths like /identity/login would otherwise
  // hit the Next.js dev server itself and 404. These rewrites proxy them
  // to the full stack's Nginx entrypoint (localhost:8888) instead, so the
  // same relative-path code in api.ts works unchanged in both dev and the
  // full docker compose stack.
  //
  // NOTE: rewrites only run under `next dev` / `next start` — they do NOT
  // apply to `output: 'export'` static builds, which is correct: the
  // static build is served by real Nginx, which does this proxying itself.
  async rewrites() {
    const gatewayOrigin = process.env.NEXT_PUBLIC_GATEWAY_ORIGIN || 'http://localhost:8888';

    return [
      { source: '/identity/:path*', destination: `${gatewayOrigin}/identity/:path*` },
      { source: '/student-profile/:path*', destination: `${gatewayOrigin}/student-profile/:path*` },
      { source: '/enrollment/:path*', destination: `${gatewayOrigin}/enrollment/:path*` },
      { source: '/grades/:path*', destination: `${gatewayOrigin}/grades/:path*` },
    ];
  },
};

module.exports = nextConfig;

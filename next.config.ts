import type { NextConfig } from "next";

const config: NextConfig = {
  // Emits a self-contained server bundle so the Docker image stays small.
  // Dokploy runs `node server.js` from it.
  output: "standalone",

  images: {
    // Uploaded files are served by our own route handler. They are converted
    // to resized WebP on upload (see lib/uploads.ts), so Next's own optimiser
    // would have nothing left to do.
    unoptimized: true,
  },

  // sharp is a native module. Bundling it would break the .node binary, so it
  // stays an ordinary require and the standalone tracer copies it verbatim.
  serverExternalPackages: ["sharp"],

  experimental: {
    serverActions: {
      // Photo uploads go through a Server Action, and the default cap is 1 MB —
      // small enough that every photo straight off a phone failed with a 500.
      // Matches the 25 MB check in lib/uploads.ts, plus room for the other
      // form fields, so oversized files get our own message instead of a crash.
      bodySizeLimit: "26mb",
    },
  },

  eslint: { ignoreDuringBuilds: true },

  // Drops `X-Powered-By: Next.js`. It tells an attacker which framework and
  // therefore which CVE list to work from, and buys nothing in return.
  poweredByHeader: false,

  /**
   * Security headers.
   *
   * The CSP is written against what the site actually loads, which is very
   * little: Google Fonts for the typefaces and a Google Maps iframe on the
   * Visit page. Everything else is same-origin.
   *
   * 'unsafe-inline' is present for scripts because Next inlines its hydration
   * payload; removing it needs per-request nonces, which force every page
   * dynamic. Not a trade worth making for a cafe site with no user accounts and
   * no rendering of untrusted HTML — there is no `dangerouslySetInnerHTML`
   * anywhere in the app, so the XSS surface it would defend is already closed.
   *
   * Development adds 'unsafe-eval', without which Fast Refresh cannot run.
   */
  async headers() {
    const dev = process.env.NODE_ENV !== "production";

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self'",
      // The Visit page embeds a Google Map.
      "frame-src https://www.google.com",
      `connect-src 'self'${dev ? " ws: wss:" : ""}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(dev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // frame-ancestors covers this for modern browsers; kept for old ones.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          /* Once a browser has seen this, it refuses to speak plain HTTP to
             this host for a year — which closes the gap where the very first
             request to `http://…` can be intercepted before the redirect to
             HTTPS ever arrives. The admin session cookie travels over that
             request.

             Deliberately no `includeSubDomains` and no `preload`. Both are hard
             to undo: preload means asking browser vendors to ship the rule, and
             removal takes months. This site is still moving between hosts, and
             a subdomain without a certificate would simply become unreachable.
             Add them once the real domain has settled. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
};

export default config;

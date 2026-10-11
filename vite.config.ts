import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // CodeMirror injects its styles at runtime
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// Production only: the dev server needs inline scripts for hot reload.
const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig({
  base: '/K8s-Auditor/',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  // Keep fonts and icons as files: inlining them as data: URLs would need a looser font-src.
  build: { assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})

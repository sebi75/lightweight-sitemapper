# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

lightweight-sitemapper is a TypeScript library for crawling and parsing XML sitemaps. Published to NPM as `lightweight-sitemapper`. It's an ES module that supports sitemap indexes (recursive crawling), gzip decompression, retry with exponential backoff, and optional `lastmod` date filtering.

## Commands

- **Build:** `npm run build` — cleans `dist/` and runs Rollup to produce minified JS + bundled `.d.ts`
- **Sandbox (manual testing):** `bun run sandbox` — runs `src/sandbox.ts` against a live sitemap URL
- **Install deps:** `bun install`
- **Tests:** Jest is configured (`test/**/*.test.ts` pattern, ts-jest preset) but no test files exist yet

## Architecture

The library is a single class with one public method:

- **`src/index.ts`** — Re-exports `LightweightSitemapper` (default) and types
- **`src/lightweight-sitemapper.ts`** — Core class. `fetch()` is the public API; internally calls `crawl()` (recursive, handles sitemapindex vs urlset) and `parse()` (HTTP + XML parsing). Uses `Promise.allSettled` to crawl sitemap indexes in parallel. Timeout via `AbortController`.
- **`src/lib/`** — Small utilities: gzip magic-byte detection (`is-gzip.ts`), cross-browser network error detection (`is-network-error.ts`), custom error class (`custom-error.ts`)
- **`src/types/`** — TypeScript interfaces for constructor options, link results, and XML parse shapes

## Build & Bundle

- **Rollup** produces two outputs: minified `dist/index.js` (ES module) and `dist/index.d.ts` (bundled declarations)
- **External deps** (not bundled): `zlib`, `fast-xml-parser`, `node-fetch`
- `fast-xml-parser` and `node-fetch` are peer dependencies — consumers must install them
- Native `fetch` is preferred at runtime; `node-fetch` is a fallback via dynamic `require()`

## Key Conventions

- Package type is `"module"` (ESM)
- TypeScript strict mode enabled, target ES2016
- Bun is the package manager (bun.lockb)
- `src/sandbox.ts` is excluded from builds — used only for local manual testing

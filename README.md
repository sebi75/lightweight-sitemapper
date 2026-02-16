# lightweight-sitemapper

A lightweight TypeScript library for crawling and parsing XML sitemaps.

## Features

- Parses standard XML sitemaps and sitemap indexes (recursive crawling)
- Automatic gzip decompression
- Retry with exponential backoff
- Filter URLs by `lastmod` date
- Configurable timeout via `AbortController`
- Full TypeScript support with exported types
- Uses native `fetch` with `node-fetch` as a fallback

## Installation

```bash
npm install lightweight-sitemapper fast-xml-parser node-fetch
```

`fast-xml-parser` and `node-fetch` are peer dependencies. If your runtime already provides a global `fetch` (Node 18+, Bun, Deno), `node-fetch` is not required.

## Quick Start

```ts
import LightweightSitemapper from "lightweight-sitemapper";

const sitemapper = new LightweightSitemapper();
const { url, links } = await sitemapper.fetch("https://example.com/sitemap.xml");

console.log(`Fetched ${links.length} URLs from ${url}`);

for (const link of links) {
  console.log(link.loc, link.lastmod);
}
```

## Options

Pass an options object to the constructor:

```ts
const sitemapper = new LightweightSitemapper({
  timeout: 15000,
  retries: 5,
  lastmod: new Date("2024-01-01"),
  debug: true,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `10000` | Request timeout in milliseconds |
| `retries` | `number` | `3` | Number of retry attempts per request |
| `lastmod` | `Date` | `null` | Only include URLs with a `lastmod` date after this value |
| `debug` | `boolean` | `false` | Log debug information to the console |
| `requestHeaders` | `Record<string, string>` | `undefined` | Default headers to include with every request |

## API Reference

### `fetch(url: string, requestInit?: RequestInit): Promise<FetchSitemapResult>`

Fetches and parses the sitemap at the given URL. If the sitemap is a sitemap index, all referenced sitemaps are crawled recursively in parallel.

**Returns** a `FetchSitemapResult`:

```ts
type FetchSitemapResult = {
  url: string;             // The URL that was fetched
  links: LinkResultEntity[]; // All discovered URLs
};

type LinkResultEntity = {
  loc: string;             // The URL from the sitemap
  lastmod?: string;        // Last modified date (if present)
  error?: {                // Present if the fetch failed
    name: string;
    message: string;
    retries?: number;
  };
};
```

## Custom Request Options

You can pass a `RequestInit` object as the second argument to `fetch()` to customize the underlying HTTP request:

```ts
const sitemapper = new LightweightSitemapper();

const result = await sitemapper.fetch("https://example.com/sitemap.xml", {
  headers: {
    "Authorization": "Bearer my-token",
    "Accept-Language": "en-US",
  },
});
```

Default headers (`User-Agent`, `Accept-Encoding`, `Content-Type`) are set automatically but can be overridden.

## License

MIT

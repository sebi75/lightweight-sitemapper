# lightweight-sitemapper

## Description

A lightweight sitemap crawler which takes a sitemap.xml URL as input and outputs a list of URLs found in the sitemap.
Also supports sitemap index URLs.
With only two dependencies: fast-xml-parser and node-fetch, this package tried to reduce the number of external dependencies and
use the most popular and lightweight package for XML parsing.

If the environment in which the package will be used has access to a native `fetch` implementation, the native solution will be used.

## Install in your project

- Bun

```bash
$ bun add lightweight-sitemapper
```

- PNPM

```bash
$ pnpm install lightweight-sitemapper
```

- NPM

```bash
$ npm install lightweight-sitemapper
```

- Yarn

```bash
$ yarn add lightweight-sitemapper
```

## Setup for local development

1. Clone the repository

1. Via HTTPS

```bash
$ git clone https://github.com/sebi75/lightweight-sitemapper.git
```

2. Via SSH

```bash
$ git clone git@github.com:sebi75/lightweight-sitemapper.git
```

2. Install dependencies

```bash
$ bun install
```

3. Local development
   Test the package locally with the sandbox.ts file in ./src/sandbox.ts and the command to run it from package.json:

```bash
$ bun run sandbox
```

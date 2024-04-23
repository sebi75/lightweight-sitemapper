export type LightweightSitemapperOptions = {
  timeout?: number;
  retries?: number;
  requestHeaders?: Record<string, string>;
  lastmod?: Date;
  debug?: boolean;
};

export type LightweightSitemapperLinkEntity = {
  url: string;
  lastmod?: Date;
  error?: Error;
};

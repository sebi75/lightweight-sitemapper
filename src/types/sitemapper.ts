export type LightweightSitemapperOptions = {
  timeout?: number;
  retries?: number;
  requestHeaders?: Record<string, string>;
  lastmod?: Date;
  debug?: boolean;
};

export type LinkResultEntity = {
  loc: string;
  lastmod?: string;
  error?: {
    name: string;
    message: string;
    retries?: number;
  };
};

export type FetchSitemapResult = {
  url: string;
  links: LinkResultEntity[];
};

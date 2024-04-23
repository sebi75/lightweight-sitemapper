export type FastXMLParseResult = {
  "?xml": string;
  sitemapindex?: {
    sitemap: SitemapIndexSitemap | SitemapIndexSitemap[];
  };
  urlset?: {
    url: UrlsetUrl | UrlsetUrl[];
  };
};

export type SitemapIndexSitemap = {
  loc: string;
  lastmod?: string;
};

type UrlsetUrl = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

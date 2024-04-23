export type FastXMLParseResult = {
  "?xml": string;
  sitemapindex?: {
    sitemap: {
      loc: string;
      lastmod?: string;
    }[];
  };
  urlset?: {
    url: {
      loc: string;
      lastmod?: string;
      changefreq: string;
      priority: string;
    }[];
  };
};

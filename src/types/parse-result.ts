export type ParseResult = {
  "?xml": string;
  urlset: {
    url: {
      loc: string;
      lastmod: string;
      changefreq: string;
      priority: string;
    }[];
  };
};

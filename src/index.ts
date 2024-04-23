import isGzip from "./lib/is-gzip";
import { XMLParser } from "fast-xml-parser";
import type { LightweightSitemapperOptions } from "./types/sitemapper";
import * as zlib from "zlib";
import type { FastXMLParseResult } from "./types/parse-result";
import isNetworkError from "./lib/is-network-error";

export class LightweightSitemapper {
  private fetchFunction: typeof fetch;
  private readonly retries: number;
  private readonly timeout: number;
  private readonly debug: boolean = false;
  private readonly lastmod: Date | null;
  private readonly defaultUserAgent: string =
    "'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36";
  constructor(options: LightweightSitemapperOptions) {
    this.fetchFunction =
      typeof fetch !== "undefined" ? fetch : require("node-fetch");
    this.retries = options.retries ?? 3;
    this.timeout = options.timeout ?? 10000; // 10 seconds
    this.lastmod = options.lastmod ?? null;
    this.debug = options.debug ?? false;
  }

  public async fetch(url: string, requestInitOptions?: RequestInit) {
    return await this.crawl(url, requestInitOptions);
  }

  /**
   * Tries to fetch the sitemap from the given URL and handles various edge cases.
   * It retries based on the configured number of retries with exponantial backoff.
   * If the sitemap is a sitemapindex, it fetches all the sitemaps from the sitemapindex.
   * @param url
   */
  private async crawl(
    url: string,
    requestInitOptions?: RequestInit
  ): Promise<{
    links: {
      loc: string;
      lastmod?: string;
      error?: Error;
    }[];
  }> {
    const sitemapInitialResponseObject: {
      links: {
        loc: string;
        lastmod?: string;
        error?: Error;
      }[];
    } = {
      links: [],
    };
    let retries = 0;
    let backoff = 2;

    let parsedResponse: FastXMLParseResult | null = null;
    while (retries < this.retries && !parsedResponse) {
      try {
        parsedResponse = await this.parse(url, requestInitOptions);
      } catch (error) {
        if (retries !== this.retries - 1) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
          backoff *= 2;
        } else if (retries === this.retries - 1) {
          throw new Error(`Failed to fetch sitemap from url: '${url}'`);
        }
      }
    }

    if (!parsedResponse) {
      throw new Error(`Failed to fetch sitemap from url: '${url}'`);
    }

    // Now parsed response can either be a sitemapindex or a urlset.
    // If it's a sitemapindex, we need to apply the above logic to fetch the sitemaps from the sitemapindex.
    if (
      parsedResponse.sitemapindex &&
      parsedResponse.sitemapindex.sitemap &&
      parsedResponse.sitemapindex.sitemap.length > 0
    ) {
      let sitemaps = parsedResponse.sitemapindex.sitemap;
      // filter out sitemaps that are older than the lastmod date
      if (this.lastmod) {
        sitemaps = sitemaps.filter((sitemap) => {
          if (sitemap.lastmod) {
            return (
              new Date(sitemap.lastmod).getTime() > this.lastmod!.getTime()
            );
          } else if (sitemap.loc) {
            return true;
          } else {
            return false;
          }
        });
      }
      const crawlSitemapPromises = sitemaps.map((sitemap) => {
        return this.crawl(sitemap.loc, requestInitOptions);
      });
      const crawlSitemapResults = await Promise.allSettled(
        crawlSitemapPromises
      );
      crawlSitemapResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          sitemapInitialResponseObject.links.push(...result.value.links);
        } else {
          sitemapInitialResponseObject.links.push({
            loc: sitemaps[index].loc,
            error: result.reason,
          });
        }
      });

      return sitemapInitialResponseObject;
    } else if (
      parsedResponse.urlset &&
      parsedResponse.urlset.url &&
      parsedResponse.urlset.url.length > 0
    ) {
      let unfilteredLinks = parsedResponse.urlset.url;
      if (this.lastmod) {
        unfilteredLinks = unfilteredLinks.filter((link) => {
          if (link.lastmod) {
            return new Date(link.lastmod).getTime() > this.lastmod!.getTime();
          } else {
            return true;
          }
        });
      }
      sitemapInitialResponseObject.links = unfilteredLinks.map((link) => {
        return {
          loc: link.loc,
          lastmod: link.lastmod,
        };
      });

      return sitemapInitialResponseObject;
    } else {
      throw new Error(
        `Parsed response does not contain a sitemapindex or urlset for url: '${url}'`
      );
    }
  }

  private async parse(url: string, customRequestOptions?: RequestInit) {
    try {
      const headers = new Headers(customRequestOptions?.headers ?? {});
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", this.defaultUserAgent);
      }
      if (!headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip");
      }
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/xml");
      }
      const requestOptions: RequestInit = {
        ...customRequestOptions,
        method: customRequestOptions?.method ?? "GET",
        headers: headers,
      };
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

      const response = await this.fetchFunction(url, {
        ...requestOptions,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok || response.status >= 400) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      let responseBody: Buffer | null = null;

      // If we got a finally valid response, we can process it.
      const arrayBufferBody = await response.arrayBuffer();
      const bufferBody = Buffer.from(arrayBufferBody);

      if (isGzip(bufferBody)) {
        const decompressed = await this.decompress(bufferBody);
        responseBody = decompressed;
      } else {
        responseBody = bufferBody;
      }

      if (!responseBody) {
        throw new Error(`Body is empty for url: '${url}'`);
      }

      const fastXmlParser = new XMLParser();
      const parseResult = fastXmlParser.parse(responseBody);
      return parseResult as FastXMLParseResult;
    } catch (error: any) {
      if (isNetworkError(error)) {
        throw new Error(`Network error occurred: ${error.message}`);
      }
      if (error.name === "AbortError") {
        throw new Error(
          `Request timed out after ${this.timeout} milliseconds for url: '${url}'`
        );
      }

      if (error.name === "HTTPError") {
        throw new Error(`HTTP Error occurred: ${error.message}`);
      }

      throw new Error(`UNKNOWN error occurred: ${error.name}`);
    }
  }

  private async decompress(body: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(body, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}

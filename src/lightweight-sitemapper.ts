import isGzip from "./lib/is-gzip";
import type {
  LightweightSitemapperOptions,
  FetchSitemapResult,
  LinkResultEntity,
} from "./types/sitemapper";
import * as zlib from "zlib";
import type {
  FastXMLParseResult,
  SitemapIndexSitemap,
} from "./types/parse-result";
import isNetworkError from "./lib/is-network-error";
import { CustomError } from "./lib/custom-error";
const fastXmlParser = require("fast-xml-parser");

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

  /**
   * Fetches the sitemap from the given URL and returns the links in the sitemap.
   * If the sitemap is a sitemapindex, it fetches all the sitemaps from the sitemapindex sites and returns a flat list of links.
   * @param url {string}
   * @param requestInitOptions {RequestInit}
   * @returns
   */
  public async fetch(
    url: string,
    requestInitOptions?: RequestInit
  ): Promise<FetchSitemapResult> {
    let results: FetchSitemapResult = {
      url: url,
      links: [],
    };

    if (this.debug) {
      console.log(
        `Fetching sitemap from url: '${url}', with options: ${JSON.stringify({
          timeout: this.timeout,
          retries: this.retries,
          debug: this.debug,
          lastmod: this.lastmod,
        })}`
      );
    }

    try {
      results.links = await this.crawl(url, requestInitOptions);
    } catch (error) {
      if (this.debug) {
        console.error(`Failed to fetch sitemap from url: '${url}'`, error);
      }
      throw error;
    }

    return results;
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
  ): Promise<LinkResultEntity[]> {
    let sitemapInitialResponseObject: LinkResultEntity[] = [];
    let retries = 0;
    let backoff = 2;

    let parsedResponse: FastXMLParseResult | null = null;
    while (retries < this.retries && !parsedResponse) {
      try {
        parsedResponse = await this.parse(url, requestInitOptions);
      } catch (error) {
        const typedError = error as CustomError;
        if (this.debug) {
          console.error(
            `Failed to fetch sitemap from url: '${url}', (Retry: ${
              retries + 1
            } / ${this.retries})`
          );
        }
        if (retries !== this.retries - 1) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
          backoff *= 2;
        } else if (retries === this.retries - 1) {
          sitemapInitialResponseObject.push({
            loc: url,
            error: {
              name: typedError.name,
              message: typedError.message,
              retries: retries,
            },
          });
          return sitemapInitialResponseObject;
        }
      }
    }

    if (!parsedResponse) {
      if (this.debug) {
        console.error(
          `Unexpected error occured while fetching sitemap from url: '${url}'`
        );
      }
      sitemapInitialResponseObject.push({
        loc: url,
        error: {
          name: "UnexpectedError",
          message: `Failed to fetch sitemap after ${this.retries} retries`,
        },
      });
      return sitemapInitialResponseObject;
    }

    if (parsedResponse.sitemapindex && parsedResponse.sitemapindex.sitemap) {
      const sitemapsObject = parsedResponse.sitemapindex.sitemap;
      let sitemaps: SitemapIndexSitemap[] = [];
      if (sitemapsObject instanceof Array) {
        sitemaps = sitemapsObject;
      } else {
        sitemaps = [sitemapsObject];
      }

      // Filter out sitemaps that are older than the lastmod date when specified
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
          sitemapInitialResponseObject.push(...result.value);
        } else {
          // Should generally not happen, as this function never throws
          sitemapInitialResponseObject.push({
            loc: sitemaps[index].loc,
            error: {
              name: "UnexpectedError",
              message: `Unexpected error occurred while fetching sitemap: ${sitemaps[index].loc}`,
            },
          });
        }
      });

      return sitemapInitialResponseObject;
    } else if (parsedResponse.urlset && parsedResponse.urlset.url) {
      const urlObject = parsedResponse.urlset.url;
      let unfilteredLinks: LinkResultEntity[] = [];
      if (urlObject instanceof Array) {
        unfilteredLinks = urlObject;
      } else {
        unfilteredLinks = [urlObject];
      }
      if (this.lastmod) {
        unfilteredLinks = unfilteredLinks.filter((link) => {
          if (link.lastmod) {
            return new Date(link.lastmod).getTime() > this.lastmod!.getTime();
          } else {
            return true;
          }
        });
      }

      sitemapInitialResponseObject = unfilteredLinks.map((link) => {
        return {
          loc: link.loc,
          lastmod: link.lastmod,
        };
      });

      return sitemapInitialResponseObject;
    } else {
      if (this.debug) {
        console.error(
          `Parsed response does not contain a sitemapindex or urlset for url: '${url}'`,
          parsedResponse
        );
      }
      sitemapInitialResponseObject.push({
        loc: url,
        error: {
          name: "InvalidSitemapError",
          message: "Parsed response does not contain a sitemapindex or urlset",
        },
      });
      return sitemapInitialResponseObject;
    }
  }

  private async parse(url: string, customRequestOptions?: RequestInit) {
    try {
      const headers = new Headers(customRequestOptions?.headers ?? {});
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", this.defaultUserAgent);
      }
      if (!headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,sdch");
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

      const parser = new fastXmlParser.XMLParser();
      const parseResult = parser.parse(responseBody);
      return parseResult as FastXMLParseResult;
    } catch (error: any) {
      if (isNetworkError(error)) {
        throw new CustomError(
          `Network error occurred: ${error.message}`,
          "NetworkError"
        );
      }
      if (error.name === "AbortError") {
        throw new CustomError(
          `Request timed out after ${this.timeout} milliseconds for url: '${url}'`,
          "TimeoutError"
        );
      }

      if (error.name === "HTTPError") {
        throw new CustomError(
          `HTTP Error occurred: ${error.message}`,
          "HTTPError"
        );
      }

      throw new CustomError(
        `Unknown error occurred: ${error.message}`,
        "UnknownError"
      );
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

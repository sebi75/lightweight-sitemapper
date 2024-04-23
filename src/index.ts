import isGzip from "./lib/is-gzip";
import { XMLParser } from "fast-xml-parser";
import type { LightweightSitemapperOptions } from "./types/sitemapper";
import * as zlib from "zlib";
import type { ParseResult } from "./types/parse-result";
import isNetworkError from "./lib/is-network-error";

export class LightweightSitemapper {
  private fetchFunction: typeof fetch;
  private readonly retries: number;
  private readonly timeout: number;
  constructor(options: LightweightSitemapperOptions) {
    this.fetchFunction =
      typeof fetch !== "undefined" ? fetch : require("node-fetch");
    this.retries = options.retries || 3;
    this.timeout = options.timeout || 10000; // 10 seconds
  }

  public async fetch(url: string) {
    await this.crawl(url);
  }

  /**
   * Tries to fetch the sitemap from the given URL and handles various edge cases.
   * It retries based on the configured number of retries with exponantial backoff.
   * It cancels the request if it takes longer than the configured timeout.
   * @param url
   */
  private async crawl(url: string) {
    let retries = 0;
    let backoff = 2;

    let parseResponse: string | Buffer | null = null;
    while (retries < this.retries && !parseResponse) {
      try {
        parseResponse = await this.parse(url);
      } catch (error) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
        backoff *= 2;
      }
    }

    if (!parseResponse) {
      throw new Error(`Failed to fetch sitemap from url: '${url}'`);
    }
  }

  async parse(url: string) {
    try {
      const requestOptions: RequestInit = {
        method: "GET",
        headers: {
          "Accept-Encoding": "gzip",
        },
      };
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.timeout);
      const response = await this.fetchFunction(url, {
        ...requestOptions,
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);
      const body = await response.arrayBuffer();
      const bodyBuffer = Buffer.from(body);

      if (isGzip(bodyBuffer)) {
        const decompressed = await this.decompress(bodyBuffer);
        return decompressed;
      }
      return Buffer.from(body).toString();
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

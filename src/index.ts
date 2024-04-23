import isGzip from "./lib/is-gzip";
import { XMLParser } from "fast-xml-parser";
import type { LightweightSitemapperOptions } from "./types/sitemapper";
import * as zlib from "zlib";
import type { ParseResult } from "./types/parse-result";

export class LightweightSitemapper {
  private fetchFunction: typeof fetch;
  constructor(options: LightweightSitemapperOptions) {
    this.fetchFunction =
      typeof fetch !== "undefined" ? fetch : require("node-fetch");
  }

  public async fetch(url: string) {
    const requestOptions: RequestInit = {
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip",
      },
    };
    const res = await this.fetchFunction(url, requestOptions);
    if (!res.ok || !res.status.toString().startsWith("2")) {
      throw new Error(`Failed to fetch ${url}`);
    }
    const body = await res.arrayBuffer();

    const parser = new XMLParser();
    const jObj = parser.parse(Buffer.from(body)) as ParseResult;
    console.log(jObj.urlset.url);
  }

  private async decompress(body: Buffer) {
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

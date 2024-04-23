import isGzip from "./lib/is-gzip";
import { XMLParser } from "fast-xml-parser";
import type { LightweightSitemapperOptions } from "./types/sitemapper";
import fetch, { type RequestInit } from "node-fetch";
import * as zlib from "zlib";
import type { ParseResult } from "./types/parse-result";

export class LightweightSitemapper {
  constructor(options: LightweightSitemapperOptions) {
    // set the options here
  }

  public async fetch(url: string) {
    const requestOptions: RequestInit = {
      method: "GET",
      headers: {
        "Accept-Encoding": "gzip",
      },
    };
    const res = await fetch(url, requestOptions);
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

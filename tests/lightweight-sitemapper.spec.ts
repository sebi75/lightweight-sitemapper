import LightweightSitemapper from "../src/index";
import { describe, it, expect, beforeEach, mock } from "bun:test";

beforeEach(() => {
  (global.fetch as ReturnType<typeof mock>).mockClear();
});

describe("LightweightSitemapper", () => {
  it("should be able to call the fetch method", async () => {
    const sitemapper = new LightweightSitemapper();
    const result = await sitemapper.fetch("https://nexxtsupport.com");
    expect(result.url).toBe("https://nexxtsupport.com");
  });
});

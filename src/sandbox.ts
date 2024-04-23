import { LightweightSitemapper } from "./index";

const TEST_URL = "https://www.nexxtsupport.com/sitemap.xml";
const sitemapper = new LightweightSitemapper({
  // options
});

(async () => {
  await sitemapper.fetch(TEST_URL);
})();

import { LightweightSitemapper } from "./index";

const TEST_URL = "https://www.nexxtsupport.com/sitemap.xml";
const sitemapper = new LightweightSitemapper({
  timeout: 2000,
});

(async () => {
  try {
    const result = await sitemapper.parse(TEST_URL);
    console.log(result);
  } catch (error) {
    console.log(error);
  }
})();

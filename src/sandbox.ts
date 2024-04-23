import { LightweightSitemapper } from "./index";

const nexxt_test = "https://www.nexxtsupport.com/sitemap.xml";
const sitemapper = new LightweightSitemapper({
  timeout: 2000,
});

(async () => {
  try {
    const result = await sitemapper.fetch(nexxt_test);
    console.log(result.links);
  } catch (error) {
    console.log(error);
  }
})();

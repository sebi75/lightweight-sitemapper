import { LightweightSitemapper } from "./index";

const url_test = "https://www.nexxtsupport.com/sitemap.xml";
const sitemapper = new LightweightSitemapper({
  timeout: 5000,
  debug: true,
});

(async () => {
  try {
    console.time("fetch");
    const result = await sitemapper.fetch(url_test);
    console.timeEnd("fetch");
    const erroredLinks = result.links.filter((link) => Boolean(link.error));
    console.log(result.links.length);
  } catch (error) {
    console.log(error);
  }
})();

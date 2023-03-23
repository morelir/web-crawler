import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as fs from "fs";
import urlParser, { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seenUrls = {};
const results = [];
const urlParam = process.argv[2];
const depthParam = +process.argv[3];

const addDocument = ({ imageUrl, sourceUrl, depth }) => {
  results.push({ imageUrl, sourceUrl, depth });
};

const getUrl = (link, host, protocol) => {
  if (link.includes("http")) {
    return link;
  } else if (link.startsWith("/")) {
    return `${protocol}//${host}${link}`;
  } else {
    return `${protocol}//${host}/${link}`;
  }
};

/**
 * Crawler Function
 * @param {String} url - source URL
 * @param {Number} depth - max crawling depth
 * @param {Number} currentDepth - current crawling depth
 * @param {Array<String>} ignores - array of strings that links shouldn't include
 */
const crawl = async ({ url, depth, currentDepth = 0, ignores }) => {
  if (seenUrls[url]) return;
  seenUrls[url] = true;
  const { host, protocol } = urlParser.parse(url);
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const links = $("a")
    .map((i, link) => link.attribs.href)
    .get();

  $("img").each((i, link) => {
    addDocument({
      imageUrl: link.attribs.src,
      sourceUrl: url,
      depth: currentDepth,
    });
  });

  if (currentDepth === depth) return;

  const promises = [];

  links
    .filter(
      (link) =>
        getUrl(link, host, protocol).includes(host) &&
        ignores.filter((keyword) => !link.includes(keyword)).length > 0
    )
    .forEach((link) => {
      promises.push(
        crawl({
          url: getUrl(link, host, protocol),
          depth,
          currentDepth: currentDepth + 1,
          ignores,
        })
      );
    });

  await Promise.all(promises);
};

crawl({
  url: urlParam,
  depth: depthParam,
  ignores: ["#"],
}).then(() => {
  fs.writeFile(`${__dirname}/results.json`, JSON.stringify(results), (err) => {
    console.log(err);
  });
});

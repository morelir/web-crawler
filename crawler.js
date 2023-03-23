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

const crawl = async ({ url, depth, currentDepth, ignore }) => {
  if (seenUrls[url]) return;
  seenUrls[url] = true;
  const { host, protocol } = urlParser.parse(url);
  console.log(url);
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
        getUrl(link, host, protocol).includes(host) && !link.includes(ignore)
    )
    .forEach((link) => {
      promises.push(
        crawl({
          url: getUrl(link, host, protocol),
          depth,
          currentDepth: currentDepth + 1,
          ignore,
        })
      );
    });

  await Promise.all(promises);
};

crawl({
  url: urlParam,
  depth: depthParam,
  currentDepth: 0,
  ignore: "#",
}).then(() => {
  fs.writeFile(`${__dirname}/results.json`, JSON.stringify(results), (err) => {
    console.log(err);
  });
});

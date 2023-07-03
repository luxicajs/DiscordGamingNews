import Parser from "rss-parser";
import "dotenv/config";
const parser = new Parser();
const ytParser = new Parser({
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["media:description", "mediaDescription"],
    ],
  },
});

const urls = [
  "https://www.tweaktown.com/news-feed/",
  "https://insider-gaming.com/feed",
];

let buildData = {};

async function checkUpdates() {
  console.log("Checking for updates...");
  urls.forEach(async (url) => {
    const data = await parser.parseURL(
      url + `?cache=${Math.random()}`
    );

    if (!buildData[url]) {
      buildData[url] = data.lastBuildDate;
    }

    if (buildData[url] != data.lastBuildDate) {
      const xml = data.items[0];

      if (url == "https://www.tweaktown.com/news-feed/") { // Remove this if statement if you want all the other news from this site such as space, business etc.
        const tagCheckReq = await fetch(xml.link);
        const tagCheckData = await tagCheckReq.text();
        if (!tagCheckData.includes(`"genre": "Gaming",`)) {
          return;
        }
      }

      sendWs(`> # ${xml.title}\n\n${xml.contentSnippet}\n\n${xml.link}`);
      buildData[url] = data.lastBuildDate;
    }
  });

  const ytContent = await ytParser.parseURL(
    "https://www.youtube.com/feeds/videos.xml?channel_id=UC-2Y8dQb0S6DtpxNgAKoJKA"
  );

  if (!buildData["youtube"]) {
    buildData["youtube"] = ytContent.items[0]["id"];
  }

  if (buildData["youtube"] !== ytContent.items[0]["id"]) {
    const xml = ytContent.items[0]["mediaGroup"];
    const postTitle = xml["media:title"];
    const postUrl = xml["media:content"][0]["$"]["url"]; // absolute cancer

    const desc = xml["media:description"]
      .toString()
      .split("\n")
      .slice(0, -2)
      .join("\n");

    sendWs(`> # ${postTitle}\n\n${desc}\n${postUrl}`);
    buildData["youtube"] = ytContent.items[0]["id"];
  }
}

async function sendWs(data) {
  await fetch(
    process.env.webhookURL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: data,
      }),
    }
  );
}


// Refresh every 10 minutes. Don't set this below 5 minutes or you might get your ip blacklisted.
setInterval(checkUpdates, 1e3 * 60 * 10);
checkUpdates();

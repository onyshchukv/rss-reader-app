const Parser = require('rss-parser');
const fetch = require('node-fetch');
const iconv = require('iconv-lite');

module.exports = async (req, res) => {
  const url = req.query.url;
  const offset = parseInt(req.query.offset || "0", 10);
  const limit = parseInt(req.query.limit || "10", 10);

  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)"
      }
    });
    const buffer = await response.buffer();

    let charset = 'utf-8';
    const xmlDecl = buffer.toString('ascii', 0, 1000).match(/encoding="([^"]+)"/i);
    if (xmlDecl && xmlDecl[1]) {
      charset = xmlDecl[1].toLowerCase();
    }
    const xml = iconv.decode(buffer, charset);

    const parser = new Parser();
    const feed = await parser.parseString(xml);

    // Пагинация
    if (feed.items) {
      feed.items = feed.items.slice(offset, offset + limit);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(feed);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch RSS", details: e.message });
  }
};
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const iconv = require('iconv-lite');

module.exports = async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }
  try {
    // Получаем буфер, а не текст!
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)"
      }
    });
    const buffer = await response.buffer();

    // Определяем кодировку из XML (по умолчанию utf-8)
    let charset = 'utf-8';
    const xmlDecl = buffer.toString('ascii', 0, 1000).match(/encoding="([^"]+)"/i);
    if (xmlDecl && xmlDecl[1]) {
      charset = xmlDecl[1].toLowerCase();
    }

    // Декодируем буфер в строку с нужной кодировкой
    const xml = iconv.decode(buffer, charset);

    const parser = new Parser();
    const feed = await parser.parseString(xml);

    // Ограничим количество элементов
    if (feed.items && feed.items.length > 20) {
      feed.items = feed.items.slice(0, 20);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(feed);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch RSS", details: e.message });
  }
};
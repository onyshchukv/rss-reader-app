const Parser = require('rss-parser');

module.exports = async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }
  try {
    const parser = new Parser();
    const feed = await parser.parseURL(url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(feed);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch RSS", details: e.message });
  }
};
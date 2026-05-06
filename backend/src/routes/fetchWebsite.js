import express from 'express';

const router = express.Router();

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL mangler.' });

  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(normalized, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Praksisportal/1.0)' },
    });
    clearTimeout(timeout);

    const html = await response.text();
    const text = htmlToText(html);

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

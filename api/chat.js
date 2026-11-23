export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, baseURL = 'https://api.vanns.my.id/v1', model, system, messages = [], max_tokens = 4096, temperature = 0.7 } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'API Key wajib diisi.' });

  const cleanBase = baseURL.replace(/\/+$/, '');
  const formattedMsgs = messages.map((m) => {
    const role = m.role === 'ai' ? 'assistant' : 'user';
    if (Array.isArray(m.images) && m.images.length > 0) {
      return {
        role,
        content: [
          ...m.images.map((im) => ({ type: 'image_url', image_url: { url: im.dataUrl } })),
          { type: 'text', text: m.text || '' }
        ]
      };
    }
    return { role, content: m.text || '' };
  });

  try {
    const upstream = await fetch(`${cleanBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature,
        messages: system ? [{ role: 'system', content: system }, ...formattedMsgs] : formattedMsgs
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data.error?.message || JSON.stringify(data) });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}

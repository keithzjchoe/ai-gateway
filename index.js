import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

const app = express();
app.use(cors()); // tighten IDE origin later
app.use(express.json({ limit: '200kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 30 }));

const DEMO_KEY = process.env.DEMO_KEY || null;
if (DEMO_KEY) {
  app.use((req, res, next) => {
    if (req.get('x-demo-key') !== DEMO_KEY) return res.sendStatus(401);
    next();
  });
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/ai/complete', async (req, res) => {
  try {
    const { prompt, filename, languageId, code } = req.body || {};
    if (!prompt || typeof code !== 'string') return res.status(400).json({ error: 'Missing prompt or code' });

    const sys = `You are a helpful coding assistant. Return COMPLETE runnable file content with brief comments. Keep same language and style.`;
    const user = `File: ${filename || 'current file'} (language: ${languageId || 'unknown'})
--- CURRENT CONTENT START ---
${code}
--- CURRENT CONTENT END ---
User request: ${prompt}
Return ONLY the new full file content for this file.`;

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
    });

    res.json({ result: resp.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// IMPORTANT: Render provides PORT env var. Listen on that.
const PORT = process.env.PORT || 8787;
app.listen(PORT, '0.0.0.0', () => console.log('AI gateway on :' + PORT));

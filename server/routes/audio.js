const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { safeError } = require('../utils');

const AUDIO_DIR = path.join(__dirname, '..', 'data', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Serve cached audio file
router.get('/speak/:word', (req, res) => {
  try {
    const word = encodeURIComponent(req.params.word);
    const filename = `${word}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return fs.createReadStream(filePath).pipe(res);
    }

    // If not cached, return 404 so frontend falls back to Web Speech API
    res.status(404).json({ error: 'Audio not cached' });
  } catch (error) {
    safeError(res, error);
  }
});

// Cache list of available audio files
router.get('/speak/available', (req, res) => {
  try {
    const files = fs.readdirSync(AUDIO_DIR)
      .filter(f => f.endsWith('.mp3'))
      .map(f => decodeURIComponent(path.basename(f, '.mp3')));
    res.json({ count: files.length, words: files });
  } catch (error) {
    safeError(res, error);
  }
});

// Batch generate TTS audio using Web Speech API simulation via edge-tts-style endpoint
// Since we can't use Web Speech API server-side, this endpoint downloads
// audio from Google TTS (free, no API key needed for non-commercial)
router.post('/speak/generate/:word', async (req, res) => {
  try {
    const word = req.params.word;
    const filename = `${encodeURIComponent(word)}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);

    if (fs.existsSync(filePath)) {
      return res.json({ cached: true, word });
    }

    // Try to fetch from Google TTS (free tier)
    let fetched = false;
    try {
      const https = require('https');
      const encodedText = encodeURIComponent(word);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodedText}`;

      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              fetched = true;
              resolve();
            });
          } else {
            file.close();
            fs.unlinkSync(filePath);
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on('error', (err) => {
          file.close();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        });
      });
    } catch (fetchErr) {
      console.warn(`TTS fetch failed for "${word}": ${fetchErr.message}`);
      // Clean up failed file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (fetched) {
      res.json({ cached: false, generated: true, word });
    } else {
      res.status(503).json({ error: 'TTS generation unavailable' });
    }
  } catch (error) {
    safeError(res, error);
  }
});

module.exports = router;

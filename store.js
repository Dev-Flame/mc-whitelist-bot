const fs = require('fs');
const path = require('path');

// Where to save data. In Docker this points at a mounted volume (/data)
// so the per-user limit survives restarts. Falls back to this folder.
const DIR = process.env.DATA_DIR || __dirname;
const FILE = path.join(DIR, 'whitelist-data.json');
const META_FILE = path.join(DIR, 'meta.json');

// --- Whitelist data: { discordUserId: [mcName, ...] } ---

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// --- Small extra data, like the player-list message id ---

function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveMeta(meta) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

module.exports = { load, save, loadMeta, saveMeta };

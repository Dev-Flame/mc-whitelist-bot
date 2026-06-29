const fs = require('fs');
const path = require('path');

// Where to save data. In Docker this points at a mounted volume (/data)
// so the per-user limit survives restarts. Falls back to this folder.
const DIR = process.env.DATA_DIR || __dirname;
const FILE = path.join(DIR, 'whitelist-data.json');

// Reads the saved data. Returns {} if the file doesn't exist yet.
function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Writes the data back to disk.
function save(data) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = { load, save };

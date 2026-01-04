'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.env.VALIDATE_ROOT || path.resolve(__dirname, '..');

const isIgnored = (filePath) => {
  const segments = filePath.split(path.sep);
  return segments.includes('node_modules') || segments.includes('.git');
};

const collectYamlFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...collectYamlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.yaml')) {
      files.push(fullPath);
    }
  }
  return files;
};

const validateFile = (file) => {
  try {
    const text = fs.readFileSync(file, 'utf8');
    yaml.load(text, { filename: file });
    return null;
  } catch (err) {
    const loc = err.mark ? `(line ${err.mark.line + 1}, col ${err.mark.column + 1})` : '';
    const msg = err.message ? err.message.replace(/\n/g, ' ').trim() : 'Unknown error';
    return `${file}: ${msg} ${loc}`.trim();
  }
};

const run = () => {
  const files = collectYamlFiles(ROOT);
  const errors = files.map(validateFile).filter(Boolean);

  if (errors.length) {
    console.error(`YAML validation failed with ${errors.length} error(s):`);
    errors.forEach((msg, idx) => console.error(`${idx + 1}. ${msg}`));
    process.exit(1);
  }

  console.log(`YAML validation passed on ${files.length} file(s).`);
};

run();

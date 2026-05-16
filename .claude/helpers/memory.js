#!/usr/bin/env node
/**
 * Claude Flow Memory Helper
 * Simple key-value memory for cross-session context
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEMORY_DIR = path.join(process.cwd(), '.claude-flow', 'data');
const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json');
const KEY_FILE = path.join(process.cwd(), '.claude-flow', 'master.key');

function getEncryptionKey() {
  if (process.env.CLAUDE_FLOW_ENCRYPTION_KEY) return Buffer.from(process.env.CLAUDE_FLOW_ENCRYPTION_KEY, 'hex');
  if (fs.existsSync(KEY_FILE)) return Buffer.from(fs.readFileSync(KEY_FILE, 'utf8'), 'hex');
  const newKey = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(KEY_FILE, newKey.toString('hex'), { mode: 0o600 });
  return newKey;
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

function decrypt(text) {
  if (!text.includes(':')) return text; // Fallback for legacy plain text
  try {
    const [ivHex, authTagHex, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch (e) { return '{}'; }
}

function validateKey(key) {
  if (key && !/^[a-zA-Z0-9_-]+$/.test(key)) {
    console.error('Invalid key format. Only alphanumeric characters, dashes, and underscores are allowed.');
    process.exit(1);
  }
}

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
      return JSON.parse(decrypt(raw));
    }
  } catch (e) {
    // Ignore
  }
  return {};
}

function saveMemory(memory) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(MEMORY_FILE, encrypt(JSON.stringify(memory, null, 2)), { mode: 0o600 });
}

const commands = {
  get: (key) => {
    validateKey(key);
    const memory = loadMemory();
    const value = key ? memory[key] : memory;
    console.log(JSON.stringify(value, null, 2));
    return value;
  },

  set: (key, value) => {
    if (!key) {
      console.error('Key required');
      return;
    }
    validateKey(key);
    const memory = loadMemory();
    memory[key] = value;
    memory._updated = new Date().toISOString();
    saveMemory(memory);
    console.log(`Set: ${key}`);
  },

  delete: (key) => {
    if (!key) {
      console.error('Key required');
      return;
    }
    validateKey(key);
    const memory = loadMemory();
    delete memory[key];
    saveMemory(memory);
    console.log(`Deleted: ${key}`);
  },

  clear: () => {
    saveMemory({});
    console.log('Memory cleared');
  },

  keys: () => {
    const memory = loadMemory();
    const keys = Object.keys(memory).filter(k => !k.startsWith('_'));
    console.log(keys.join('\n'));
    return keys;
  },
};

// CLI
const [,, command, key, ...valueParts] = process.argv;
const value = valueParts.join(' ');

if (command && commands[command]) {
  commands[command](key, value);
} else {
  console.log('Usage: memory.js <get|set|delete|clear|keys> [key] [value]');
}

module.exports = commands;

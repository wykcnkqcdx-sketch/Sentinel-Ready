#!/usr/bin/env node
/**
 * Claude Flow Session Manager
 * Handles session lifecycle: start, restore, end
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSION_DIR = path.join(process.cwd(), '.claude-flow', 'sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'current.json');
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

const commands = {
  start: () => {
    const sessionId = `session-${Date.now()}`;
    const session = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      cwd: process.cwd(),
      context: {},
      metrics: {
        edits: 0,
        commands: 0,
        tasks: 0,
        errors: 0,
      },
    };

    fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(SESSION_FILE, encrypt(JSON.stringify(session, null, 2)), { mode: 0o600 });

    console.log(`Session started: ${sessionId}`);
    return session;
  },

  restore: () => {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('No session to restore');
      return null;
    }

    const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
    session.restoredAt = new Date().toISOString();
    fs.writeFileSync(SESSION_FILE, encrypt(JSON.stringify(session, null, 2)), { mode: 0o600 });

    console.log(`Session restored: ${session.id}`);
    return session;
  },

  end: () => {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('No active session');
      return null;
    }

    const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
    session.endedAt = new Date().toISOString();
    session.duration = Date.now() - new Date(session.startedAt).getTime();

    // Archive session
    const archivePath = path.join(SESSION_DIR, `${session.id}.json`);
    fs.writeFileSync(archivePath, encrypt(JSON.stringify(session, null, 2)), { mode: 0o600 });
    fs.unlinkSync(SESSION_FILE);

    console.log(`Session ended: ${session.id}`);
    console.log(`Duration: ${Math.round(session.duration / 1000 / 60)} minutes`);
    console.log(`Metrics: ${JSON.stringify(session.metrics)}`);

    return session;
  },

  status: () => {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('No active session');
      return null;
    }

    const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
    const duration = Date.now() - new Date(session.startedAt).getTime();

    console.log(`Session: ${session.id}`);
    console.log(`Started: ${session.startedAt}`);
    console.log(`Duration: ${Math.round(duration / 1000 / 60)} minutes`);
    console.log(`Metrics: ${JSON.stringify(session.metrics)}`);

    return session;
  },

  update: (key, value) => {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('No active session');
      return null;
    }
    validateKey(key);

    const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
    session.context[key] = value;
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(SESSION_FILE, encrypt(JSON.stringify(session, null, 2)), { mode: 0o600 });

    return session;
  },

  get: (key) => {
    if (!fs.existsSync(SESSION_FILE)) return null;
    if (key) validateKey(key);
    try {
      const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
      return key ? (session.context || {})[key] : session.context;
    } catch { return null; }
  },

  metric: (name) => {
    if (!fs.existsSync(SESSION_FILE)) {
      return null;
    }
    validateKey(name);

    const session = JSON.parse(decrypt(fs.readFileSync(SESSION_FILE, 'utf-8')));
    if (session.metrics[name] !== undefined) {
      session.metrics[name]++;
      fs.writeFileSync(SESSION_FILE, encrypt(JSON.stringify(session, null, 2)), { mode: 0o600 });
    }

    return session;
  },
};

// CLI
const [,, command, ...args] = process.argv;

if (command && commands[command]) {
  commands[command](...args);
} else {
  console.log('Usage: session.js <start|restore|end|status|update|metric> [args]');
}

module.exports = commands;

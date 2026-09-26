import crypto from 'node:crypto';
import os from 'node:os';

export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export const cleanText = (value, max = 200) => String(value ?? '').trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);

export function normalizeUsername(value) {
  return cleanText(value, 32).toLocaleLowerCase('pt-BR');
}

export function joinCode() {
  const number = crypto.randomInt(0, 10_000).toString().padStart(4, '0');
  return `EIDRYSS-${number}`;
}

export function networkAddresses(port) {
  const addresses = [];
  try {
    for (const group of Object.values(os.networkInterfaces())) {
      for (const item of group || []) {
        if (item.family === 'IPv4' && !item.internal) addresses.push(`http://${item.address}:${port}`);
      }
    }
  } catch {
    return [];
  }
  return addresses;
}

export function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName, isBot: Boolean(user.isBot), createdAt: user.createdAt, presentation: { avatar: user.presentation?.avatar || '✦', accent: user.presentation?.accent || '#8b7cff' } };
}

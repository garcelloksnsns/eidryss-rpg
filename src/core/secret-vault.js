import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export class SecretVault {
  constructor(keyFile, key) {
    this.keyFile = keyFile;
    this.key = key;
  }

  static async open(keyFile) {
    await fs.mkdir(path.dirname(keyFile), { recursive: true });
    let key;
    try {
      key = Buffer.from((await fs.readFile(keyFile, 'utf8')).trim(), 'base64url');
      if (key.length !== 32) throw new Error('invalid key');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      key = crypto.randomBytes(32);
      try {
        await fs.writeFile(keyFile, `${key.toString('base64url')}\n`, { mode: 0o600, flag: 'wx' });
      } catch (writeError) {
        if (writeError.code !== 'EEXIST') throw writeError;
        key = Buffer.from((await fs.readFile(keyFile, 'utf8')).trim(), 'base64url');
      }
    }
    await fs.chmod(keyFile, 0o600).catch(() => {});
    return new SecretVault(keyFile, key);
  }

  encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decrypt(payload) {
    const [version, ivEncoded, tagEncoded, dataEncoded] = String(payload || '').split('.');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !dataEncoded) throw new Error('Credencial criptografada inválida.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivEncoded, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataEncoded, 'base64url')), decipher.final()]).toString('utf8');
  }
}

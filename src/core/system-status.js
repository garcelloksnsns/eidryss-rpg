import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STATUS = Object.freeze({
  maintenance: false,
  message: 'O mundo está sendo atualizado. Aguarde alguns instantes.',
  changedAt: null,
  clientRevision: 701,
});

export class SystemStatus {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.write(DEFAULT_STATUS);
    }
    return this;
  }

  async read() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      return {
        ...DEFAULT_STATUS,
        ...parsed,
        maintenance: Boolean(parsed?.maintenance),
        clientRevision: Number(parsed?.clientRevision || DEFAULT_STATUS.clientRevision),
      };
    } catch (error) {
      if (error.code === 'ENOENT') return { ...DEFAULT_STATUS };
      throw error;
    }
  }

  async write(next = {}) {
    const current = await this.read().catch(() => ({ ...DEFAULT_STATUS }));
    const status = {
      ...current,
      ...next,
      maintenance: Boolean(next.maintenance ?? current.maintenance),
      message: String(next.message ?? current.message ?? DEFAULT_STATUS.message).slice(0, 500),
      clientRevision: Math.max(1, Math.trunc(Number(next.clientRevision ?? current.clientRevision ?? DEFAULT_STATUS.clientRevision))),
      changedAt: new Date().toISOString(),
    };
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(status, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(tmp, this.filePath);
    return status;
  }
}

export { DEFAULT_STATUS };

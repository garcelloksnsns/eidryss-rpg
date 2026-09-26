import crypto from 'node:crypto';
import { parseCookies } from './core/security.js';

function frame(payload, opcode = 0x1) {
  const data = Buffer.from(payload);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length <= 65_535) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  return Buffer.concat([header, data]);
}

export class RealtimeHub {
  constructor(server, service) {
    this.channels = new Map();
    this.presence = new Map();
    this.closing = false;
    server.on('upgrade', (request, socket) => this.#upgrade(request, socket, service));
  }

  isOnline(campaignId, userId) {
    return (this.presence.get(campaignId)?.get(userId) || 0) > 0;
  }

  broadcast(campaignId, message) {
    const encoded = frame(JSON.stringify(message));
    for (const socket of this.channels.get(campaignId) || []) {
      if (!socket.destroyed && socket.writable) socket.write(encoded);
    }
  }

  close() {
    this.closing = true;
    for (const sockets of this.channels.values()) {
      for (const socket of sockets) socket.destroy();
    }
    this.channels.clear();
    this.presence.clear();
  }

  #upgrade(request, socket, service) {
    try {
      if(request.headers.origin&&new URL(request.headers.origin).host!==request.headers.host)return socket.destroy();
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname !== '/ws') return socket.destroy();
      const campaignId = url.searchParams.get('campaignId');
      const cookies = parseCookies(request.headers.cookie);
      const token = cookies.eidryss_session || cookies.germinal_session;
      const user = service.sessionUser(token);
      if (!user || !campaignId) return socket.destroy();
      service.campaignState(campaignId, user.id);
      const key = request.headers['sec-websocket-key'];
      if (!key || request.headers['sec-websocket-version'] !== '13') return socket.destroy();
      const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write([
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '\r\n',
      ].join('\r\n'));
      socket.setKeepAlive(true, 20_000);
      if (!this.channels.has(campaignId)) this.channels.set(campaignId, new Set());
      this.channels.get(campaignId).add(socket);
      if (!this.presence.has(campaignId)) this.presence.set(campaignId, new Map());
      const presence = this.presence.get(campaignId);
      presence.set(user.id, (presence.get(user.id) || 0) + 1);
      socket.write(frame(JSON.stringify({ type: 'CONNECTED', data: { campaignId } })));
      this.broadcast(campaignId, { type: 'PRESENCE_CHANGED', data: { userId: user.id, online: true } });
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return; cleaned = true;
        this.channels.get(campaignId)?.delete(socket);
        if (this.channels.get(campaignId)?.size === 0) this.channels.delete(campaignId);
        const current = this.presence.get(campaignId);
        if (current) {
          const next = Math.max(0, (current.get(user.id) || 1) - 1);
          if (next) current.set(user.id, next); else current.delete(user.id);
          if (!current.size) this.presence.delete(campaignId);
        }
        const onlineNow=this.isOnline(campaignId, user.id);
        this.broadcast(campaignId, { type: 'PRESENCE_CHANGED', data: { userId: user.id, online: onlineNow } });
        if(!onlineNow && !this.closing) service.handlePresenceChange?.(campaignId,user.id,false).catch((error)=>console.warn('[WARN] Não foi possível fechar turno após ausência:',error?.message||error));
      };
      socket.on('close', cleanup);
      socket.on('error', cleanup);
      socket.on('data', (data) => {
        const opcode = data[0] & 0x0f;
        if (opcode === 0x8) socket.end(frame('', 0x8));
      });
    } catch {
      socket.destroy();
    }
  }
}

#!/usr/bin/env node
// Lightweight WebSocket → SSH bridge for development.
// Matches the app protocol used by app/terminal/session.tsx
// Messages from client:
//  - { type: 'connect', host, port, username, password }
//  - { type: 'stdin', data }
//  - { type: 'resize', cols, rows }
// Messages to client:
//  - { type: 'data', data }
//  - { type: 'exit', code }
//  - { type: 'error', message }

const http = require('http');
const { WebSocketServer } = require('ws');
const { Client: SshClient } = require('ssh2');

const PORT = Number(process.env.PORT || 8080);
const PATH = process.env.PATHNAME || '/ws/ssh';

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ws-ssh-bridge alive\n');
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  let ssh;
  let stream;
  let closed = false;

  function send(obj) {
    if (closed || ws.readyState !== ws.OPEN) return;
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'connect') {
      if (ssh) return; // already connecting
      const { host, port = 22, username, password } = msg;
      if (!host || !username || !password) return send({ type: 'error', message: 'Missing credentials' });
      ssh = new SshClient();
      ssh
        .on('ready', () => {
          ssh.shell({ term: 'xterm-256color' }, (err, s) => {
            if (err) return send({ type: 'error', message: String(err.message || err) });
            stream = s;
            stream
              .on('data', (chunk) => send({ type: 'data', data: chunk.toString('utf8') }))
              .on('close', () => send({ type: 'exit' }))
              .stderr.on('data', (chunk) => send({ type: 'data', data: chunk.toString('utf8') }));
          });
        })
        .on('error', (e) => send({ type: 'error', message: String(e.message || e) }))
        .on('close', () => send({ type: 'exit' }))
        .connect({ host, port, username, password, readyTimeout: 10000 });
    } else if (msg.type === 'stdin' && stream) {
      stream.write(msg.data);
    } else if (msg.type === 'resize' && stream) {
      const cols = Number(msg.cols) || 80;
      const rows = Number(msg.rows) || 24;
      try { stream.setWindow(rows, cols, 600, 800); } catch {}
    }
  });

  ws.on('close', () => {
    closed = true;
    try { stream && stream.end(); } catch {}
    try { ssh && ssh.end(); } catch {}
  });
});

server.on('upgrade', (req, socket, head) => {
  if (req.url !== PATH) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`ws-ssh-bridge listening on http://0.0.0.0:${PORT}${PATH}`);
});


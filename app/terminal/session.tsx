import React, { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { View } from '@/components/Themed';

function buildHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css" />
  <style>
    html, body { height:100%; margin:0; background:#000; }
    #terminal { height:100%; }
  </style>
  <title>Terminal</title>
  <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.min.js"></script>
  <script>
    const term = new window.Terminal({ cursorBlink: true, fontFamily: 'Menlo, monospace', theme: { background: '#000000' } });
    function println(s){ term.writeln(s); }
    function init() {
      const el = document.getElementById('terminal');
      term.open(el);
      println('Connecting...');
      window.addEventListener('message', (e) => {
        try {
          const cfg = JSON.parse(e.data);
          startWs(cfg);
        } catch (err) {
          println('Invalid config');
        }
      }, { once: true });
    }
    let ws;
    function startWs(cfg){
      try { ws = new WebSocket(cfg.bridgeUrl); } catch(e) { println('WebSocket error: ' + e); return; }
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'connect', host: cfg.host, port: Number(cfg.port)||22, username: cfg.username, password: cfg.password }));
        term.onData(d => ws && ws.send(JSON.stringify({ type: 'stdin', data: d })));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'data') {
            term.write(msg.data);
          } else if (msg.type === 'exit') {
            println('\r\n[session closed]');
          } else if (msg.type === 'error') {
            println('\r\n[error] ' + (msg.message || ''));
          }
        } catch { term.write(ev.data); }
      };
      ws.onclose = () => println('\r\n[disconnected]');
      ws.onerror = () => println('\r\n[ws error]');
    }
    window.onload = init;
  </script>
</head>
<body>
  <div id="terminal"></div>
</body>
</html>`;
}

export default function TerminalSessionScreen() {
  const { host, port, username, password, bridgeUrl } = useLocalSearchParams<{
    host: string;
    port?: string;
    username: string;
    password: string;
    bridgeUrl: string;
  }>();
  const ref = useRef<WebView>(null);
  const html = useMemo(buildHtml, []);

  const cfg = useMemo(() => ({ host, port: port ?? '22', username, password, bridgeUrl }), [host, port, username, password, bridgeUrl]);

  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        onLoad={() => ref.current?.postMessage(JSON.stringify(cfg))}
        allowsBackForwardNavigationGestures
        allowFileAccess
        allowUniversalAccessFromFileURLs
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: '#000' },
});


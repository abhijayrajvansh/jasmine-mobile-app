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
    html, body { height:100%; margin:0; background:#000; color:#fff; font-family: Menlo, monospace; }
    #terminal { height:100%; }
    #fallback { padding: 8px; white-space: pre-wrap; font-size: 13px; }
  </style>
  <title>Terminal</title>
  <script>
    function rnpost(obj){ try { (window.ReactNativeWebView||window).postMessage(JSON.stringify(obj)); } catch(e){} }
    window.onerror = function(message, source, lineno, colno){ rnpost({ type: 'error', message, source, lineno, colno }); };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.min.js"></script>
  <script>
    function createTerm(){
      try {
        if (!window.Terminal || !window.FitAddon) throw new Error('xterm not loaded');
        const term = new window.Terminal({ cursorBlink: true, fontFamily: 'Menlo, monospace', theme: { background: '#000000', foreground: '#ffffff' } });
        const fit = new (window).FitAddon.FitAddon();
        term.loadAddon(fit);
        return { term, fit };
      } catch (e) { return null; }
    }
    function init() {
      const el = document.getElementById('terminal');
      const fb = document.getElementById('fallback');
      const c = createTerm();
      let term, fit;
      if (c) {
        term = c.term; fit = c.fit;
        term.open(el);
        try { fit.fit(); } catch(e) {}
        term.focus();
      } else {
        el.style.display = 'none';
        fb.style.display = 'block';
        fb.textContent = 'Loading terminal...';
      }
      function println(s){ if (term) term.writeln(s); else fb.textContent += "\n" + s; }
      println('Connecting...');
      const handler = (e) => {
        try { const cfg = JSON.parse(e.data); startWs(cfg, term, println); }
        catch (err) { println('Invalid config'); rnpost({ type:'error', message: String(err)}); }
      };
      window.addEventListener('message', handler, { once: true });
      document.addEventListener('message', handler, { once: true });
      window.startWithConfig = (cfg) => { try { startWs(cfg, term, println); } catch (e) { println('Start error'); rnpost({ type:'error', message:String(e)}); } };
      window.addEventListener('resize', () => { try { if (term) notifyResize(term); } catch(e){} });
    }
    let ws;
    function startWs(cfg, term, println){
      try { ws = new WebSocket(cfg.bridgeUrl); } catch(e) { println('WebSocket error: ' + e); rnpost({ type:'error', message: String(e)}); return; }
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'connect', host: cfg.host, port: Number(cfg.port)||22, username: cfg.username, password: cfg.password }));
        if (term) term.onData(d => ws && ws.send(JSON.stringify({ type: 'stdin', data: d })));
        notifyResize(term);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'data') {
            if (term) term.write(msg.data); else println(msg.data);
          } else if (msg.type === 'exit') {
            println('\r\n[session closed]');
          } else if (msg.type === 'error') {
            println('\r\n[error] ' + (msg.message || ''));
          }
        } catch { if (term) term.write(ev.data); else println(String(ev.data)); }
      };
      ws.onclose = () => println('\r\n[disconnected]');
      ws.onerror = () => { println('\r\n[ws error]'); rnpost({ type:'error', message:'ws error'}); };
    }
    function notifyResize(term){
      if (!ws || !term) return;
      try {
        const cols = term.cols; const rows = term.rows;
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      } catch {}
    }
    window.onload = init;
  </script>
</head>
<body>
  <div id="terminal"></div>
  <div id="fallback" style="display:none"></div>
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
        onError={(e) => { console.log('WebView error', e.nativeEvent); }}
        onHttpError={(e) => { console.log('WebView http error', e.nativeEvent); }}
        onLoad={() => ref.current?.injectJavaScript(`window.startWithConfig(${JSON.stringify(cfg)}); true;`)}
        allowsBackForwardNavigationGestures
        allowFileAccess
        allowUniversalAccessFromFileURLs
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type === 'error') console.log('Terminal error:', msg);
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: '#000' },
});

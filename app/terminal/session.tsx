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
  <style>
    html, body { height:100%; margin:0; background:#000; color:#fff; font-family: Menlo, monospace; }
    #out { position:absolute; top:0; left:0; right:0; bottom:0; padding:8px; overflow:auto; white-space:pre-wrap; outline:none; }
    #overlay { position:absolute; bottom:8px; left:0; right:0; text-align:center; opacity:0.6; font-size:12px; }
  </style>
  <title>Terminal</title>
  <script>
    function rnpost(obj){ try { (window.ReactNativeWebView||window).postMessage(JSON.stringify(obj)); } catch(e){} }
    window.onerror = function(message, source, lineno, colno){ rnpost({ type: 'error', message, source, lineno, colno }); };
    let ws; let outEl; let overlay;
    function write(s){ try { outEl.textContent += s; outEl.scrollTop = outEl.scrollHeight; } catch(e){} }
    function send(data){ try { ws && ws.readyState===1 && ws.send(JSON.stringify({ type:'stdin', data })); } catch(e){} }
    function keyToSeq(ev){
      if (ev.key === 'Enter') return '\n';
      if (ev.key === 'Backspace') return '\b';
      if (ev.key === 'Tab') return '\t';
      if (ev.ctrlKey && ev.key.toLowerCase() === 'c') return '\u0003';
      if (ev.ctrlKey && ev.key.toLowerCase() === 'd') return '\u0004';
      if (ev.key && ev.key.length === 1) return ev.key;
      return '';
    }
    function startWs(cfg){
      try { ws = new WebSocket(cfg.bridgeUrl); } catch(e){ write('\n[ws error] ' + e); rnpost({type:'error', message:String(e)}); return; }
      ws.onopen = () => {
        ws.send(JSON.stringify({ type:'connect', host: cfg.host, port: Number(cfg.port)||22, username: cfg.username, password: cfg.password }));
        write('Connecting...\n');
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'data') write(msg.data);
          else if (msg.type === 'exit') write('\n[session closed]');
          else if (msg.type === 'error') write('\n[error] ' + (msg.message||''));
        } catch { write(String(ev.data)); }
      };
      ws.onclose = () => write('\n[disconnected]');
      ws.onerror = () => write('\n[ws error]');
    }
    function init(){
      outEl = document.getElementById('out');
      overlay = document.getElementById('overlay');
      outEl.setAttribute('contenteditable', 'true');
      outEl.addEventListener('keydown', (ev) => {
        const seq = keyToSeq(ev);
        if (seq) { ev.preventDefault(); send(seq); }
      });
      outEl.addEventListener('beforeinput', (ev) => { ev.preventDefault(); });
      document.body.addEventListener('click', () => { outEl.focus(); if (overlay) overlay.style.display='none'; });
      const handler = (e) => { try { const cfg = JSON.parse(e.data); startWs(cfg); } catch(err){ write('\n[config error]'); rnpost({type:'error', message:String(err)});} };
      window.addEventListener('message', handler, { once:true });
      document.addEventListener('message', handler, { once:true });
      window.startWithConfig = (cfg) => { try { startWs(cfg); } catch(e){ write('\n[start error]'); rnpost({type:'error', message:String(e)});} };
      write('Ready. Tap to focus and type.\n');
    }
    window.onload = init;
  </script>
</head>
<body>
  <div id="out"></div>
  <div id="overlay">Tap anywhere to focus (Enter, ⌫, Ctrl+C supported).</div>
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

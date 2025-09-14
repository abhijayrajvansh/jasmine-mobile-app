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
    #out { position:absolute; top:0; left:0; right:0; bottom:48px; padding:8px; overflow:auto; white-space:pre-wrap; }
    #bar { position:absolute; left:0; right:0; bottom:0; height:48px; display:flex; align-items:center; gap:8px; padding:8px; background:#111; border-top:1px solid #222; }
    #in { flex:1; background:#000; color:#fff; border:1px solid #333; border-radius:6px; padding:8px; font-family: Menlo, monospace; }
    #hint { font-size:12px; opacity:0.7; }
  </style>
  <title>Terminal</title>
  <script>
    function rnpost(obj){ try { (window.ReactNativeWebView||window).postMessage(JSON.stringify(obj)); } catch(e){} }
    window.onerror = function(message, source, lineno, colno){ rnpost({ type: 'error', message, source, lineno, colno }); };
    let ws; let outEl; let inEl;
    function write(s){ try { outEl.textContent += s; outEl.scrollTop = outEl.scrollHeight; } catch(e){} }
    function send(data){ try { ws && ws.readyState===1 && ws.send(JSON.stringify({ type:'stdin', data })); } catch(e){}
    }
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
      inEl = document.getElementById('in');
      inEl.addEventListener('keydown', (ev) => {
        const seq = keyToSeq(ev);
        if (seq) { ev.preventDefault(); send(seq); }
      });
      document.body.addEventListener('click', () => inEl.focus());
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
  <div id="bar">
    <input id="in" placeholder="Type here…" />
    <div id="hint">Enter sends, ⌫ backspace, Ctrl+C</div>
  </div>
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

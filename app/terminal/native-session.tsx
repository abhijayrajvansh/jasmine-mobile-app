import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { View } from '@/components/Themed';
import { createSshSession } from '@/lib/nativeSsh';

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
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.min.js"></script>
  <script>
    const term = new window.Terminal({ cursorBlink: true, fontFamily: 'Menlo, monospace', theme: { background: '#000000', foreground: '#ffffff' } });
    const fit = new (window).FitAddon.FitAddon();
    term.loadAddon(fit);
    function println(s){ term.writeln(s); }
    function init() {
      const el = document.getElementById('terminal');
      term.open(el);
      try { fit.fit(); } catch(e) {}
      term.focus();
      println('Direct SSH mode');
      term.onData(d => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stdin', data: d })));
    }
    function writeData(data){ term.write(data); }
    function notify(msg){ println(msg); }
    window.addEventListener('resize', () => { try { fit.fit(); } catch(e){} });
    window.onload = init;
  </script>
  </head>
  <body>
    <div id="terminal"></div>
  </body>
  </html>`;
}

export default function NativeSshSessionScreen() {
  const { host, port, username, password } = useLocalSearchParams<{
    host: string;
    port?: string;
    username: string;
    password: string;
  }>();
  const ref = useRef<WebView>(null);
  const html = useMemo(buildHtml, []);

  const sessionRef = useRef<ReturnType<typeof createSshSession> | null>(null);
  useEffect(() => {
    const p = Number(port ?? '22') || 22;
    const session = createSshSession({ host, port: p, username, password });
    sessionRef.current = session;

    const unsubData = session.onData((chunk) => {
      ref.current?.injectJavaScript(`window.writeData(${JSON.stringify(chunk)}); true;`);
    });
    const unsubExit = session.onExit((code) => {
      ref.current?.injectJavaScript(`window.notify('\\r\\n[session closed${typeof code === 'number' ? ' '+code : ''}]'); true;`);
    });
    const unsubErr = session.onError((msg) => {
      ref.current?.injectJavaScript(`window.notify('\\r\\n[error] ' + ${JSON.stringify(msg)}); true;`);
    });

    // On first load, warn if not available on this platform
    if (Platform.OS === 'web') {
      Alert.alert('Not supported in web preview', 'Direct SSH requires a native build (iOS/Android).');
    }

    return () => {
      unsubData();
      unsubExit();
      unsubErr();
      session.close();
      sessionRef.current = null;
    };
  }, [host, port, username, password]);

  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type === 'stdin' && typeof msg.data === 'string') {
              sessionRef.current?.write(msg.data);
            }
          } catch {
            // ignore
          }
        }}
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

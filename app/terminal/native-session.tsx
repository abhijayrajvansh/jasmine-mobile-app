import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { createSshSession, isNativeSshAvailable } from '@/lib/nativeSsh';

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
    if (!isNativeSshAvailable()) {
      if (Platform.OS === 'web') {
        Alert.alert('Direct SSH unavailable', 'Web preview cannot run Direct SSH. Use the WebSocket bridge mode or build a native dev client.');
      } else {
        Alert.alert('Direct SSH unavailable', 'Native SSH module not found. Build a dev client with the native module or use the WebSocket bridge mode.');
      }
      return;
    }
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
      {!isNativeSshAvailable() ? (
        <View style={styles.unavailableBox}>
          <Text style={styles.unavailableTitle}>Direct SSH not available</Text>
          <Text style={styles.unavailableHelp}>
            Use the WebSocket bridge mode (turn off "Use Direct SSH"), or build a native dev client that includes the SSH
            module.
          </Text>
        </View>
      ) : null}
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
  unavailableBox: { position: 'absolute', zIndex: 2, top: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.8)' },
  unavailableTitle: { fontSize: 16, fontWeight: '600' },
  unavailableHelp: { marginTop: 6, opacity: 0.8 },
});

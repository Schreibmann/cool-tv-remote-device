import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type MoveMessage = { type: 'move'; dx: number; dy: number };
type ClickMessage = { type: 'click'; button: 'left' | 'right'; count?: number };
type ScrollMessage = { type: 'scroll'; dx: number; dy: number };
type TextMessage = { type: 'text'; text: string };
type KeyMessage = { type: 'key'; key: string; action?: 'down' | 'up' | 'tap' };
type OutgoingMessage = MoveMessage | ClickMessage | ScrollMessage | TextMessage | KeyMessage;

export default function App(): JSX.Element {
  const [endpoint, setEndpoint] = useState<string>('ws://192.168.0.2:8765');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = (): void => {
    try {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
      const ws = new WebSocket(endpoint);
      wsRef.current = ws;
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
    } catch {
      setIsConnected(false);
    }
  };

  const disconnect = (): void => {
    try {
      wsRef.current?.close();
    } catch { /* noop */ }
    wsRef.current = null;
  };

  const send = (obj: OutgoingMessage): void => {
    const ws = wsRef.current;
    if (ws && isConnected) {
      try {
        ws.send(JSON.stringify(obj));
      } catch {
        // ignore
      }
    }
  };

  // Touchpad pan handling
  const lastDx = useRef<number>(0);
  const lastDy = useRef<number>(0);

  const padResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          lastDx.current = 0;
          lastDy.current = 0;
        },
        onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
          const dxIncrement = gesture.dx - lastDx.current;
          const dyIncrement = gesture.dy - lastDy.current;
          lastDx.current = gesture.dx;
          lastDy.current = gesture.dy;
          if (Math.abs(dxIncrement) > 0 || Math.abs(dyIncrement) > 0) {
            const scale = 1.0; // tune sensitivity if needed
            send({ type: 'move', dx: Math.round(dxIncrement * scale), dy: Math.round(dyIncrement * scale) });
          }
        },
        onPanResponderRelease: () => {
          lastDx.current = 0;
          lastDy.current = 0;
        },
      }),
    [isConnected]
  );

  // Scroll bar pan handling (vertical)
  const scrollLastDy = useRef<number>(0);
  const scrollResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          scrollLastDy.current = 0;
        },
        onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
          const dyInc = gesture.dy - scrollLastDy.current;
          scrollLastDy.current = gesture.dy;
          if (Math.abs(dyInc) > 0) {
            const scrollUnits = Math.sign(dyInc) * Math.max(1, Math.floor(Math.abs(dyInc) / 4));
            send({ type: 'scroll', dx: 0, dy: scrollUnits });
          }
        },
        onPanResponderRelease: () => {
          scrollLastDy.current = 0;
        },
      }),
    [isConnected]
  );

  const onLeftClick = (): void => send({ type: 'click', button: 'left', count: 1 });
  const onRightClick = (): void => send({ type: 'click', button: 'right', count: 1 });

  const [text, setText] = useState<string>('');
  const sendText = (): void => {
    const trimmed = text;
    if (trimmed.length > 0) {
      send({ type: 'text', text: trimmed });
      setText('');
    }
  };

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          placeholder="ws://IP:8765"
          value={endpoint}
          onChangeText={setEndpoint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isConnected ? (
          <TouchableOpacity onPress={disconnect} style={[styles.button, styles.danger]}>
            <Text style={styles.buttonText}>Отключить</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={connect} style={[styles.button, styles.primary]}>
            <Text style={styles.buttonText}>Подключить</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.main}>
        <View style={styles.touchpad} {...padResponder.panHandlers}>
          <Text style={styles.hint}>{isConnected ? 'Тачпад активен' : 'Сначала подключитесь'}</Text>
        </View>
        <View style={styles.scroll} {...scrollResponder.panHandlers}>
          <Text style={styles.hint}>Скролл</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onLeftClick} style={[styles.button, styles.secondary]}>
          <Text style={styles.buttonText}>ЛКМ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRightClick} style={[styles.button, styles.secondary]}>
          <Text style={styles.buttonText}>ПКМ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dpadBlock}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'dpad_up', action: 'tap' })} style={[styles.button, styles.secondary]}>
            <Text style={styles.buttonText}>▲</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'dpad_left', action: 'tap' })} style={[styles.button, styles.secondary]}>
            <Text style={styles.buttonText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'enter', action: 'tap' })} style={[styles.button, styles.primary]}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'dpad_right', action: 'tap' })} style={[styles.button, styles.secondary]}>
            <Text style={styles.buttonText}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'dpad_down', action: 'tap' })} style={[styles.button, styles.secondary]}>
            <Text style={styles.buttonText}>▼</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'back', action: 'tap' })} style={[styles.button, styles.secondary, { flex: 1 }]}>
            <Text style={styles.buttonText}>Назад</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => send({ type: 'key', key: 'home', action: 'tap' })} style={[styles.button, styles.secondary, { flex: 1 }]}>
            <Text style={styles.buttonText}>Домой</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.keyboardRow}>
        <TextInput
          style={styles.textSend}
          placeholder="Введите текст и нажмите Отправить"
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={sendText}
          blurOnSubmit={true}
        />
        <TouchableOpacity onPress={sendText} style={[styles.button, styles.primary]}>
          <Text style={styles.buttonText}>Отправить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingTop: 42,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primary: { backgroundColor: '#3b82f6' },
  secondary: { backgroundColor: '#4b5563' },
  danger: { backgroundColor: '#ef4444' },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  touchpad: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    width: 64,
    backgroundColor: '#111827',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
    justifyContent: 'space-between',
  },
  dpadBlock: {
    gap: 8,
    marginBottom: 8,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dpadSpacer: {
    flex: 1,
  },
  keyboardRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  textSend: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  hint: { color: '#9ca3af' },
});



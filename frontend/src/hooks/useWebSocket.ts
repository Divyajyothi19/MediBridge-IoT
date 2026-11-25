import { useEffect, useRef, useCallback, useState } from 'react';
import { useVoice } from './useVoice';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsMessage {
  type: 'event' | 'compartment_state' | 'alert' | 'device_status' | 'caregiver_update' | string;
  data?: Record<string, unknown>;
  action?: string;
  caregiver?: Record<string, unknown>;
  caregiver_id?: number;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  onMessage?: (msg: WsMessage) => void;
  voiceSettings: { enabled: boolean; volume: number; language: string };
}

export function useWebSocket({ onMessage, voiceSettings }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualClose = useRef(false);
  const voice = useVoice(voiceSettings);

  const connect = useCallback(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${host}:8000`;
    setStatus('connecting');

    try {
      const ws = new WebSocket(`${wsUrl}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectDelay.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          // Voice announcements based on message type/event
          if (msg.type === 'event') {
            const eventType = msg.data?.event_type as string;
            const compartmentName = msg.data?.medicine_name as string || `Compartment ${msg.data?.compartment_id}`;
            const compartmentNumber = msg.data?.compartment_id as number;
            const medicineName = msg.data?.medicine_name as string;

            if (eventType === 'compartment_opened') {
              voice.announceCompartmentOpened(compartmentName);
            } else if (eventType === 'wrong_compartment') {
              voice.announceWrongCompartment();
            } else if (eventType === 'stock_empty') {
              voice.announceStockEmpty(compartmentName);
            } else if (eventType === 'reminder_started') {
              voice.announceReminder(medicineName || 'medicine', compartmentNumber);
            }
          } else if (msg.type === 'alert') {
            const alertType = msg.data?.alert_type as string;
            if (alertType === 'wrong_compartment') {
              voice.announceWrongCompartment();
            }
          }

          onMessage?.(msg);
        } catch {
          // Invalid JSON — ignore
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (!manualClose.current) {
          // Exponential backoff
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        ws.close();
      };
    } catch {
      setStatus('error');
    }
  }, [onMessage, voice]);

  const disconnect = useCallback(() => {
    manualClose.current = true;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    manualClose.current = false;
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      manualClose.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send, disconnect, reconnect };
}

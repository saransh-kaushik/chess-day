import { useEffect, useRef, useState, useCallback } from 'react';

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendMove: (uci: string) => void;
  sendResign: () => void;
  sendDrawOffer: () => void;
  sendDrawAccept: () => void;
  sendDrawDecline: () => void;
  lastMessage: WSMessage | null;
  connectionError: string | null;
}

/**
 * Manages a WebSocket connection for online chess games.
 *
 * @param url - Full WebSocket URL (e.g. ws://localhost:8000/online/game/xyz).
 *              Pass null to skip connecting.
 * @param token - Optional JWT to send as first auth message on connect.
 */
export const useWebSocket = (
  url: string | null,
  token?: string
): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Track whether the component is still mounted
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setConnectionError(null);
        // Send auth token as the first message
        if (token) {
          ws.send(JSON.stringify({ token }));
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data: WSMessage = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          console.error('Invalid WebSocket message:', event.data);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnectionError('Connection error. Retrying…');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        // Auto-reconnect on unexpected close (not code 1000 = normal close)
        if (event.code !== 1000 && mountedRef.current) {
          setTimeout(() => {
            if (mountedRef.current) connect();
          }, 2000);
        }
      };
    };

    connect();

    return () => {
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [url, token]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    isConnected,
    sendMove: (uci) => sendMessage({ type: 'move', uci }),
    sendResign: () => sendMessage({ type: 'resign' }),
    sendDrawOffer: () => sendMessage({ type: 'draw_offer' }),
    sendDrawAccept: () => sendMessage({ type: 'draw_accept' }),
    sendDrawDecline: () => sendMessage({ type: 'draw_decline' }),
    lastMessage,
    connectionError,
  };
};

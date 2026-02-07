import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageItem } from '@/lib/portal/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

interface UseProjectSocketOptions {
  projectId: string;
  enabled: boolean;
  onNewMessage?: (message: MessageItem) => void;
}

export function useProjectSocket({
  projectId,
  enabled,
  onNewMessage,
}: UseProjectSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!enabled || !projectId) return;

    const socket = io(`${API_BASE_URL}/ws`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinProject', { projectId });
    });

    socket.on('newMessage', (message: MessageItem) => {
      callbackRef.current?.(message);
    });

    return () => {
      socket.emit('leaveProject', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, enabled]);
}

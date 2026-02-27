
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthHeaders } from '../utils/auth';
import type { Notification } from '../types/notification';

/*
  실시간 알림(SSE) 및 알림 데이터 관리를 위한 커스텀 훅입니다.
  - 초기 알림 데이터 로딩 및 SSE 연결 관리
  - 새로운 알림 수신 시 상태 업데이트
  - 알림 읽음 처리 및 삭제 기능 제공
*/

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        fetch('/api/notifications/me?size=10', { headers: getAuthHeaders() }),
        fetch('/api/notifications/unread-count', { headers: getAuthHeaders() })
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setNotifications(data.items);
      }
      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // useMcp와 유사하게 토큰 처리
    const token = localStorage.getItem('mcp_api_token');
    const url = token ? `/api/notifications/stream?token=${token}` : '/api/notifications/stream';
    
    const source = new EventSource(url);
    eventSourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
      console.log('Notification SSE connected');
    };

    source.addEventListener('notification', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received notification event:', data);
        
        if (data.type === 'new_notification') {
          // 새로운 알림이 오면 목록 앞에 추가 (최신 10개 유지)
          // 실제로는 fetchInitialData를 다시 부르는게 더 정확할 수도 있음
          fetchInitialData();
          
          // 브라우저 기본 알림 (선택 사항)
          if (Notification.permission === 'granted') {
             new window.Notification(data.title, { body: data.message });
          }
        } else if (data.type === 'unread_count_update') {
          setUnreadCount(data.unread_count);
        }
      } catch (err) {
        console.error('Failed to parse notification event:', err);
      }
    });

    source.onerror = () => {
      setConnected(false);
      console.warn('Notification SSE error, reconnecting...');
      source.close();
    };

    return source;
  }, [fetchInitialData]);

  useEffect(() => {
    fetchInitialData();
    const source = connectSSE();

    // 브라우저 알림 권한 요청
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }

    return () => {
      source.close();
    };
  }, [fetchInitialData, connectSSE]);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: 'Y', read_dt: new Date().toISOString() } : n)
        );
        // 서버에서 SSE로 unread_count_update를 보내주므로 여기서 직접 줄이지 않아도 됨
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    connected,
    markAsRead,
    deleteNotification,
    refresh: fetchInitialData
  };
}

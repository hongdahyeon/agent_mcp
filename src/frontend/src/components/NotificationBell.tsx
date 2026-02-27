import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, User } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { clsx } from 'clsx';
import type { Notification } from '../types/notification';

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose, onRead, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            알림 상세
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              <User className="w-3 h-3" />
              <span>보낸이: {notification.send_user_nm || '시스템'}</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-slate-200">{notification.title}</h4>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{notification.reg_dt}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl min-h-[100px] whitespace-pre-wrap text-gray-700 dark:text-slate-300">
            {notification.message}
          </div>
        </div>
        <div className="p-6 pt-0 flex space-x-2">
          {notification.is_read === 'N' ? (
             <button
              onClick={() => onRead(notification.id)}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
            >
              <Check className="w-4 h-4" />
              <span>읽음 확인</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onDelete(notification.id);
                onClose();
              }}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-semibold py-3 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>삭제하기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "relative p-2 rounded-xl transition-all duration-300",
          isOpen ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
        )}
        title="알림"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Backdrop for mobile */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-[2px] z-20" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden z-30 animate-in slide-in-from-top-5 duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h4 className="font-bold text-gray-800 dark:text-slate-200">알림</h4>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
              {unreadCount}개 읽지 않음
            </span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    setSelectedNotification(notif);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-50 dark:border-slate-800/50 last:border-0",
                    notif.is_read === 'N' ? "bg-blue-50/30 dark:bg-blue-900/10" : "opacity-70"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className={clsx(
                      "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                      notif.is_read === 'N' ? "bg-blue-500" : "bg-transparent"
                    )} />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={clsx("text-sm font-semibold truncate", notif.is_read === 'N' ? "text-gray-900 dark:text-slate-100" : "text-gray-500 dark:text-slate-400")}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded flex items-center shrink-0 ml-2">
                          <User className="w-2.5 h-2.5 mr-1" />
                          {notif.send_user_nm || '시스템'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                        {notif.reg_dt}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">알림 내역이 없습니다.</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-50 dark:border-slate-800 text-center">
             <button 
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              onClick={() => {
                // 관리 페이지로 이동 등의 로직
                setIsOpen(false);
              }}
            >
              모든 알림 보기
            </button>
          </div>
        </div>
      )}

      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onRead={(id) => {
            markAsRead(id);
            // 모달 내 버튼을 즉시 '삭제'로 바꾸기 위해 선택된 알림 상태 업데이트
            setSelectedNotification(prev => prev ? { ...prev, is_read: 'Y' } : null);
          }}
          onDelete={(id) => deleteNotification(id)}
        />
      )}
    </div>
  );
};

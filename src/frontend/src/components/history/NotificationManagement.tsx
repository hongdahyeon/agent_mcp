import clsx from 'clsx';
import {
    BellRing,
    CheckCircle,
    Filter,
    RefreshCw,
    Send,
    Trash2,
    User,
    X,
    Search
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { getAuthHeaders } from '../../utils/auth';
import { Pagination } from '../common/Pagination';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotificationLog {
    id: number;
    receive_user_uid: number;
    receive_user_id: string;
    receive_user_nm: string;
    title: string;
    message: string;
    reg_dt: string;
    is_read: string;
    read_dt: string | null;
    delete_at: string | null;
    send_user_uid: number | null;
    send_user_id: string | null;
    send_user_nm: string | null;
}

interface MiniUser {
    uid: number;
    user_id: string;
    user_nm: string;
}

export const NotificationManagement: React.FC = () => {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [includeDeleted, setIncludeDeleted] = useState(true);

    // Send Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [users, setUsers] = useState<MiniUser[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [selectedUser, setSelectedUser] = useState<MiniUser | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchLogs = useCallback(async (pageNum: number = page) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/notifications/admin?page=${pageNum}&size=${pageSize}&include_deleted=${includeDeleted}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.items || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, includeDeleted]);

    const fetchUsers = async () => {
        try {
            // 사용자 목록 조회 (간소화된 API 호출 또는 기존 API 활용)
            const res = await fetch('/api/users?page=1&size=100', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.items || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [fetchLogs, page]);

    const handleOpenSendModal = () => {
        fetchUsers();
        setIsModalOpen(true);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !title || !message) {
            const alertMessage = t('nmAlertFillAll');
            alert(alertMessage);
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receive_user_uid: selectedUser.uid,
                    title,
                    message
                })
            });

            if (res.ok) {
                const alertMessage = t('nmAlertSent');
                alert(alertMessage);
                setIsModalOpen(false);
                setSelectedUser(null);
                setTitle('');
                setMessage('');
                fetchLogs(1);
            } else {
                const data = await res.json();
                throw new Error(data.detail || t('nmSendFail'));
            }
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : t('nmErrUnknown');
            const alertMessage = t('nmAlertSendErr').replace('{error}', errorMsg);
            alert(alertMessage);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmMessage = t('nmConfirmDelete');
        if (!confirm(confirmMessage)) return;
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                fetchLogs(page);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filteredUsers = users.filter(u => 
        u.user_id.toLowerCase().includes(searchUser.toLowerCase()) || 
        u.user_nm.toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <BellRing className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('nmTitle')}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('nmSubtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIncludeDeleted(!includeDeleted)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border",
                            includeDeleted 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400"
                                : "bg-white border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        {t('nmIncludeDeleted')}
                    </button>
                    <button
                        onClick={handleOpenSendModal}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        {t('nmSendBtn')}
                    </button>
                    <button
                        onClick={() => fetchLogs()}
                        className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors"
                    >
                        <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </header>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t('nmThSender')}</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t('nmThRecipient')}</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t('nmThSubjectContent')}</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t('nmThRegTime')}</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t('nmThReadStatus')}</th>
                                <th className="px-6 py-3 text-center font-medium text-gray-500 dark:text-slate-400">{t('nmThAction')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">{t('nmNoHistory')}</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={clsx("hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors", log.delete_at && "opacity-60 bg-gray-50/30")}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-700 dark:text-slate-200">{log.send_user_nm || t('nmSystem')}</span>
                                                <span className="text-[11px] text-gray-400">{log.send_user_id || 'SYSTEM'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-indigo-700 dark:text-indigo-400">{log.receive_user_nm}</span>
                                                <span className="text-[11px] text-gray-400">{log.receive_user_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-slate-100 truncate">{log.title}</span>
                                                <span className="text-gray-500 dark:text-slate-400 truncate text-xs">{log.message}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-gray-500">
                                            {log.reg_dt}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ring-1 w-fit",
                                                    log.is_read === 'Y' 
                                                        ? "bg-green-50 text-green-700 ring-green-100 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-800"
                                                        : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800"
                                                )}>
                                                    {log.is_read === 'Y' ? t('nmRead') : t('nmUnread')}
                                                </span>
                                                {log.read_dt && (
                                                    <span className="text-[10px] text-gray-400">{log.read_dt}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {log.delete_at ? (
                                                    <span className="text-[11px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{t('nmDeletedAt').replace('{time}', log.delete_at)}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDelete(log.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('nmDelete')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* SEND MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800">
                        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-900/10">
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('nmModalTitle')}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={handleSend} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" /> {t('nmSelectRecipient')}
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={t('nmSearchPlaceholder')}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-slate-200"
                                        value={searchUser}
                                        onChange={(e) => setSearchUser(e.target.value)}
                                    />
                                </div>
                                
                                <div className="max-h-32 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl divide-y divide-gray-50 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-inner mt-1">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-400">{t('nmNoSearchResults')}</div>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <div 
                                                key={user.uid}
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setSearchUser(user.user_nm);
                                                }}
                                                className={clsx(
                                                    "p-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
                                                    selectedUser?.uid === user.uid && "bg-indigo-100/50 dark:bg-indigo-900/40"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{user.user_nm}</span>
                                                    <span className="text-[10px] text-gray-400">{user.user_id}</span>
                                                </div>
                                                {selectedUser?.uid === user.uid && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('nmInputTitle')}</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-slate-200"
                                    placeholder={t('nmTitlePlaceholder')}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('nmInputMessage')}</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-slate-200 min-h-[120px] resize-none"
                                    placeholder={t('nmMessagePlaceholder')}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                            </div>
                        </form>

                        <footer className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                {t('nmCancel')}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                            >
                                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {t('nmSendNow')}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

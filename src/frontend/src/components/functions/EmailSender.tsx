import { AlertCircle, Calendar, CheckCircle, Clock, Eye, RefreshCw, RotateCw, Send, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { EmailLog } from '../../types/emailSend';
import { getAuthHeaders } from '../../utils/auth';
import { Pagination } from '../common/Pagination';
import { useLanguage } from '../../contexts/LanguageContext';


export const EmailSender: React.FC = () => {
    const { t } = useLanguage();
    // API State
    const [apiLoading, setApiLoading] = useState(false);

    // Form State
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDt, setScheduledDt] = useState('');

    // Logs State
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Detail Modal State
    const [detailLog, setDetailLog] = useState<EmailLog | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const fetchLogs = React.useCallback(async (pageNum: number = page, size: number = pageSize) => {
        setLoadingLogs(true);
        try {
            // all_logs=false(기본값)로 호출하여 내 이력만 조회
            const res = await fetch(`/api/email/logs?page=${pageNum}&size=${size}&all_logs=false`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.logs) {
                    setLogs(data.logs);
                    setTotal(data.total || 0);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLogs(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchLogs(page, pageSize);
    }, [fetchLogs, page, pageSize]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recipient || !subject || !content) {
            const message = t('emailErrFillAll');
            alert(message);
            return;
        }

        if (isScheduled && !scheduledDt) {
            const message = t('emailErrScheduledDt');
            alert(message);
            return;
        }

        const payload = {
            recipient,
            subject,
            content,
            is_scheduled: isScheduled,
            scheduled_dt: isScheduled ? scheduledDt : null
        };

        setApiLoading(true);
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const message = isScheduled ? t('emailAlertScheduled') : t('emailAlertSent');
                alert(message);
                // 폼 초기화
                setRecipient('');
                setSubject('');
                setContent('');
                setIsScheduled(false);
                setScheduledDt('');
                // 로그 갱신
                fetchLogs();
            } else {
                const message = t('emailAlertSendFail').replace('{error}', data.error || t('emailErrUnknown'));
                alert(message);
                fetchLogs();
            }
        } catch (err) {
            const error = err as Error;
            const message = t('emailErrGeneral').replace('{error}', error.message);
            alert(message);
        } finally {
            setApiLoading(false);
        }
    };

    const handleCancel = async (logId: number) => {
        if (!confirm(t('emailConfirmCancel'))) return;

        try {
            const res = await fetch(`/api/email/cancel/${logId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const message = t('emailAlertCancelled');
                alert(message);
                fetchLogs();
            } else {
                const message = t('emailAlertCancelFail').replace('{error}', data.detail || data.message || t('emailErrUnknown'));
                alert(message);
            }
        } catch (e) {
            const error = e as Error;
            const message = t('emailErrGeneral').replace('{error}', error.message);
            alert(message);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            {t('email')}
                        </h2>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Email Form */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 h-fit transition-colors duration-300">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-slate-200 flex items-center gap-2">
                            <Send className="w-5 h-5" /> {t('emailWrite')}
                        </h2>

                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">{t('emailRecipient')}</label>
                                <input
                                    type="email"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">{t('emailSubject')}</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder={t('emailSubjectPlaceholder')}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">{t('emailContent')}</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                    placeholder={t('emailContentPlaceholder')}
                                    required
                                />
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-400 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isScheduled}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setIsScheduled(checked);
                                                if (checked && !scheduledDt) {
                                                    // 현재 시간(Local)으로 설정 (YYYY-MM-DDThh:mm)
                                                    const now = new Date();
                                                    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                                    setScheduledDt(localIso);
                                                }
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                                        />
                                        {t('emailScheduledSend')}
                                    </label>
                                    {isScheduled && <Calendar className="w-4 h-4 text-gray-500 dark:text-slate-500" />}
                                </div>

                                {isScheduled && (
                                    <input
                                        type="datetime-local"
                                        value={scheduledDt}
                                        onChange={(e) => setScheduledDt(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                        required
                                    />
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={apiLoading}
                                className={`w-full py-2.5 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${apiLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {apiLoading ? <RotateCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {isScheduled ? t('emailScheduledSend') : t('emailInstantSend')}
                            </button>
                        </form>
                    </div>

                    {/* Right: History Table */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                                <Clock className="w-5 h-5" /> {t('emailMySendHistory')}
                            </h2>
                            <button
                                onClick={() => fetchLogs(page, pageSize)}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                title={t('emailRefresh')}
                            >
                                <RefreshCw className={`w-5 h-5 ${loadingLogs ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto min-h-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
                                    <tr>
                                        <th className="px-4 py-3">{t('emailThStatus')}</th>
                                        <th className="px-4 py-3">{t('emailThRecipient')}</th>
                                        <th className="px-4 py-3">{t('emailThSubject')}</th>
                                        <th className="px-4 py-3">{t('emailThTime')}</th>
                                        <th className="px-4 py-3 text-center">{t('emailThDetail')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">
                                                {t('emailNoHistory')}
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            {log.status === 'SENT' && <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />}
                                                            {log.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                                                            {log.status === 'CANCELLED' && <XCircle className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
                                                            {(log.status === 'PENDING' || log.status.startsWith('PENDING')) && <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />}

                                                            <span className={`font-medium ${log.status === 'SENT' ? 'text-green-700 dark:text-green-400' :
                                                                log.status === 'FAILED' ? 'text-red-700 dark:text-red-400' :
                                                                    log.status === 'CANCELLED' ? 'text-gray-500 dark:text-slate-400' :
                                                                        'text-amber-600 dark:text-amber-400'
                                                                }`}>
                                                                {log.status === 'PENDING' && log.is_scheduled ? t('emailStatusScheduled') : log.status}
                                                            </span>
                                                        </div>

                                                        {/* Cancel Button for PENDING */}
                                                        {log.status.startsWith('PENDING') && (
                                                            <button
                                                                onClick={() => handleCancel(log.id)}
                                                                className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                title={t('emailCancel')}
                                                            >
                                                                {t('emailCancel')}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {log.error_msg && (
                                                        <div className="text-xs text-red-500 mt-1 flex items-start gap-1">
                                                            <AlertCircle className="w-3 h-3 mt-0.5" />
                                                            {log.error_msg}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-slate-100">{log.recipient}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-slate-400 truncate max-w-xs" title={log.subject}>
                                                    {log.subject}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-slate-500 text-xs">
                                                    <div>{t('emailTimeReg').replace('{time}', log.reg_dt)}</div>
                                                    {log.is_scheduled === 1 && (
                                                        <div className="text-blue-600 dark:text-blue-400 font-medium">{t('emailTimeScheduled').replace('{time}', log.scheduled_dt || '')}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setDetailLog(log)}
                                                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title={t('emailViewContent')}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0 transition-colors">
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
                </div>
            </div>

            {/* Detail Modal */}
            {detailLog && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all" onClick={() => setDetailLog(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in transition-colors duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('emailDetailTitle')}</h3>
                            <button onClick={() => setDetailLog(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-pretendard">
                            <div className="grid grid-cols-4 gap-2 text-sm">
                                <span className="text-gray-500 dark:text-slate-400 font-medium">{t('emailDetailRecipient')}</span>
                                <span className="col-span-3 text-gray-900 dark:text-slate-200">{detailLog.recipient}</span>
                                <span className="text-gray-500 dark:text-slate-400 font-medium">{t('emailDetailSubject')}</span>
                                <span className="col-span-3 text-gray-900 dark:text-slate-100 font-bold">{detailLog.subject}</span>
                                <span className="text-gray-500 dark:text-slate-400 font-medium">{t('emailDetailSender')}</span>
                                <span className="col-span-3 text-gray-600 dark:text-slate-300">
                                    {detailLog.user_uid === null ? t('emailDetailSenderAgent') : `${detailLog.user_nm} (${detailLog.user_id})`}
                                </span>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 min-h-[200px] whitespace-pre-wrap text-gray-800 dark:text-slate-200 text-sm leading-relaxed transition-colors">
                                {detailLog.content}
                            </div>
                            {detailLog.error_msg && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {detailLog.error_msg}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end bg-gray-50 dark:bg-slate-800/50 transition-colors">
                            <button
                                onClick={() => setDetailLog(null)}
                                className="px-6 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                {t('emailDetailClose')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

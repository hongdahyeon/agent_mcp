import { AlertCircle, Calendar, CheckCircle, Clock, Eye, RefreshCw, RotateCw, Send, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { EmailLog } from '../types/emailSend';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';


export const EmailSender: React.FC = () => {
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
    const [pageSize, setPageSize] = useState(10);
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
            alert('수신자, 제목, 내용을 모두 입력해주세요.');
            return;
        }

        if (isScheduled && !scheduledDt) {
            alert('예약 시간을 설정해주세요.');
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
                alert(isScheduled ? '메일 발송이 예약되었습니다.' : '메일이 발송되었습니다.');
                // 폼 초기화
                setRecipient('');
                setSubject('');
                setContent('');
                setIsScheduled(false);
                setScheduledDt('');
                // 로그 갱신
                fetchLogs();
            } else {
                alert(`발송 실패: ${data.error || '알 수 없는 오류'}`);
                fetchLogs();
            }
        } catch (err) {
            const error = err as Error;
            alert(`오류 발생: ${error.message}`);
        } finally {
            setApiLoading(false);
        }
    };

    const handleCancel = async (logId: number) => {
        if (!confirm('정말 이 메일 발송을 취소하시겠습니까?')) return;
        
        try {
            const res = await fetch(`/api/email/cancel/${logId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                alert('발송이 취소되었습니다.');
                fetchLogs();
            } else {
                alert(`취소 실패: ${data.detail || data.message || '알 수 없는 오류'}`);
            }
        } catch (e) {
            const error = e as Error;
            alert(`오류 발생: ${error.message}`);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Send className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            메일 발송
                        </h2>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Email Form */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                            <Send className="w-5 h-5" /> 메일 작성
                        </h2>
                        
                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">수신자 이메일</label>
                                <input 
                                    type="email" 
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                <input 
                                    type="text" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="메일 제목"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                    placeholder="메일 내용을 입력하세요..."
                                    required
                                />
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
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
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        예약 발송
                                    </label>
                                    {isScheduled && <Calendar className="w-4 h-4 text-gray-500" />}
                                </div>
                                
                                {isScheduled && (
                                    <input 
                                        type="datetime-local" 
                                        value={scheduledDt}
                                        onChange={(e) => setScheduledDt(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        required
                                    />
                                )}
                            </div>

                            <button 
                                type="submit" 
                                disabled={apiLoading}
                                className={`w-full py-2.5 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${
                                    apiLoading 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                }`}
                            >
                                 {apiLoading ? <RotateCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                 {isScheduled ? '예약 발송' : '즉시 발송'}
                            </button>
                        </form>
                    </div>

                    {/* Right: History Table */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                <Clock className="w-5 h-5" /> 내 발송 이력
                            </h2>
                            <button 
                                onClick={() => fetchLogs(page, pageSize)} 
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="새로고침"
                            >
                                <RefreshCw className={`w-5 h-5 ${loadingLogs ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto min-h-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">상태</th>
                                        <th className="px-4 py-3">수신자</th>
                                        <th className="px-4 py-3">제목</th>
                                        <th className="px-4 py-3">등록/예약 시각</th>
                                        <th className="px-4 py-3 text-center">상세</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                발송 이력이 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            {log.status === 'SENT' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                            {log.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                                                            {log.status === 'CANCELLED' && <XCircle className="w-4 h-4 text-gray-400" />}
                                                            {(log.status === 'PENDING' || log.status.startsWith('PENDING')) && <Clock className="w-4 h-4 text-amber-500" />}
                                                            
                                                            <span className={`font-medium ${
                                                                log.status === 'SENT' ? 'text-green-700' :
                                                                log.status === 'FAILED' ? 'text-red-700' :
                                                                log.status === 'CANCELLED' ? 'text-gray-500' :
                                                                'text-amber-600'
                                                            }`}>
                                                                {log.status === 'PENDING' && log.is_scheduled ? '예약됨' : log.status}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Cancel Button for PENDING */}
                                                        {log.status.startsWith('PENDING') && (
                                                            <button
                                                                onClick={() => handleCancel(log.id)}
                                                                className="text-xs px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                                                                title="발송 취소"
                                                            >
                                                                취소
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
                                                <td className="px-4 py-3 text-gray-900">{log.recipient}</td>
                                                <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={log.subject}>
                                                    {log.subject}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    <div>등록: {log.reg_dt}</div>
                                                    {log.is_scheduled === 1 && (
                                                        <div className="text-blue-600 font-medium">예약: {log.scheduled_dt}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button 
                                                        onClick={() => setDetailLog(log)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="내용 보기"
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
                        <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
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
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailLog(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">메일 상세 내용</h3>
                            <button onClick={() => setDetailLog(null)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-4 gap-2 text-sm">
                                <span className="text-gray-500 font-medium">수신자:</span>
                                <span className="col-span-3 text-gray-900">{detailLog.recipient}</span>
                                <span className="text-gray-500 font-medium">제목:</span>
                                <span className="col-span-3 text-gray-900 font-bold">{detailLog.subject}</span>
                                <span className="text-gray-500 font-medium">발신자:</span>
                                <span className="col-span-3">
                                    {detailLog.user_uid === null ? 'AI 에이전트' : `${detailLog.user_nm} (${detailLog.user_id})`}
                                </span>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                                {detailLog.content}
                            </div>
                            {detailLog.error_msg && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {detailLog.error_msg}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setDetailLog(null)}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import { AlertCircle, CheckCircle, Clock, Eye, RefreshCw, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import type { EmailLog } from '../types/emailSend';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

export const EmailHistory: React.FC = () => {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    // Detail Modal State
    const [detailLog, setDetailLog] = useState<EmailLog | null>(null);

    const fetchLogs = useCallback(async (pageNum: number = page, size: number = pageSize) => {
        setLoading(true);
        try {
            // all_logs=true 파라미터 추가하여 전체 이력 요청
            const res = await fetch(`/api/email/logs?page=${pageNum}&size=${size}&all_logs=true`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchLogs(page, pageSize);
    }, [fetchLogs, page, pageSize]);

    return (
        <div className="h-full flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">전체 메일 발송 이력</h2>
                        <p className="text-sm text-gray-500 mt-1">시스템에서 발송된 모든 메일(AI 포함) 이력을 조회합니다.</p>
                    </div>
                </div>
                <button 
                    onClick={() => fetchLogs()} 
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="flex-1 flex flex-col min-h-0 bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">상태</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">발신자</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">수신자</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">제목</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">등록/예약 시각</th>
                                <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">상세</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">이력이 없습니다.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
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
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.user_uid === null ? (
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-bold ring-1 ring-purple-200">AI</span>
                                            ) : (
                                                <span className="text-gray-600">{log.user_nm || log.user_id}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{log.recipient}</td>
                                        <td className="px-6 py-4 truncate max-w-xs text-gray-600" title={log.subject}>
                                            {log.subject}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                            <div>등록: {log.reg_dt}</div>
                                            {log.is_scheduled === 1 && (
                                                <div className="text-blue-600 font-medium">예약: {log.scheduled_dt}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
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
                <div className="bg-white border-t border-gray-200 shrink-0">
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

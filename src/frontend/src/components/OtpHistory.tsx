import { ShieldCheck, Clock, RefreshCw, XCircle, Mail, AlertCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import type { OtpLog, OtpHistoryResponse } from '../types/otp';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

export const OtpHistory: React.FC = () => {
    const [logs, setLogs] = useState<OtpLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async (pageNum: number = page, size: number = pageSize) => {
        setLoading(true);
        try {
            // OTP 이력 조회 API 호출
            const res = await fetch(`/api/email/otp-history?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data: OtpHistoryResponse = await res.json();
                setLogs(data.items || []);
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

    // 만료 여부 체크 함수
    const isExpired = (expiryStr: string) => {
        return new Date() > new Date(expiryStr);
    };

    return (
        <div className="h-full flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <ShieldCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">이메일 OTP 인증 이력</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">회원가입 및 각종 인증을 위해 발송된 OTP 내역을 관리합니다.</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchLogs()}
                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors duration-300">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">상태</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">이메일</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">발송유형</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">인증코드</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">만료시간</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-slate-400 uppercase">생성시간</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500">이력이 없습니다.</td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const expired = isExpired(log.expires_at) && log.is_verified === 'N';
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {log.is_verified === 'Y' ? (
                                                        <>
                                                            <ShieldCheck className="w-4 h-4 text-green-500 shadow-sm" />
                                                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">인증완료</span>
                                                        </>
                                                    ) : expired ? (
                                                        <>
                                                            <XCircle className="w-4 h-4 text-gray-400" />
                                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-500 rounded text-xs font-bold">만료됨</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-4 h-4 text-amber-500 animate-pulse-slow" />
                                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-bold">대기중</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                                                    <span className="text-gray-900 dark:text-slate-200 font-medium">{log.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800/50">
                                                    {log.otp_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <code className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded font-mono font-bold tracking-wider text-sm border border-gray-200 dark:border-slate-700">
                                                    {log.otp_code}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`text-xs ${expired ? 'text-red-400 line-through' : 'text-gray-500 dark:text-slate-400'}`}>
                                                    {log.expires_at}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-slate-500 text-xs">
                                                {log.reg_dt}
                                            </td>
                                        </tr>
                                    );
                                })
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
            
            {logs.some(l => l.is_verified === 'N' && !isExpired(l.expires_at)) && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg flex items-start space-x-2 transition-colors duration-300">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">실시간 인증 대기 알림</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">현재 유효한 인증 번호가 존재합니다. 사용자가 인증을 완료할 때까지 대기 상태가 유지됩니다.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

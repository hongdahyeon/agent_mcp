import clsx from 'clsx';
import { CheckCircle, History, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LoginHistory } from '../types/auth';

import { Pagination } from './common/Pagination';

/* 
* 로그인 이력 화면에 대한 컴포넌트
*/

export function LoginHistViewer() {
    const [history, setHistory] = useState<LoginHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // 기본값 10
    const [total, setTotal] = useState(0);

    const fetchHistory = async (pageNum: number = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/auth/history?page=${pageNum}&size=${pageSize}`);
            const data = await res.json();
            
            // API response structure changed to { total, page, size, items }
            if (data.items) {
                setHistory(data.items);
                setTotal(data.total);
                setPage(data.page);
            } else if (data.history) {
                // Fallback for old API (just in case)
                setHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to fetch login history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(1);
    }, [pageSize]); // pageSize 변경 시 재조회

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <History className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">접속 이력 (Login History)</h1>
                        <p className="text-sm text-gray-500">최근 로그인 시도 기록을 조회합니다.</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchHistory(page)}
                    disabled={loading}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                    <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
                    새로고침
                </button>
            </header>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        기록이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.uid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.login_dt}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.user_id || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.user_nm || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.login_ip}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.login_success === 'SUCCESS' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Success
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle className="w-3 h-3 mr-1" /> Fail
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.login_msg}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="bg-white border-t border-gray-200">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => {
                            setPage(p);
                            fetchHistory(p);
                        }}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

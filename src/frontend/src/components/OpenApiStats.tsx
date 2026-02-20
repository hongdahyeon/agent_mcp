import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import {
    BarChart3,
    History,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Users,
    Globe,
    ArrowRightLeft,
    Eye,
    Info,
    AlertTriangle
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import type { OpenApiUsageLog, OpenApiStats } from '../types/openapi';
import { Pagination } from './common/Pagination';
import clsx from 'clsx';

interface Props {
    theme: 'light' | 'dark';
}

export default function OpenApiStatsView({ theme }: Props) {
    const isDark = theme === 'dark';
    const [stats, setStats] = useState<OpenApiStats | null>(null);
    const [logs, setLogs] = useState<OpenApiUsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    // 실패 사유 모달
    const [selectedError, setSelectedError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/openapi/stats', { headers: getAuthHeaders() });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    const fetchLogs = useCallback(async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/openapi/usage-logs?page=${pageNum}&size=${pageSize}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.items);
                setTotal(data.total);
                setPage(data.page);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchStats();
        fetchLogs(1);
    }, [fetchStats, fetchLogs]);

    // 차트 옵션
    const successOption = stats ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%', textStyle: { color: isDark ? '#94a3b8' : '#64748b' } },
        series: [{
            name: '성공 여부',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 10,
                borderColor: isDark ? '#0f172a' : '#fff',
                borderWidth: 2
            },
            label: { show: false },
            data: stats.resultStats.map(s => ({
                value: s.cnt,
                name: s.success === 'SUCCESS' ? '성공' : '실패',
                itemStyle: { color: s.success === 'SUCCESS' ? '#10B981' : '#EF4444' }
            }))
        }]
    } : {};

    // 툴 사용량 차트 옵션
    const toolOption = stats ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: stats.toolStats.map(s => s.tool_id),
            axisLabel: { rotate: 45, color: isDark ? '#94a3b8' : '#64748b' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
            axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
        },
        series: [{
            data: stats.toolStats.map(s => s.cnt),
            type: 'bar',
            itemStyle: { color: '#3B82F6', borderRadius: [5, 5, 0, 0] }
        }]
    } : {};

    // 사용자/토큰 사용량 차트 옵션
    const userOption = stats ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%', textStyle: { color: isDark ? '#94a3b8' : '#64748b' } },
        series: [{
            name: '사용자/토큰',
            type: 'pie',
            radius: '60%',
            itemStyle: {
                borderRadius: 5,
                borderColor: isDark ? '#0f172a' : '#fff',
                borderWidth: 2
            },
            data: stats.userStats.map(s => ({ value: s.cnt, name: s.label })),
            emphasis: {
                itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
            }
        }]
    } : {};

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-500 font-pretendard">
            <header className="flex-none flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                        <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 font-pretendard">OpenAPI 사용 통계</h2>
                </div>
                <button
                    onClick={() => { fetchStats(); fetchLogs(1); }}
                    className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-pretendard"
                >
                    <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
                    데이터 새로고침
                </button>
            </header>

            {/* Failure Reason Modal */}
            {selectedError && (
                <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-red-50 dark:bg-red-900/10 flex items-center">
                            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                            <h3 className="font-bold text-red-900 dark:text-red-400 font-pretendard">상세 실패 사유</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 font-mono break-all whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {selectedError}
                            </div>
                            <p className="mt-4 text-xs text-gray-500 dark:text-slate-500 flex items-center font-pretendard">
                                <Info className="w-3 h-3 mr-1" /> 위 결과는 API 호출 시 발생한 실제 에러 내용입니다.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setSelectedError(null)}
                                className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-pretendard"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="flex-none grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-4 flex items-center font-pretendard">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> 성공/실패 비율
                    </h3>
                    <div className="h-[300px]">
                        <ReactECharts theme={isDark ? 'dark' : undefined} option={successOption} style={{ height: '100%' }} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-4 flex items-center font-pretendard">
                        <Globe className="w-4 h-4 mr-2 text-blue-500" /> 도구별 사용량 (Top 10)
                    </h3>
                    <div className="h-[300px]">
                        <ReactECharts theme={isDark ? 'dark' : undefined} option={toolOption} style={{ height: '100%' }} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-4 flex items-center font-pretendard">
                        <Users className="w-4 h-4 mr-2 text-indigo-500" /> 사용자/토큰별 사용량
                    </h3>
                    <div className="h-[300px]">
                        <ReactECharts theme={isDark ? 'dark' : undefined} option={userOption} style={{ height: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Usage Logs Table */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-0 transition-colors duration-300">
                <div className="flex-none px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center font-pretendard">
                        <History className="w-4 h-4 mr-2" /> 상세 호출 이력
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-slate-400">총 {total}건</span>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase font-pretendard">시간</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase font-pretendard">주체</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase font-pretendard">도구 ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase font-pretendard">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase font-pretendard">IP</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {loading && logs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400 font-pretendard">로딩 중...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400 font-pretendard">이력이 없습니다.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap font-mono">{log.reg_dt}</td>
                                        <td className="px-6 py-4">
                                            {log.user_id ? (
                                                <div className="flex items-center space-x-1">
                                                    <Users className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200 font-pretendard">{log.user_nm}</span>
                                                    <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">({log.user_id})</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-1">
                                                    <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                                                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 font-pretendard">{log.token_name || 'External Token'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-mono border border-blue-100 dark:border-blue-800">
                                                {log.tool_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-pretendard">
                                            {log.success === 'SUCCESS' ? (
                                                <span className="inline-flex items-center text-green-600 dark:text-green-400">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> 성공
                                                    <span className="ml-1 text-xs text-gray-400 dark:text-slate-500 font-mono">({log.status_code})</span>
                                                </span>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <span className="inline-flex items-center text-red-600 dark:text-red-400">
                                                        <XCircle className="w-3 h-3 mr-1" /> 실패
                                                        <span className="ml-1 text-xs text-gray-400 dark:text-slate-500 font-mono">({log.status_code})</span>
                                                    </span>
                                                    {log.error_msg && (
                                                        <button
                                                            onClick={() => setSelectedError(log.error_msg)}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                            title="상세 사유 보기"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400 dark:text-slate-500 font-mono">{log.ip_addr}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex-none bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors duration-300">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => fetchLogs(p)}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                </div>
            </div>
        </div>
    );
}

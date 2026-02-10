import clsx from 'clsx';
import { AlertCircle, CheckCircle2, RefreshCw, Search, XCircle, History, Eye, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { UsageHistoryResponse, UsageLog, UsageStats } from '../types/UserUsage';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';


export function UsageHistory() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페이징 (Pagination)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 검색 필터 (Filters)
  const [searchUserId, setSearchUserId] = useState('');
  const [searchToolNm, setSearchToolNm] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'FAIL'

  // 통계 상태 (Stats State)
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // 상세 보기 모달 상태 (JSON Viewer Modal State)
  const [selectedJson, setSelectedJson] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');

  // 사용 통계 조회 (Fetch Usage Stats)
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) return;

      const res = await fetch('/api/mcp/usage-stats', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch usage stats:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) throw new Error("No session found");

      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: pageSize.toString()
      });
      if (searchUserId) params.append('user_id', searchUserId);
      if (searchToolNm) params.append('tool_nm', searchToolNm);
      if (searchSuccess !== 'ALL') params.append('success', searchSuccess);

      const res = await fetch(`/api/mcp/usage-history?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("권한이 없습니다 (관리자 전용)");
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }

      const data: UsageHistoryResponse = await res.json();
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchUserId, searchToolNm, searchSuccess, pageSize]);

  // 초기 로딩 및 성공여부 필터 변경 시 자동 검색
  useEffect(() => {
    fetchLogs(1);
    fetchStats();
  }, [searchSuccess, fetchLogs, fetchStats]);

  const handleSearch = () => {
    fetchLogs(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatJson = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  const openJsonModal = (title: string, content: string) => {
    setModalTitle(title);
    setSelectedJson(formatJson(content));
  };


    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <History className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            MCP Tool 사용 이력
                        </h2>
                    </div>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center text-sm bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-700"
                >
                    <RefreshCw className={clsx("w-4 h-4 mr-2", statsLoading && "animate-spin")} />
                    통계 갱신
                </button>
            </header>

            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                {/* 사용 통계 테이블 (Usage Stats Table) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-none">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-700">금일 사용자별 사용 통계</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">권한</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용량</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">한도</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">잔여</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {statsLoading && stats.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-4 text-center text-xs text-gray-500">로딩 중...</td></tr>
                                ) : stats.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-4 text-center text-xs text-gray-500">통계 데이터 없음</td></tr>
                                ) : (
                                    stats.map(s => (
                                        <tr key={s.user_id}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.user_nm} <span className="text-gray-400 font-normal">({s.user_id})</span></td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{s.role}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-bold">{s.usage}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{s.limit === -1 ? '무제한' : s.limit}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{s.limit === -1 ? '-' : s.remaining}</td>
                                            <td className="px-6 py-4 text-sm">
                                                {s.limit !== -1 && s.remaining === 0 ? (
                                                    <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full">한도 초과</span>
                                                ) : s.limit !== -1 && s.remaining < 5 ? (
                                                    <span className="text-orange-600 font-medium text-xs bg-orange-50 px-2 py-1 rounded-full">임박</span>
                                                ) : (
                                                    <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded-full">정상</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 필터 바 (Filter Bar) - flex-none */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end flex-none">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">사용자 ID</label>
                        <input
                            type="text"
                            value={searchUserId}
                            onChange={(e) => setSearchUserId(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search User ID..."
                            className="px-3 py-2 border rounded-lg text-sm w-40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">도구명</label>
                        <input
                            type="text"
                            value={searchToolNm}
                            onChange={(e) => setSearchToolNm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search Tool Name..."
                            className="px-3 py-2 border rounded-lg text-sm w-40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">성공여부</label>
                        <select
                            value={searchSuccess}
                            onChange={(e) => setSearchSuccess(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm w-32 bg-white"
                        >
                            <option value="ALL">전체</option>
                            <option value="SUCCESS">In Progress / Success</option>
                            <option value="FAIL">Error / Fail</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            검색
                        </button>
                        <button
                            onClick={() => {
                                setSearchUserId('');
                                setSearchToolNm('');
                                setSearchSuccess('ALL');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            초기화
                        </button>
                    </div>

                    <div className="flex-1 text-right">
                        <button
                            onClick={() => fetchLogs(page)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
                            새로고침
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도구명</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">성공여부</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">파라미터</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결과</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading && logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            로딩 중...
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.reg_dt}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-0">
                                                        <div className="text-sm font-medium text-gray-900">{log.user_nm}</div>
                                                        <div className="text-xs text-gray-500">{log.user_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {log.tool_nm}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.tool_success === 'SUCCESS' ? (
                                                    <div className="flex items-center text-green-600 text-sm">
                                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                        성공
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-600 text-sm">
                                                        <XCircle className="w-4 h-4 mr-1.5" />
                                                        실패
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="flex items-center space-x-2">
                                                    <span className="truncate" title={log.tool_params}>{log.tool_params}</span>
                                                    <button 
                                                        onClick={() => openJsonModal('파라미터 상세 (Parameters)', log.tool_params)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                                        title="상세 보기"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="flex items-center space-x-2">
                                                    <span className="truncate" title={log.tool_result}>{log.tool_result}</span>
                                                    <button 
                                                        onClick={() => openJsonModal('결과 상세 (Result)', log.tool_result)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                                        title="상세 보기"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이징 (Pagination) */}
                    <div className="bg-white border-t border-gray-200">
                        <Pagination
                             currentPage={page}
                             totalPages={Math.ceil(total / pageSize)}
                             pageSize={pageSize}
                             totalItems={total}
                             onPageChange={(p) => {
                                 setPage(p);
                                 fetchLogs(p);
                             }}
                             onPageSizeChange={(s) => {
                                 setPageSize(s);
                                 setPage(1);
                             }}
                        />
                    </div>
                </div>
            </div>

            {/* JSON Viewer Modal */}
            {selectedJson !== null && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">{modalTitle}</h3>
                            <button 
                                onClick={() => setSelectedJson(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-all shadow-inner">
                                {selectedJson}
                            </pre>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-right">
                            <button 
                                onClick={() => setSelectedJson(null)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 shadow-lg animate-fade-in z-[110]">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
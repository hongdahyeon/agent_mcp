import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types/auth'; 
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';
import clsx from 'clsx';

interface UsageLog {
  id: number;
  tool_nm: string;
  tool_params: string;
  tool_success: string; // 'SUCCESS' | 'FAIL'
  tool_result: string;
  reg_dt: string;
  user_id: string;
  user_nm: string;
}

interface UsageHistoryResponse {
  total: number;
  page: number;
  size: number;
  items: UsageLog[];
}

export function UsageHistory() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Filters
  const [searchUserId, setSearchUserId] = useState('');
  const [searchToolNm, setSearchToolNm] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'FAIL'

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      // 세션에서 사용자 정보 가져오기 (헤더에 X-User-Id 추가용)
      const sessionStr = localStorage.getItem('user_session');
      if (!sessionStr) throw new Error("No session found");
      const user = JSON.parse(sessionStr) as User;

      // Query String 구성
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: PAGE_SIZE.toString()
      });
      if (searchUserId) params.append('user_id', searchUserId);
      if (searchToolNm) params.append('tool_nm', searchToolNm);
      if (searchSuccess !== 'ALL') params.append('success', searchSuccess);

      const res = await fetch(`/api/mcp/usage-history?${params.toString()}`, {
        headers: {
          'X-User-Id': user.user_id
        }
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("권한이 없습니다 (관리자 전용)");
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }

      const data: UsageHistoryResponse = await res.json();
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchUserId, searchToolNm, searchSuccess]);

  // 초기 로딩 및 성공여부 필터 변경 시 자동 검색
  useEffect(() => {
    fetchLogs(1);
  }, [searchSuccess]); 

  const handleSearch = () => {
    fetchLogs(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">MCP Tool 사용 이력</h2>
          <p className="text-sm text-gray-500 mt-1">사용자들의 도구 실행 기록을 조회합니다.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
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
                    // state update is async, so we can't call fetchLogs immediately with new state here easily without extra effect or ref.
                    // But for simplicity, let's just trigger reload which will use old state? No.
                    // We just reset state, user clicks search again or we use effect?
                    // Let's just reset fields. User can click search.
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

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.tool_params}>
                      {log.tool_params}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.tool_result}>
                      {log.tool_result}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span> (Total <span className="font-medium">{total}</span>)
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => fetchLogs(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

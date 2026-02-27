import { useState, useEffect } from 'react';
import { Shield, Activity, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import type { SessionUser } from '../types/auth';
import type { MyOpenApiUsage } from '../types/openapi';
import type { MyMcpUsage } from '../types/UserUsage';
import { Terminal } from 'lucide-react';

/**
 * 내 정보 (My Page) 컴포넌트
 * - 사용자의 기본 정보(이름, ID, 권한)를 조회합니다.
 * + OpenAPI 사용량도 표시합니다.
 */
export function MyPage() {
    const [user, setUser] = useState<SessionUser | null>(() => {
        const userStr = localStorage.getItem('user_session');
        return userStr ? JSON.parse(userStr) : null;
    }); // 사용자 세션 정보

    const [usage, setUsage] = useState<MyOpenApiUsage | null>(null);
    const [mcpUsage, setMcpUsage] = useState<MyMcpUsage | null>(null);
    const [loadingUsage, setLoadingUsage] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/users/me', { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchUsage = async () => {
            setLoadingUsage(true);
            try {
                // OpenAPI 사용량
                const res = await fetch('/api/openapi/my-usage', { headers: getAuthHeaders() });
                if (res.ok) {
                    setUsage(await res.json());
                }

                // 일반 MCP 도구 사용량
                const mcpRes = await fetch('/api/mcp/my-usage', { headers: getAuthHeaders() });
                if (mcpRes.ok) {
                    setMcpUsage(await mcpRes.json());
                }
            } catch (err) {
                console.error('Failed to fetch my usage:', err);
            } finally {
                setLoadingUsage(false);
            }
        };
        fetchUsage();
    }, []);

    if (!user) return <div>Loading...</div>;

    const usagePercent = usage && usage.limit > 0
        ? Math.min(100, (usage.usage / usage.limit) * 100)
        : 0;

    const mcpUsagePercent = mcpUsage && mcpUsage.limit > 0
        ? Math.min(100, (mcpUsage.usage / mcpUsage.limit) * 100)
        : 0;

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            {/* 상단 헤더 영역 */}
            <header className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">내 정보 (My Page)</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">계정 정보 및 사용 현황을 확인합니다.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {/* 프로필 정보 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" /> 기본 정보
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">이름</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_nm}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">아이디</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_id}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">이메일</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_email || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">권한</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'ROLE_ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 오늘의 OpenAPI 사용 현황 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-rose-500 dark:text-rose-400" /> 오늘의 OpenAPI 사용 현황
                    </h3>

                    {loadingUsage ? (
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">데이터를 불러오는 중...</div>
                    ) : usage ? (
                        <div className="space-y-6">
                            {/* 전체 한도 게이지 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 dark:text-slate-400">전체 한도 사용률</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                        {usage.usage} / {usage.limit === -1 ? '∞' : usage.limit} 건
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out rounded-full ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                                            }`}
                                        style={{ width: `${usage.limit === -1 ? 0 : usagePercent}%` }}
                                    />
                                </div>
                                {usage.limit !== -1 && usage.remaining <= 10 && usage.remaining > 0 && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-500 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" /> 일일 잔여 횟수가 얼마 남지 않았습니다! ({usage.remaining}건 남음)
                                    </p>
                                )}
                            </div>

                            {/* 도구별 분석 */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">도구별 사용량</h4>
                                {usage.tool_usage.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {usage.tool_usage.map(tool => (
                                            <div key={tool.tool_id} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 transition-colors">
                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                    <Globe className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                                    <span className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{tool.tool_id}</span>
                                                </div>
                                                <span className="flex-shrink-0 px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[11px] font-bold text-gray-600 dark:text-slate-400">
                                                    {tool.cnt}회
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 dark:text-slate-500">오늘 사용한 도구가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">사용량 정보를 찾을 수 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* 오늘의 일반 MCP 도구 사용 현황 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <Terminal className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" /> 오늘의 일반 MCP 도구 사용 현황
                    </h3>

                    {loadingUsage ? (
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">데이터를 불러오는 중...</div>
                    ) : mcpUsage ? (
                        <div className="space-y-6">
                            {/* 전체 한도 게이지 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 dark:text-slate-400">전체 한도 사용률</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                        {mcpUsage.usage} / {mcpUsage.limit === -1 ? '∞' : mcpUsage.limit} 건
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out rounded-full ${mcpUsagePercent > 90 ? 'bg-rose-500' : mcpUsagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${mcpUsage.limit === -1 ? 0 : mcpUsagePercent}%` }}
                                    />
                                </div>
                                {mcpUsage.limit !== -1 && mcpUsage.remaining <= 10 && mcpUsage.remaining > 0 && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-500 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" /> 일일 잔여 횟수가 얼마 남지 않았습니다! ({mcpUsage.remaining}건 남음)
                                    </p>
                                )}
                            </div>

                            {/* 도구별 분석 */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">도구별 사용량</h4>
                                {mcpUsage.tool_usage.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {mcpUsage.tool_usage.map(tool => (
                                            <div key={tool.tool_nm} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 transition-colors">
                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                    <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                                    <span className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{tool.tool_nm}</span>
                                                </div>
                                                <span className="flex-shrink-0 px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[11px] font-bold text-gray-600 dark:text-slate-400">
                                                    {tool.cnt}회
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 dark:text-slate-500">오늘 사용한 도구가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">사용량 정보를 찾을 수 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    )
}

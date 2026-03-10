import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Check, Settings, Shield, Globe, Clock } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

interface AccessToken {
    id: number;
    name: string;
    token: string;
    can_use: string;
    created_at: string;
}

export function AccessTokenManager() {
    const [tokens, setTokens] = useState<AccessToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);

    // Permission Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedToken, setSelectedToken] = useState<AccessToken | null>(null);
    const [allTools, setAllTools] = useState<{ id: number, name: string }[]>([]);
    const [allOpenAPIs, setAllOpenAPIs] = useState<{ id: number, name_ko: string, tool_id: string }[]>([]);
    const [allowedToolIds, setAllowedToolIds] = useState<number[]>([]);
    const [allowedOpenApiIds, setAllowedOpenApiIds] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Server-side pagination
    const displayedTokens = Array.isArray(tokens) ? tokens : [];

    const fetchTokens = useCallback(async (pageNum = page, size = pageSize) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/access-tokens?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch tokens');
            const data = await res.json();
            // Handle both legacy ( {tokens: []} ) and new paginated ( {items: [], total: 0} ) formats
            let items = [];
            let total = 0;

            if (data.tokens) {
                items = data.tokens;
                total = data.tokens.length;
            } else if (data.items) {
                items = data.items;
                total = data.total;
            } else if (Array.isArray(data)) {
                items = data;
                total = data.length;
            }

            setTokens(items || []);
            setTotalItems(total || 0);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchTokens(page, pageSize);
    }, [page, pageSize, fetchTokens]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            setIsCreating(true);
            const res = await fetch('/api/access-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ name: newName }),
            });

            if (!res.ok) throw new Error('Failed to create token');

            setNewName('');
            await fetchTokens();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까? 이 토큰을 사용하는 모든 서비스가 차단됩니다.')) return;

        try {
            const res = await fetch(`/api/access-tokens/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!res.ok) throw new Error('Failed to delete token');

            await fetchTokens();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    // 권한 관리 모달
    const handleOpenPermissionModal = async (token: AccessToken) => {
        setSelectedToken(token);
        setIsModalOpen(true);
        try {
            // 1. 모든 도구 목록 조회 (관리자용 API 사용)
            const [toolsRes, apisRes, permsRes] = await Promise.all([
                fetch('/api/mcp/custom-tools?page=1&size=100', { headers: getAuthHeaders() }),
                fetch('/api/openapi?page=1&size=100', { headers: getAuthHeaders() }),
                fetch(`/api/tokens/${token.id}/permissions`, { headers: getAuthHeaders() })
            ]);

            if (!toolsRes.ok || !apisRes.ok || !permsRes.ok) {
                throw new Error("데이터를 불러오는데 실패했습니다.");
            }

            const toolsData = await toolsRes.json();
            const apisData = await apisRes.json();
            const permsData = await permsRes.json();

            setAllTools(toolsData.items || []);
            setAllOpenAPIs(apisData.items || []);
            setAllowedToolIds(permsData.allowed_tool_ids || []);
            setAllowedOpenApiIds(permsData.allowed_openapi_ids || []);
        } catch (err: any) {
            console.error("Failed to load permissions:", err);
            alert(err.message || "권한 정보를 불러오는데 실패했습니다.");
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedToken) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/tokens/${selectedToken.id}/permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    allowed_tool_ids: allowedToolIds,
                    allowed_openapi_ids: allowedOpenApiIds
                }),
            });

            if (!res.ok) throw new Error('Failed to save permissions');
            alert('권한이 성공적으로 저장되었습니다.');
            setIsModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(text);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            외부 접속 토큰 관리
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            MCP 서버에 외부에서 접속하기 위한 고정 Access Token을 관리합니다.
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                {/* 토큰 생성 폼 */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-slate-100">새 토큰 발급</h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="토큰 용도/이름 (예: CI/CD Pipeline, External App)"
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !newName.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? '생성 중...' : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    발급하기
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 토큰 목록 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex-1 flex flex-col transition-colors duration-300">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 text-sm sticky top-0 z-10 transition-colors">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium">ID</th>
                                    <th className="px-6 py-4 text-left font-medium">이름</th>
                                    <th className="px-6 py-4 text-left font-medium">토큰 값</th>
                                    <th className="px-6 py-4 text-center font-medium">상태</th>
                                    <th className="px-6 py-4 text-center font-medium">생성일</th>
                                    <th className="px-6 py-4 text-center font-medium">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {displayedTokens.map((token) => (
                                    <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{token.id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-200">{token.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group">
                                                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-sm text-gray-600 dark:text-slate-400 font-mono transition-colors">
                                                    {token.token.substring(0, 10)}...****************
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(token.token)}
                                                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="토큰 복사"
                                                >
                                                    <div className="w-4 h-4">
                                                        {copiedToken === token.token ? (
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${token.can_use === 'Y'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                                }`}>
                                                {token.can_use === 'Y' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                            {token.created_at}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenPermissionModal(token)}
                                                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="권한 설정"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => window.location.href = `/mcp-limits?target_type=TOKEN&target_id=${token.id}`}
                                                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                    title="사용 한도 설정"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(token.id)}
                                                    className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedTokens.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                            발급된 토큰이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors">
                        <Pagination
                            currentPage={page}
                            totalPages={Math.ceil(totalItems / pageSize)}
                            pageSize={pageSize}
                            totalItems={totalItems}
                            onPageChange={(p) => setPage(p)}
                            onPageSizeChange={(s) => {
                                setPageSize(s);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/30 transition-colors">
                        {error}
                    </div>
                )}
            </div>

            {/* 권한 설정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 transition-all scale-in-center">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                                        [{selectedToken?.name}] 권한 설정
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-mono">
                                        ID: {selectedToken?.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Custom Tools Section */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <Shield className="w-5 h-5 text-indigo-500" />
                                    <h4 className="font-bold text-gray-800 dark:text-slate-200">Custom Tools</h4>
                                    <span className="text-xs text-gray-400 font-normal ml-auto">
                                        {allowedToolIds.length} / {allTools.length} selected
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {allTools.map(tool => (
                                        <label key={tool.id} className="group flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all">
                                            <input
                                                type="checkbox"
                                                checked={allowedToolIds.includes(tool.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAllowedToolIds([...allowedToolIds, tool.id]);
                                                    else setAllowedToolIds(allowedToolIds.filter(id => id !== tool.id));
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-700 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                                {tool.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* OpenAPI Section */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                    <h4 className="font-bold text-gray-800 dark:text-slate-200">OpenAPI Tools</h4>
                                    <span className="text-xs text-gray-400 font-normal ml-auto">
                                        {allowedOpenApiIds.length} / {allOpenAPIs.length} selected
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {allOpenAPIs.map(api => (
                                        <label key={api.id} className="group flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all">
                                            <input
                                                type="checkbox"
                                                checked={allowedOpenApiIds.includes(api.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAllowedOpenApiIds([...allowedOpenApiIds, api.id]);
                                                    else setAllowedOpenApiIds(allowedOpenApiIds.filter(id => id !== api.id));
                                                }}
                                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-slate-700 focus:ring-emerald-500 dark:focus:ring-offset-slate-900"
                                            />
                                            <div className="ml-3 flex flex-col">
                                                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                    {api.name_ko}
                                                </span>
                                                <span className="text-[10px] text-gray-400 group-hover:text-emerald-500/70 transition-colors">
                                                    {api.tool_id}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={isSaving}
                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all active:scale-95"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        저장 중...
                                    </>
                                ) : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
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
                                            <button
                                                onClick={() => handleDelete(token.id)}
                                                className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
        </div>
    );
}

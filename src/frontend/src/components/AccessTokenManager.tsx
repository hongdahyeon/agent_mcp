import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

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

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/access-tokens', {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch tokens');
            const data = await res.json();
            setTokens(data.tokens);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

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
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="w-6 h-6 text-blue-600" />
                        외부 접속 토큰 관리
                    </h1>
                    <p className="text-gray-500 mt-1">
                        MCP 서버에 외부에서 접속하기 위한 고정 Access Token을 관리합니다.
                    </p>
                </div>
            </div>

            {/* 토큰 생성 폼 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold mb-4">새 토큰 발급</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="토큰 용도/이름 (예: CI/CD Pipeline, External App)"
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                        <tr>
                            <th className="px-6 py-4 text-left font-medium">ID</th>
                            <th className="px-6 py-4 text-left font-medium">이름</th>
                            <th className="px-6 py-4 text-left font-medium">토큰 값</th>
                            <th className="px-6 py-4 text-center font-medium">상태</th>
                            <th className="px-6 py-4 text-center font-medium">생성일</th>
                            <th className="px-6 py-4 text-center font-medium">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tokens.map((token) => (
                            <tr key={token.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-500">{token.id}</td>
                                <td className="px-6 py-4 font-medium">{token.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 group">
                                        <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-600 font-mono">
                                            {token.token.substring(0, 10)}...****************
                                        </code>
                                        <button 
                                            onClick={() => copyToClipboard(token.token)}
                                            className="text-gray-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="토큰 복사"
                                        >
                                            {copiedToken === token.token ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        token.can_use === 'Y' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {token.can_use === 'Y' ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                    {token.created_at}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleDelete(token.id)}
                                        className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {tokens.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    발급된 토큰이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
}

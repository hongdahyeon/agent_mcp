import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types/auth';
import {
    AlertCircle,
    Plus,
    Trash2,
    Edit2,
    Shield,
    User as UserIcon,
    Settings,
    Clock,
    RefreshCw,
    X
} from 'lucide-react';
import type { Limit, LimitFormData } from '../types/TargetLimitUsageMng';

import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

export function LimitManagement() {
    const [limits, setLimits] = useState<Limit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [totalItems, setTotalItems] = useState(0);

    // Server-side pagination, so displayed limits are just the limits
    const displayedLimits = limits;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLimit, setEditingLimit] = useState<Limit | null>(null);
    const [formData, setFormData] = useState<LimitFormData>({
        target_type: 'USER',
        target_id: '',
        max_count: 50,
        description: ''
    });

    const [processing, setProcessing] = useState(false);
    const [userList, setUserList] = useState<User[]>([]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/users?page=1&size=100', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.items) setUserList(data.items);
                else if (data.users) setUserList(data.users);
            }
        } catch (e) {
            console.error("Failed to fetch users for select box", e);
        }
    }, []);

    const fetchLimits = useCallback(async (pageNum = page, size = pageSize) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/mcp/limits?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to fetch limit policies');

            const data = await res.json();
            // Response format: { items: [], total: N, page: N, size: N }
            setLimits(data.items);
            setTotalItems(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchLimits(page, pageSize);
        fetchUsers();
    }, [fetchLimits, fetchUsers, page, pageSize]);

    const handleOpenModal = (limit: Limit | null = null) => {
        if (limit) {
            setEditingLimit(limit);
            setFormData({
                target_type: limit.target_type,
                target_id: limit.target_id,
                max_count: limit.max_count,
                description: limit.description || ''
            });
        } else {
            setEditingLimit(null);
            setFormData({
                target_type: 'USER',
                target_id: '',
                max_count: 50,
                description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError('');

        try {
            const res = await fetch('/api/mcp/limits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save policy');

            await fetchLimits();
            setIsModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save policy');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 이 정책을 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`/api/mcp/limits/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to delete policy');

            await fetchLimits();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete policy');
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            사용 제한 관리
                        </h2>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    정책 추가
                </button>
            </header>

            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center border border-red-100 dark:border-red-900/30 transition-colors">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <div className="flex-[2] min-h-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-300">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        대상 (Type / ID)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        제한 횟수 (Daily)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        설명
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        관리
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-500">
                                            로딩 중...
                                        </td>
                                    </tr>
                                ) : limits.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-500">
                                            등록된 정책이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    displayedLimits.map((limit) => (
                                        <tr key={limit.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {limit.target_type === 'ROLE' ? (
                                                        <Shield className="w-4 h-4 text-purple-500 mr-2" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4 text-blue-500 mr-2" />
                                                    )}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${limit.target_type === 'ROLE'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {limit.target_type}
                                                    </span>
                                                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        {limit.target_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {limit.max_count === -1 ? (
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        무제한
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-900 font-bold dark:text-slate-100">
                                                        {limit.max_count.toLocaleString()}회
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs" title={limit.description}>
                                                    {limit.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenModal(limit)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(limit.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
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

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-pretendard">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                            <header className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 transition-colors">
                                        <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">
                                        {editingLimit ? '정책 수정' : '새 정책 추가'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="flex flex-col">
                                <div className="p-6 space-y-4">
                                    {/* Target Type & ID */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                                대상 유형
                                            </label>
                                            <select
                                                className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                value={formData.target_type}
                                                onChange={(e) => setFormData({ ...formData, target_type: e.target.value as 'USER' | 'ROLE' })}
                                            >
                                                <option value="USER">USER</option>
                                                <option value="ROLE">ROLE</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                                {formData.target_type === 'USER' ? '사용자 선택' : '역할 선택'}
                                            </label>
                                            {formData.target_type === 'USER' ? (
                                                <select
                                                    required
                                                    className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={formData.target_id}
                                                    onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                                                >
                                                    <option value="">사용자를 선택하세요</option>
                                                    {userList.map(user => (
                                                        <option key={user.uid} value={user.user_id}>
                                                            {user.user_nm} ({user.user_id})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <select
                                                    required
                                                    className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={formData.target_id}
                                                    onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                                                >
                                                    <option value="">역할을 선택하세요</option>
                                                    <option value="ROLE_USER">ROLE_USER (일반 사용자)</option>
                                                    <option value="ROLE_ADMIN">ROLE_ADMIN (관리자)</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Limit Count */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            일일 제한 횟수 (-1: 무제한)
                                        </label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                                            </div>
                                            <input
                                                type="number"
                                                required
                                                className="block w-full pl-10 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                value={formData.max_count}
                                                onChange={(e) => setFormData({ ...formData, max_count: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            설명 (Optional)
                                        </label>
                                        <textarea
                                            className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all h-20 resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="설명을 입력하세요."
                                        />
                                    </div>
                                </div>

                                <footer className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                                    >
                                        {processing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                        저장
                                    </button>
                                </footer>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

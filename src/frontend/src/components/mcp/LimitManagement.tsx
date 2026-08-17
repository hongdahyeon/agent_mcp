import { useState, useEffect, useCallback } from 'react';
import type { User } from '../../types/auth';
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
    X,
    Key
} from 'lucide-react';
import type { Limit, LimitFormData } from '../../types/TargetLimitUsageMng';

import { getAuthHeaders } from '../../utils/auth';
import { Pagination } from '../common/Pagination';
import { useLanguage } from '../../contexts/LanguageContext';

export function LimitManagement() {
    const { t } = useLanguage();
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
    const [tokenList, setTokenList] = useState<{ id: number, name: string }[]>([]);

    const fetchTokens = useCallback(async () => {
        try {
            const res = await fetch('/api/access-tokens?page=1&size=100', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.items) setTokenList(data.items);
                else if (data.tokens) setTokenList(data.tokens);
            }
        } catch (e) {
            console.error("Failed to fetch tokens for select box", e);
        }
    }, []);

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

            if (!res.ok) throw new Error(t('mcp.limit.fetchFail'));

            const data = await res.json();
            // Response format: { items: [], total: N, page: N, size: N }
            setLimits(data.items);
            setTotalItems(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('mcp.limit.fetchFail'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, t]);

    useEffect(() => {
        fetchLimits(page, pageSize);
        fetchUsers();
        fetchTokens();
    }, [fetchLimits, fetchUsers, fetchTokens, page, pageSize]);

    useEffect(() => {
        // URL 파라미터 체크 (토큰 관리 등에서 바로 넘어온 경우)
        const params = new URLSearchParams(window.location.search);
        const targetType = params.get('target_type');
        const targetId = params.get('target_id');

        if (targetType === 'TOKEN' && targetId) {
            setFormData(prev => ({
                ...prev,
                target_type: 'TOKEN',
                target_id: targetId
            }));
            setIsModalOpen(true);
        }
    }, []);

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

            if (!res.ok) throw new Error(t('mcp.limit.saveFail'));

            await fetchLimits();
            setIsModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('mcp.limit.saveFail'));
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        const message = t('mcp.limit.deleteConfirm');
        if (!confirm(message)) return;

        try {
            const res = await fetch(`/api/mcp/limits/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error(t('mcp.limit.deleteFail'));

            await fetchLimits();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('mcp.limit.deleteFail'));
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
                            {t('mcp.limit.title')}
                        </h2>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('mcp.limit.addPolicyBtn')}
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
                                        {t('mcp.limit.thTarget')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('mcp.limit.thDailyLimit')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('mcp.limit.thDescription')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('mcp.limit.thActions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-500">
                                            {t('mcp.limit.loading')}
                                        </td>
                                    </tr>
                                ) : limits.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-500">
                                            {t('mcp.limit.noPolicies')}
                                        </td>
                                    </tr>
                                ) : (
                                    displayedLimits.map((limit) => (
                                        <tr key={limit.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {limit.target_type === 'ROLE' ? (
                                                        <Shield className="w-4 h-4 text-purple-500 mr-2" />
                                                    ) : limit.target_type === 'TOKEN' ? (
                                                        <Key className="w-4 h-4 text-amber-500 mr-2" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4 text-blue-500 mr-2" />
                                                    )}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${limit.target_type === 'ROLE' ? 'bg-purple-100 text-purple-800' :
                                                        limit.target_type === 'TOKEN' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {limit.target_type}
                                                    </span>
                                                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        {limit.target_type === 'TOKEN'
                                                            ? (tokenList.find(t => String(t.id) === limit.target_id)?.name || limit.target_id)
                                                            : limit.target_id
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {limit.max_count === -1 ? (
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        {t('mcp.limit.unlimited')}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-900 font-bold dark:text-slate-100">
                                                        {t('mcp.limit.countUnit').replace('{count}', limit.max_count.toLocaleString())}
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
                                                    title={t('mcp.limit.editTitle')}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(limit.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title={t('mcp.limit.deleteTitle')}
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
                                        {editingLimit ? t('mcp.limit.modalTitleEdit') : t('mcp.limit.modalTitleAdd')}
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
                                                {t('mcp.limit.labelTargetType')}
                                            </label>
                                            <select
                                                className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                value={formData.target_type}
                                                onChange={(e) => setFormData({ ...formData, target_type: e.target.value as 'USER' | 'ROLE' | 'TOKEN', target_id: '' })}
                                            >
                                                <option value="USER">USER</option>
                                                <option value="ROLE">ROLE</option>
                                                <option value="TOKEN">TOKEN</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                                {formData.target_type === 'USER' ? t('mcp.limit.labelTargetIdUser') : formData.target_type === 'TOKEN' ? t('mcp.limit.labelTargetIdToken') : t('mcp.limit.labelTargetIdRole')}
                                            </label>
                                            {formData.target_type === 'USER' ? (
                                                <select
                                                    required
                                                    className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={formData.target_id}
                                                    onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                                                >
                                                    <option value="">{t('mcp.limit.placeholderSelectUser')}</option>
                                                    {userList.map(user => (
                                                        <option key={user.uid} value={user.user_id}>
                                                            {user.user_nm} ({user.user_id})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : formData.target_type === 'TOKEN' ? (
                                                <select
                                                    required
                                                    className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={formData.target_id}
                                                    onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                                                >
                                                    <option value="">{t('mcp.limit.placeholderSelectToken')}</option>
                                                    {tokenList.map(token => (
                                                        <option key={token.id} value={token.id}>
                                                            {token.name} (ID: {token.id})
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
                                                    <option value="">{t('mcp.limit.placeholderSelectRole')}</option>
                                                    <option value="ROLE_USER">{t('mcp.limit.roleUserOption')}</option>
                                                    <option value="ROLE_ADMIN">{t('mcp.limit.roleAdminOption')}</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Limit Count */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            {t('mcp.limit.labelDailyLimit')}
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
                                            {t('mcp.limit.labelDescription')}
                                        </label>
                                        <textarea
                                            className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all h-20 resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder={t('mcp.limit.placeholderDescription')}
                                        />
                                    </div>
                                </div>

                                <footer className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        {t('mcp.limit.btnCancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                                    >
                                        {processing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                        {t('mcp.limit.btnSave')}
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

import { useState, useEffect } from 'react';
import type { User } from '../types/auth';
import { 
    AlertCircle, 
    Plus, 
    Trash2, 
    Edit2, 
    Shield,
    User as UserIcon,
    Settings,
    Clock
} from 'lucide-react';
import type { Limit, LimitFormData } from '../types/LimitUsageMng';

export function LimitManagement() {
    const [limits, setLimits] = useState<Limit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
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

    useEffect(() => {
        fetchLimits();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users?page=1&size=100');
            if (res.ok) {
                const data = await res.json();
                if (data.items) setUserList(data.items);
                else if (data.users) setUserList(data.users);
            }
        } catch (e) {
            console.error("Failed to fetch users for select box", e);
        }
    };

    const fetchLimits = async () => {
        try {
            // const token = localStorage.getItem('mcp_api_token');
            const res = await fetch('/api/mcp/limits', {
                headers: { 'X-User-Id': 'admin' } // 실제 구현 시에는 user context 사용
            });
            
            if (!res.ok) throw new Error('Failed to fetch limit policies');
            
            const data = await res.json();
            setLimits(data.limits);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

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
                    'X-User-Id': 'admin'
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
                headers: { 'X-User-Id': 'admin' }
            });

            if (!res.ok) throw new Error('Failed to delete policy');
            
            await fetchLimits();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete policy');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">사용 제한 관리</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        사용자 및 역할별 도구 실행 횟수 제한을 관리합니다.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    정책 추가
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                대상 (Type / ID)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                제한 횟수 (Daily)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                설명
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                관리
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    로딩 중...
                                </td>
                            </tr>
                        ) : limits.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    등록된 정책이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            limits.map((limit) => (
                                <tr key={limit.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {limit.target_type === 'ROLE' ? (
                                                <Shield className="w-4 h-4 text-purple-500 mr-2" />
                                            ) : (
                                                <UserIcon className="w-4 h-4 text-blue-500 mr-2" />
                                            )}
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                limit.target_type === 'ROLE' 
                                                    ? 'bg-purple-100 text-purple-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {limit.target_type}
                                            </span>
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {limit.target_id}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {limit.max_count === -1 ? (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                무제한
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-900 font-bold">
                                                {limit.max_count.toLocaleString()}회
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500 truncate max-w-xs" title={limit.description}>
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

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <Settings className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                {editingLimit ? '정책 수정' : '새 정책 추가'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                {/* Target Type & ID */}
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            대상 유형
                                                        </label>
                                                        <select
                                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            value={formData.target_type}
                                                            onChange={(e) => setFormData({...formData, target_type: e.target.value as 'USER' | 'ROLE'})}
                                                        >
                                                            <option value="USER">USER</option>
                                                            <option value="ROLE">ROLE</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            {formData.target_type === 'USER' ? '사용자 선택' : '역할 선택'}
                                                        </label>
                                                        {formData.target_type === 'USER' ? (
                                                            <select
                                                                required
                                                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                value={formData.target_id}
                                                                onChange={(e) => setFormData({...formData, target_id: e.target.value})}
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
                                                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                value={formData.target_id}
                                                                onChange={(e) => setFormData({...formData, target_id: e.target.value})}
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        일일 제한 횟수 (-1: 무제한)
                                                    </label>
                                                    <div className="relative rounded-md shadow-sm">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Clock className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            required
                                                            className="block w-full pl-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            value={formData.max_count}
                                                            onChange={(e) => setFormData({...formData, max_count: parseInt(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        설명 (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={formData.description}
                                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {processing ? '저장 중...' : '저장'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        취소
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

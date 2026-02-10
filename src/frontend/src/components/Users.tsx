import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types/auth';
import {
    Users as UsersIcon, Edit2, X,
    AlertCircle, ToggleLeft, ToggleRight, UserPlus
} from 'lucide-react';
import clsx from 'clsx';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

/* 
* 사용자 관리 화면에 대한 컴포넌트
*/

export function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'update'>('create');

    // Form State
    const [formData, setFormData] = useState({
        user_id: '',
        password: '',
        user_nm: '',
        role: 'ROLE_USER',
        is_enable: 'Y'
    });

    const [idCheckStatus, setIdCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');



    const fetchUsers = useCallback(async (pageNum: number = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?page=${pageNum}&size=${pageSize}`, {
                headers: getAuthHeaders()
            });

            if (!res.ok) {

                throw new Error(`Failed to fetch users: ${res.status}`);
            }

            const data = await res.json();
            
            // API response structure changed to { total, page, size, items }
            if (data.items) {
                setUsers(data.items);
                setTotal(data.total);
                setPage(data.page);
            } else if (data.users) {
                 // Fallback
                setUsers(data.users);
            }

        } catch (err: unknown) {
            console.error("Error in fetchUsers:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(`사용자 목록을 불러오는데 실패했습니다: ${message}`);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    const handleOpenCreate = () => {
        setModalMode('create');
        setFormData({
            user_id: '',
            password: '',
            user_nm: '',
            role: 'ROLE_USER',
            is_enable: 'Y'
        });
        setIdCheckStatus('idle');
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (user: User) => {
        setModalMode('update');
        setFormData({
            user_id: user.user_id,
            password: '', // Not editable here
            user_nm: user.user_nm,
            role: user.role,
            is_enable: user.is_enable || 'Y'
        });
        setIsModalOpen(true);
    };

    const checkUserId = async () => {
        if (!formData.user_id) return;
        setIdCheckStatus('checking');
        try {
            const res = await fetch(`/api/users/check/${formData.user_id}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setIdCheckStatus(data.exists ? 'taken' : 'available');
        } catch {
            setIdCheckStatus('idle');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'create') {
            if (idCheckStatus !== 'available') {
                alert('아이디 중복 확인이 필요합니다.');
                return;
            }
            if (!formData.password) {
                alert('비밀번호를 입력해주세요.');
                return;
            }
        }

        try {
            const url = modalMode === 'create' ? '/api/users' : `/api/users/${formData.user_id}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || '저장 실패');
            }

            setIsModalOpen(false);
            // 생성시 1페이지, 수정시 현재페이지 유지
            fetchUsers(modalMode === 'create' ? 1 : page);
            alert('저장되었습니다.');
        } catch (err) {
            if (err instanceof Error) alert(err.message);
        }
    };

    const toggleEnable = async (user: User) => {
        if (!confirm(`${user.user_nm} 님의 상태를 변경하시겠습니까?`)) return;

        const newStatus = user.is_enable === 'Y' ? 'N' : 'Y';
        try {
            const res = await fetch(`/api/users/${user.user_id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ is_enable: newStatus })
            });
            if (!res.ok) throw new Error('상태 변경 실패');

            fetchUsers(page); // 현재 페이지 유지
        } catch {
            alert('상태 변경 중 오류가 발생했습니다.');
        }
    };
    


    if (loading && users.length === 0) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <UsersIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            사용자 관리
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">시스템 사용자를 조회하고 관리합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    사용자 추가
                </button>
            </header>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / 이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 접속</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">{user.user_nm}</span>
                                            <span className="text-xs text-gray-500">{user.user_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium border",
                                            user.role === 'ROLE_ADMIN'
                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => toggleEnable(user)}
                                            className="flex items-center gap-2 group cursor-pointer"
                                        >
                                            {user.is_enable === 'Y' ? (
                                                <>
                                                    <ToggleRight className="w-8 h-8 text-green-500 group-hover:text-green-600" />
                                                    <span className="text-sm text-green-600 font-medium">활성</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-8 h-8 text-gray-400 group-hover:text-gray-500" />
                                                    <span className="text-sm text-gray-500">비활성</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.last_cnn_dt || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenUpdate(user)}
                                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="정보 수정"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white border-t border-gray-200">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => fetchUsers(p)}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                        }}
                    />
                </div>
            </div>



            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <header className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">
                                {modalMode === 'create' ? '사용자 추가' : '사용자 정보 수정'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.user_id}
                                        onChange={(e) => {
                                            if (modalMode === 'update') return;
                                            setFormData({ ...formData, user_id: e.target.value });
                                            setIdCheckStatus('idle');
                                        }}
                                        disabled={modalMode === 'update'}
                                        className="flex-1 px-3 py-2 border rounded-lg disabled:bg-gray-100"
                                        placeholder="영문/숫자 입력"
                                        required
                                    />
                                    {modalMode === 'create' && (
                                        <button
                                            type="button"
                                            onClick={checkUserId}
                                            disabled={!formData.user_id}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                                        >
                                            중복확인
                                        </button>
                                    )}
                                </div>
                                {idCheckStatus === 'available' && <p className="text-xs text-green-600 mt-1">사용 가능한 아이디입니다.</p>}
                                {idCheckStatus === 'taken' && <p className="text-xs text-red-600 mt-1">이미 사용중인 아이디입니다.</p>}
                            </div>

                            {modalMode === 'create' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="초기 비밀번호"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                                <input
                                    type="text"
                                    value={formData.user_nm}
                                    onChange={(e) => setFormData({ ...formData, user_nm: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                >
                                    <option value="ROLE_USER">ROLE_USER (일반)</option>
                                    <option value="ROLE_ADMIN">ROLE_ADMIN (관리자)</option>
                                </select>
                            </div>

                            {modalMode === 'update' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                                    <select
                                        value={formData.is_enable}
                                        onChange={(e) => setFormData({ ...formData, is_enable: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg bg-white"
                                    >
                                        <option value="Y">활성 (Y)</option>
                                        <option value="N">비활성 (N)</option>
                                    </select>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import type { User } from '../types/auth';
import {
    Users as UsersIcon, Edit2, X,
    AlertCircle, ToggleLeft, ToggleRight, UserPlus
} from 'lucide-react';
import clsx from 'clsx';

/* 
* 사용자 관리 화면에 대한 컴포넌트
*/

export function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            console.log("res>> ", res);

            if (!res.ok) {
                const text = await res.text();
                console.error("Fetch failed:", res.status, text);
                throw new Error(`Failed to fetch users: ${res.status}`);
            }

            const text = await res.text();
            console.log("Response body:", text);

            try {
                const data = JSON.parse(text);
                console.log("Parsed data:", data);
                setUsers(data.users);
            } catch (e) {
                console.error("JSON Parse error:", e);
                throw new Error('Invalid JSON response');
            }
        } catch (err: any) {
            console.error("Error in fetchUsers:", err);
            setError(`사용자 목록을 불러오는데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

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
            const res = await fetch(`/api/users/check/${formData.user_id}`);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || '저장 실패');
            }

            setIsModalOpen(false);
            fetchUsers();
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_enable: newStatus })
            });
            if (!res.ok) throw new Error('상태 변경 실패');

            fetchUsers();
        } catch {
            alert('상태 변경 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UsersIcon className="w-8 h-8 text-blue-600" />
                        사용자 관리
                    </h1>
                    <p className="text-gray-500 mt-1">시스템 사용자를 조회하고 관리합니다.</p>
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                            <th className="py-4 px-6 font-medium">ID / 이름</th>
                            <th className="py-4 px-6 font-medium">권한</th>
                            <th className="py-4 px-6 font-medium">상태</th>
                            <th className="py-4 px-6 font-medium">마지막 접속</th>
                            <th className="py-4 px-6 font-medium text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{user.user_nm}</span>
                                        <span className="text-sm text-gray-400">{user.user_id}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-medium border",
                                        user.role === 'ROLE_ADMIN'
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                    )}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
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
                                <td className="py-4 px-6 text-sm text-gray-500">
                                    {user.last_cnn_dt || '-'}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button
                                        onClick={() => handleOpenUpdate(user)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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

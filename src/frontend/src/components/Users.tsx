import clsx from 'clsx';
import {
    AlertCircle,
    Edit2,
    Lock,
    RefreshCw,
    Shield,
    ToggleLeft, ToggleRight, Unlock, UserIcon, UserPlus,
    Users as UsersIcon,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { User as UserType } from '../types/auth';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

/*
* 사용자 관리 화면에 대한 컴포넌트
*/

export function Users() {
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'update'>('create');

    // Form State
    const [formData, setFormData] = useState({
        user_id: '',
        password: '',
        user_nm: '',
        user_email: '',
        role: 'ROLE_USER',
        is_enable: 'Y',
        is_locked: 'N',
        login_fail_count: 0
    });

    const [idCheckStatus, setIdCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    
    // OTP 관련 상태
    const [otpCode, setOtpCode] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [isEmailEditing, setIsEmailEditing] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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
            if (data.items) {
                setUsers(data.items);
                setTotal(data.total);
                setPage(data.page);
            } else if (data.users) {
                setUsers(data.users);
            }

        } catch (err: unknown) {
            console.error("Error in fetchUsers:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(`사용자 목록을 불러오는데 실패했습니다: ${message} `);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    // 사용자 생성 모달 열기
    const handleOpenCreate = () => {
        setModalMode('create');
        setFormData({
            user_id: '',
            password: '',
            user_nm: '',
            user_email: '',
            role: 'ROLE_USER',
            is_enable: 'Y',
            is_locked: 'N',
            login_fail_count: 0
        });
        setIdCheckStatus('idle');
        setEmailCheckStatus('idle');
        setOtpCode('');
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setIsEmailEditing(true);
        setIsModalOpen(true);
    };

    // 사용자 수정 모달 열기
    const handleOpenUpdate = (user: UserType) => {
        setModalMode('update');
        setFormData({
            user_id: user.user_id,
            password: '', // Not editable here
            user_nm: user.user_nm,
            user_email: user.user_email || '',
            role: user.role,
            is_enable: user.is_enable || 'Y',
            is_locked: user.is_locked || 'N',
            login_fail_count: user.login_fail_count || 0
        });
        setEmailCheckStatus('idle');
        setOtpCode('');
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setIsEmailEditing(false);
        setIsModalOpen(true);
    };

    // user_id 중복 체크
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

    // user_email 중복 체크
    const checkEmail = async () => {
        if (!formData.user_email) return;
        setEmailCheckStatus('checking');
        try {
            const res = await fetch(`/api/users/check-email?user_email=${formData.user_email}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setEmailCheckStatus(data.exists ? 'taken' : 'available');
        } catch {
            setEmailCheckStatus('idle');
        }
    };

    // OTP 발송
    const sendOtp = async () => {
        if (!formData.user_email || emailCheckStatus !== 'available') {
            alert('이메일 중복 확인을 먼저 완료해주세요.');
            return;
        }
        setIsSendingOtp(true);
        try {
            const res = await fetch('/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.user_email, otp_type: 'MANAGEMENT' })
            });
            if (res.ok) {
                setIsOtpSent(true);
                alert('인증 코드가 이메일로 발송되었습니다.');
            } else {
                const data = await res.json();
                alert(data.detail || 'OTP 발송 실패');
            }
        } catch {
            alert('OTP 발송 중 오류가 발생했습니다.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // OTP 검증
    const verifyOtp = async () => {
        if (!otpCode) return;
        setIsVerifyingOtp(true);
        try {
            const res = await fetch('/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.user_email,
                    otp_type: 'MANAGEMENT',
                    otp_code: otpCode
                })
            });
            if (res.ok) {
                setIsOtpVerified(true);
                alert('이메일 인증이 완료되었습니다.');
            } else {
                const data = await res.json();
                alert(data.detail?.message || '인증 코드 확인 실패');
            }
        } catch {
            alert('인증 코드 확인 중 오류가 발생했습니다.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // 사용자 저장, 수정
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'create') {
            if (idCheckStatus !== 'available') {
                alert('아이디 중복 확인이 필요합니다.');
                return;
            }
            if (!formData.user_email || emailCheckStatus !== 'available') {
                alert('이메일 중복 확인이 필요합니다.');
                return;
            }
            if (!isOtpVerified) {
                alert('이메일 인증이 필요합니다.');
                return;
            }
            if (!formData.password) {
                alert('비밀번호를 입력해주세요.');
                return;
            }
        } else {
            // 수정 모드에서 이메일이 변경된 경우
            const currentUser = users.find(u => u.user_id === formData.user_id);
            if (currentUser && currentUser.user_email !== formData.user_email) {
                if (emailCheckStatus !== 'available') {
                    alert('변경된 이메일 중복 확인이 필요합니다.');
                    return;
                }
                if (!isOtpVerified) {
                    alert('변경된 이메일에 대한 인증이 필요합니다.');
                    return;
                }
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
            fetchUsers(modalMode === 'create' ? 1 : page);
            alert('저장되었습니다.');
        } catch (err) {
            if (err instanceof Error) alert(err.message);
        }
    };

    // is_enable 토글 수정
    const toggleEnable = async (user: UserType) => {
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

    // is_locked 토글 수정
    const toggleLock = async (user: UserType) => {
        const newStatus = user.is_locked === 'Y' ? 'N' : 'Y';
        const actionText = newStatus === 'Y' ? '잠금' : '해제';
        if (!confirm(`${user.user_nm} 님을 계정 ${actionText} 하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/users/${user.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    is_locked: newStatus,
                    login_fail_count: newStatus === 'N' ? 0 : user.login_fail_count
                })
            });
            if (!res.ok) throw new Error(`${actionText} 실패`);

            fetchUsers(page);
        } catch {
            alert(`${actionText} 중 오류가 발생했습니다.`);
        }
    };


    if (loading && users.length === 0) return <div className="p-8 text-center text-gray-500">Loading users...</div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            사용자 관리
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">시스템 사용자를 조회하고 관리합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    사용자 추가
                </button>
            </header>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-900/30 transition-colors">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">ID / 이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">이메일</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">권한</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">잠금</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">마지막 접속</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {users.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{user.user_nm}</span>
                                            <span className="text-xs text-gray-500 dark:text-slate-400">{user.user_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600 dark:text-slate-400">{user.user_email}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium border transition-colors",
                                            user.role === 'ROLE_ADMIN'
                                                ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                                                : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {user.is_locked === 'Y' ? (
                                                <>
                                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded text-xs font-medium border border-red-100 dark:border-red-800/50 transition-colors">
                                                        <Lock className="w-3 h-3" /> 잠금 ({user.login_fail_count})
                                                    </span>
                                                    <button
                                                        onClick={() => toggleLock(user)}
                                                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title="잠금 해제"
                                                    >
                                                        <Unlock className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded text-xs border border-gray-100 dark:border-slate-800 transition-colors">
                                                    <Unlock className="w-3 h-3" /> 정상
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
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

                <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors">
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
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-pretendard">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">
                                {modalMode === 'create' ? '사용자 추가' : '사용자 정보 수정'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex flex-col">
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <UserIcon className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        아이디
                                    </label>
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
                                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${modalMode === 'update' ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed border-gray-200 dark:border-slate-800' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100'}`}
                                            placeholder="영문/숫자 입력"
                                            required
                                        />
                                        {modalMode === 'create' && (
                                            <button
                                                type="button"
                                                onClick={checkUserId}
                                                disabled={!formData.user_id || idCheckStatus === 'checking'}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                            >
                                                {idCheckStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : '중복확인'}
                                            </button>
                                        )}
                                    </div>
                                    {idCheckStatus === 'available' && <p className="text-[11px] text-green-600 mt-1 ml-1">사용 가능한 아이디입니다.</p>}
                                    {idCheckStatus === 'taken' && <p className="text-[11px] text-red-600 mt-1 ml-1">이미 사용 중인 아이디입니다.</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        이메일
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={formData.user_email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, user_email: e.target.value });
                                                setEmailCheckStatus('idle');
                                                setIsOtpSent(false);
                                                setIsOtpVerified(false);
                                            }}
                                            disabled={modalMode === 'update' && !isEmailEditing}
                                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                                (modalMode === 'update' && !isEmailEditing)
                                                    ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed border-gray-200 dark:border-slate-800'
                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100'
                                            }`}
                                            placeholder="example@email.com"
                                            required
                                        />
                                        {modalMode === 'update' && !isEmailEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEmailEditing(true)}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                                            >
                                                이메일 수정
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={checkEmail}
                                                disabled={!formData.user_email || emailCheckStatus === 'checking'}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                            >
                                                {emailCheckStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : '중복확인'}
                                            </button>
                                        )}
                                    </div>
                                    {emailCheckStatus === 'available' && <p className="text-[11px] text-green-600 mt-1 ml-1">사용 가능한 이메일입니다.</p>}
                                    {emailCheckStatus === 'taken' && <p className="text-[11px] text-red-600 mt-1 ml-1">이미 사용 중인 이메일입니다.</p>}
                                    
                                    {/* OTP flow */}
                                    {emailCheckStatus === 'available' && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value)}
                                                    placeholder="인증코드"
                                                    disabled={isOtpVerified}
                                                    className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                />
                                                {!isOtpSent ? (
                                                    <button
                                                        type="button"
                                                        onClick={sendOtp}
                                                        disabled={isSendingOtp}
                                                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isSendingOtp ? '발송중...' : '인증코드 발송'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={verifyOtp}
                                                        disabled={isVerifyingOtp || isOtpVerified || !otpCode}
                                                        className={`px-3 py-2 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${isOtpVerified ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                        {isOtpVerified ? '인증완료' : isVerifyingOtp ? '확인중...' : '인증확인'}
                                                    </button>
                                                )}
                                            </div>
                                            {isOtpSent && !isOtpVerified && <p className="text-[10px] text-indigo-500 ml-1">이메일로 발송된 인증코드를 입력해주세요.</p>}
                                        </div>
                                    )}
                                </div>

                                {modalMode === 'create' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                            <Shield className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                            비밀번호
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                            placeholder="초기 비밀번호"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <UserIcon className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        이름
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.user_nm}
                                        onChange={(e) => setFormData({ ...formData, user_nm: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                        placeholder="홍길동"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <Shield className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        권한
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    >
                                        <option value="ROLE_USER">ROLE_USER (일반)</option>
                                        <option value="ROLE_ADMIN">ROLE_ADMIN (관리자)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        상태
                                    </label>
                                    <select
                                        value={formData.is_enable}
                                        onChange={(e) => setFormData({ ...formData, is_enable: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    >
                                        <option value="Y">활성 (Y)</option>
                                        <option value="N">비활성 (N)</option>
                                    </select>
                                </div>

                                {modalMode === 'update' && (
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                                <Lock className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                                계정 잠금
                                            </label>
                                            <select
                                                value={formData.is_locked}
                                                onChange={(e) => setFormData({ ...formData, is_locked: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                            >
                                                <option value="N">정상 (N)</option>
                                                <option value="Y">잠금 (Y)</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                                실패 횟수
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.login_fail_count}
                                                onChange={(e) => setFormData({ ...formData, login_fail_count: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                )}
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
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                                >
                                    저장
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
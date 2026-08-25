import clsx from 'clsx';
import {
    AlertCircle,
    Edit2,
    Lock,
    RefreshCw,
    Shield,
    ToggleLeft, ToggleRight, Trash2, Unlock, UserIcon, UserPlus,
    Users as UsersIcon,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { User as UserType } from '../../types/auth';
import { getAuthHeaders } from '../../utils/auth';
import { Pagination } from '../common/Pagination';
import { useLanguage } from '../../contexts/LanguageContext';

/*
* 사용자 관리 화면에 대한 컴포넌트
*/

export function Users() {
    const { t } = useLanguage();
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
        is_approved: 'N',
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
            setError(t('systemTab.users.fetchFail').replace('{message}', message));
            console.error(`사용자 목록 조회 실패: ${message}`)
        } finally {
            setLoading(false);
        }
    }, [pageSize, t]);

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
            is_approved: 'N',
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
            is_approved: user.is_approved || 'Y',
            login_fail_count: user.login_fail_count || 0
        });
        setEmailCheckStatus('idle');
        setOtpCode('');
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setIsEmailEditing(false);
        setIsModalOpen(true);
    };

    // 사용자 삭제 (Soft Delete)
    const handleDeleteUser = async (user: UserType) => {
        const message = t('systemTab.users.deleteConfirm').replace('{name}', user.user_nm).replace('{id}', user.user_id);
        if (!window.confirm(message)) {
            return;
        }

        try {
            const res = await fetch(`/api/users/${user.user_id}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_delete: 'Y' })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to delete user');
            }

            alert(t('systemTab.users.deleteSuccess'));
            fetchUsers(page);
        } catch (err: unknown) {
            console.error("Error in handleDeleteUser:", err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(t('systemTab.users.deleteFail').replace('{message}', message));
        }
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
            alert(t('systemTab.users.otpNeedEmailCheck'));
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
                alert(t('systemTab.users.otpSent'));
            } else {
                const data = await res.json();
                alert(data.detail || t('systemTab.users.otpSendFail'));
            }
        } catch {
            alert(t('systemTab.users.otpSendErr'));
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
                alert(t('systemTab.users.otpVerifyOk'));
            } else {
                const data = await res.json();
                alert(data.detail?.message || t('systemTab.users.otpVerifyFail'));
            }
        } catch {
            alert(t('systemTab.users.otpVerifyErr'));
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // 사용자 저장, 수정
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'create') {
            if (idCheckStatus !== 'available') {
                alert(t('systemTab.users.needIdCheck'));
                return;
            }
            if (!formData.user_email || emailCheckStatus !== 'available') {
                alert(t('systemTab.users.needEmailCheck'));
                return;
            }
            if (!isOtpVerified) {
                alert(t('systemTab.users.needOtp'));
                return;
            }
            if (!formData.password) {
                alert(t('systemTab.users.needPassword'));
                return;
            }
        } else {
            // 수정 모드에서 이메일이 변경된 경우
            const currentUser = users.find(u => u.user_id === formData.user_id);
            if (currentUser && currentUser.user_email !== formData.user_email) {
                if (emailCheckStatus !== 'available') {
                    alert(t('systemTab.users.needNewEmailCheck'));
                    return;
                }
                if (!isOtpVerified) {
                    alert(t('systemTab.users.needNewOtp'));
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
                throw new Error(data.detail || t('systemTab.users.saveFail'));
            }

            setIsModalOpen(false);
            fetchUsers(modalMode === 'create' ? 1 : page);
            alert(t('systemTab.users.saveSuccess'));
        } catch (err) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    // is_enable 토글 수정
    const toggleEnable = async (user: UserType) => {
        const newStatus = user.is_enable === 'Y' ? 'N' : 'Y';
        const actionText = newStatus === 'Y' ? t('systemTab.users.enableText') : t('systemTab.users.disableText');
        if (!confirm(t('systemTab.users.enableConfirm').replace('{name}', user.user_nm).replace('{action}', actionText))) return;
        try {
            const res = await fetch(`/api/users/${user.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ is_enable: newStatus })
            });
            if (!res.ok) throw new Error(t('systemTab.users.toggleError'));

            fetchUsers(page); // 현재 페이지 유지
        } catch {
            alert(t('systemTab.users.toggleError'));
        }
    };

    // is_locked 토글 수정
    const toggleLock = async (user: UserType) => {
        const newStatus = user.is_locked === 'Y' ? 'N' : 'Y';
        const actionText = newStatus === 'Y' ? t('systemTab.users.lockAction') : t('systemTab.users.unlockAction');
        if (!confirm(t('systemTab.users.lockConfirm').replace('{name}', user.user_nm).replace('{action}', actionText))) return;

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
            if (!res.ok) throw new Error(t('systemTab.users.lockToggleError').replace('{action}', actionText));

            fetchUsers(page);
        } catch {
            alert(t('systemTab.users.lockToggleError').replace('{action}', actionText));
        }
    };


    if (loading && users.length === 0) return <div className="p-8 text-center text-gray-500 font-pretendard">{t('systemTab.users.loading')}</div>;

    return (
        <div className="flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            {t('systemTab.users.title')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('systemTab.users.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm font-medium text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    {t('systemTab.users.addUserBtn')}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thIdName')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thEmail')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thRole')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thStatus')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thApproval')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thLock')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thLastLogin')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('systemTab.users.thActions')}</th>
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
                                                    <span className="text-sm text-green-600 font-medium">{t('systemTab.users.enableY')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-8 h-8 text-gray-400 group-hover:text-gray-500" />
                                                    <span className="text-sm text-gray-500">{t('systemTab.users.enableN')}</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium border transition-colors",
                                            user.is_approved === 'Y'
                                                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50"
                                                : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50"
                                        )}>
                                            {user.is_approved === 'Y' ? t('systemTab.users.approvedY') : t('systemTab.users.approvedN')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {user.is_locked === 'Y' ? (
                                                <>
                                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded text-xs font-medium border border-red-100 dark:border-red-800/50 transition-colors">
                                                        <Lock className="w-3 h-3" /> {t('systemTab.users.badgeLocked').replace('{count}', String(user.login_fail_count))}
                                                    </span>
                                                    <button
                                                        onClick={() => toggleLock(user)}
                                                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title={t('systemTab.users.tooltipUnlock')}
                                                    >
                                                        <Unlock className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded text-xs border border-gray-100 dark:border-slate-800 transition-colors">
                                                    <Unlock className="w-3 h-3" /> {t('systemTab.users.badgeUnlocked')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                        {user.last_cnn_dt || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleOpenUpdate(user)}
                                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title={t('systemTab.users.tooltipEdit')}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title={t('systemTab.users.tooltipDelete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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
            
            {/* 하단 여백 추가 */}
            <div className="h-10 flex-none" />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-pretendard">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">
                                {modalMode === 'create' ? t('systemTab.users.modalCreate') : t('systemTab.users.modalUpdate')}
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
                                        {t('systemTab.users.labelUserId')}
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
                                            placeholder={t('systemTab.users.placeholderUserId')}
                                            required
                                        />
                                        {modalMode === 'create' && (
                                            <button
                                                type="button"
                                                onClick={checkUserId}
                                                disabled={!formData.user_id || idCheckStatus === 'checking'}
                                                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                            >
                                                {idCheckStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('systemTab.users.btnCheck')}
                                            </button>
                                        )}
                                    </div>
                                    {idCheckStatus === 'available' && <p className="text-[11px] text-green-600 mt-1 ml-1">{t('systemTab.users.idAvailable')}</p>}
                                    {idCheckStatus === 'taken' && <p className="text-[11px] text-red-600 mt-1 ml-1">{t('systemTab.users.idTaken')}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        {t('systemTab.users.labelEmail')}
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
                                                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                            >
                                                {t('systemTab.users.btnEditEmail')}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={checkEmail}
                                                disabled={!formData.user_email || emailCheckStatus === 'checking'}
                                                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                            >
                                                {emailCheckStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('systemTab.users.btnCheck')}
                                            </button>
                                        )}
                                    </div>
                                    {emailCheckStatus === 'available' && <p className="text-[11px] text-green-600 mt-1 ml-1">{t('systemTab.users.emailAvailable')}</p>}
                                    {emailCheckStatus === 'taken' && <p className="text-[11px] text-red-600 mt-1 ml-1">{t('systemTab.users.emailTaken')}</p>}
                                    
                                    {/* OTP flow */}
                                    {emailCheckStatus === 'available' && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value)}
                                                    placeholder={t('systemTab.users.placeholderOtp')}
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
                                                        {isSendingOtp ? t('systemTab.users.btnSendingOtp') : t('systemTab.users.btnSendOtp')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={verifyOtp}
                                                        disabled={isVerifyingOtp || isOtpVerified || !otpCode}
                                                        className={`px-3 py-2 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${isOtpVerified ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                        {isOtpVerified ? t('systemTab.users.btnVerifiedOtp') : isVerifyingOtp ? t('systemTab.users.btnVerifyingOtp') : t('systemTab.users.btnVerifyOtp')}
                                                    </button>
                                                )}
                                            </div>
                                            {isOtpSent && !isOtpVerified && <p className="text-[10px] text-indigo-500 ml-1">{t('systemTab.users.otpHint')}</p>}
                                        </div>
                                    )}
                                </div>

                                {modalMode === 'create' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                            <Shield className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                            {t('systemTab.users.labelPassword')}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                            placeholder={t('systemTab.users.placeholderPassword')}
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <UserIcon className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        {t('systemTab.users.labelName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.user_nm}
                                        onChange={(e) => setFormData({ ...formData, user_nm: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                        placeholder={t('systemTab.users.placeholderName')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <Shield className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        {t('systemTab.users.labelRole')}
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    >
                                        <option value="ROLE_USER">{t('systemTab.users.roleUserOption')}</option>
                                        <option value="ROLE_ADMIN">{t('systemTab.users.roleAdminOption')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <Shield className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        {t('systemTab.users.labelApproved')}
                                    </label>
                                    <select
                                        value={formData.is_approved}
                                        onChange={(e) => setFormData({ ...formData, is_approved: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    >
                                        <option value="Y">{t('systemTab.users.approvedY')}</option>
                                        <option value="N">{t('systemTab.users.approvedN')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        {t('systemTab.users.labelEnable')}
                                    </label>
                                    <select
                                        value={formData.is_enable}
                                        onChange={(e) => setFormData({ ...formData, is_enable: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    >
                                        <option value="Y">{t('systemTab.users.enableY')}</option>
                                        <option value="N">{t('systemTab.users.enableN')}</option>
                                    </select>
                                </div>

                                {modalMode === 'update' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                            <Lock className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                            {t('systemTab.users.labelLock')}
                                        </label>
                                        <select
                                            value={formData.is_locked}
                                            onChange={(e) => setFormData({ ...formData, is_locked: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                        >
                                            <option value="N">{t('systemTab.users.lockN')}</option>
                                            <option value="Y">{t('systemTab.users.lockY')}</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <footer className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    {t('systemTab.users.btnCancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                                >
                                    {t('systemTab.users.btnSave')}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
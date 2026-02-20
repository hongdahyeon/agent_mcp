import React, { useState } from 'react';
import { X, User, Lock, UserPlus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const SignupModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [userId, setUserId] = useState('');
    const [userNm, setUserNm] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [idChecked, setIdChecked] = useState(false);
    const [isCheckingId, setIsCheckingId] = useState(false);
    const [idError, setIdError] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleCheckId = async () => {
        if (!userId) return;
        setIsCheckingId(true);
        setIdError('');
        setIdChecked(false);
        try {
            const res = await fetch(`/auth/check-id?user_id=${userId}`);
            const data = await res.json();
            if (data.exists) {
                setIdError('이미 사용 중인 아이디입니다.');
            } else {
                setIdChecked(true);
            }
        } catch {
            setIdError('아이디 확인 중 오류가 발생했습니다.');
        } finally {
            setIsCheckingId(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!idChecked) {
            setError('아이디 중복 확인이 필요합니다.');
            return;
        }
        if (password.length < 4) {
            setError('비밀번호는 4자리 이상이어야 합니다.');
            return;
        }
        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    user_nm: userNm,
                    password: password
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(data.message);
                // 3초 후 닫기
                setTimeout(() => {
                    onClose();
                    // 초기화
                    setUserId('');
                    setUserNm('');
                    setPassword('');
                    setConfirmPassword('');
                    setIdChecked(false);
                    setSuccess('');
                }, 3000);
            } else {
                setError(data.detail || '회원가입에 실패했습니다.');
            }
        } catch {
            setError('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
                {/* Header */}
                <div className="bg-gray-50/50 dark:bg-slate-900/50 border-b dark:border-slate-700 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">회원가입</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-green-500 dark:text-green-400" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-bold text-gray-900 dark:text-white">가입 신청 완료!</p>
                                <p className="text-gray-500 dark:text-slate-400 text-sm whitespace-pre-line">{success}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSignup} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* ID */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">아이디</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={userId}
                                            onChange={(e) => {
                                                setUserId(e.target.value);
                                                setIdChecked(false);
                                                setIdError('');
                                            }}
                                            className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${idChecked ? 'border-green-500 ring-green-500/10 dark:bg-slate-700 dark:text-white' :
                                                    idError ? 'border-red-500 ring-red-500/10 dark:bg-slate-700 dark:text-white' : 'border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                            placeholder="아이디를 입력하세요"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCheckId}
                                        disabled={!userId || isCheckingId || idChecked}
                                        className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                        {isCheckingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : '중복확인'}
                                    </button>
                                </div>
                                {idError && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 ml-1">{idError}</p>}
                                {idChecked && <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 ml-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> 사용 가능한 아이디입니다.
                                </p>}
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">이름</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={userNm}
                                        onChange={(e) => setUserNm(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-700 dark:text-white outline-none transition-all"
                                        placeholder="이름을 입력하세요"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">비밀번호</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-700 dark:text-white outline-none transition-all"
                                        placeholder="4자리 이상 입력"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">비밀번호 확인</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all ${confirmPassword && password === confirmPassword ? 'border-green-500 ring-green-500/10 dark:bg-slate-700 dark:text-white' :
                                                confirmPassword && password !== confirmPassword ? 'border-red-500 ring-red-500/10 dark:bg-slate-700 dark:text-white' : 'border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        placeholder="다시 한번 입력하세요"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 mt-6 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                가입하기
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

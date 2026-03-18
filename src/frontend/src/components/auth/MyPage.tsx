import { useState, useEffect } from 'react';
import { Shield, Activity, Globe, CheckCircle2, AlertCircle, X, RefreshCw, User as UserIcon, Edit2, Terminal } from 'lucide-react';
import { getAuthHeaders } from '../../utils/auth';
import type { SessionUser } from '../../types/auth';
import type { MyOpenApiUsage } from '../../types/openapi';
import type { MyMcpUsage } from '../../types/UserUsage';

/**
 * 내 정보 (My Page) 컴포넌트
 * - 사용자의 기본 정보(이름, ID, 권한)를 조회합니다.
 * + OpenAPI 사용량도 표시합니다.
 */
export function MyPage() {
    const [user, setUser] = useState<SessionUser | null>(() => {
        const userStr = localStorage.getItem('user_session');
        return userStr ? JSON.parse(userStr) : null;
    }); // 사용자 세션 정보

    const [usage, setUsage] = useState<MyOpenApiUsage | null>(null);
    const [mcpUsage, setMcpUsage] = useState<MyMcpUsage | null>(null);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // 프로필 수정 모달 관련 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        user_nm: '',
        user_email: '',
        telegram_chat_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // 이메일 인증 관련 상태
    const [emailStep, setEmailStep] = useState<'IDLE' | 'CHECKED' | 'OTP_SENT' | 'VERIFIED'>('IDLE');
    const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [otpCode, setOtpCode] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/users/me', { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setEditForm({
                        user_nm: data.user_nm || '',
                        user_email: data.user_email || '',
                        telegram_chat_id: data.telegram_chat_id || ''
                    });
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchUsage = async () => {
            setLoadingUsage(true);
            try {
                // OpenAPI 사용량
                const res = await fetch('/api/openapi/my-usage', { headers: getAuthHeaders() });
                if (res.ok) {
                    setUsage(await res.json());
                }

                // 일반 MCP 도구 사용량
                const mcpRes = await fetch('/api/mcp/my-usage', { headers: getAuthHeaders() });
                if (mcpRes.ok) {
                    setMcpUsage(await mcpRes.json());
                }
            } catch (err) {
                console.error('Failed to fetch my usage:', err);
            } finally {
                setLoadingUsage(false);
            }
        };
        fetchUsage();
    }, []);

    // 수정 모달 열기
    const handleEditStart = () => {
        if (!user) return;
        setEditForm({
            user_nm: user.user_nm || '',
            user_email: user.user_email || '',
            telegram_chat_id: user.telegram_chat_id || ''
        });
        setEmailStep(user.user_email ? 'VERIFIED' : 'IDLE');
        setEmailCheckStatus('idle');
        setEmailError('');
        setOtpCode('');
        setIsModalOpen(true);
    };

    // 이메일 중복 체크
    const handleCheckEmail = async () => {
        if (!editForm.user_email) return;
        if (editForm.user_email === user?.user_email) {
            setEmailStep('VERIFIED');
            setEmailCheckStatus('available');
            return;
        }
        setEmailCheckStatus('checking');
        try {
            const res = await fetch(`/auth/check-email?user_email=${encodeURIComponent(editForm.user_email)}`);
            const data = await res.json();
            if (data.exists) {
                setEmailError('이미 사용 중인 이메일입니다.');
                setEmailCheckStatus('taken');
            } else {
                setEmailStep('CHECKED');
                setEmailCheckStatus('available');
                setEmailError('');
            }
        } catch (err) {
            console.error('Email check error:', err);
            setEmailError('중복 체크 중 오류가 발생했습니다.');
            setEmailCheckStatus('idle');
        }
    };

    // OTP 발송
    const handleSendOtp = async () => {
        setIsSendingOtp(true);
        try {
            const res = await fetch('/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: editForm.user_email, otp_type: 'PROFILE_UPDATE' })
            });
            if (res.ok) {
                setEmailStep('OTP_SENT');
                alert('인증 코드가 발송되었습니다.');
            } else {
                alert('OTP 발송 실패');
            }
        } catch (err) {
            console.error('OTP send error:', err);
            alert('OTP 발송 오류');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // OTP 검증
    const handleVerifyOtp = async () => {
        setIsVerifyingOtp(true);
        try {
            const res = await fetch('/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: editForm.user_email, otp_type: 'PROFILE_UPDATE', otp_code: otpCode })
            });
            if (res.ok) {
                setEmailStep('VERIFIED');
                alert('이메일 인증이 완료되었습니다.');
            } else {
                alert('인증 코드가 일치하지 않습니다.');
            }
        } catch (err) {
            console.error('OTP verify error:', err);
            alert('인증 오류');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // 최종 저장
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editForm.user_email !== user?.user_email && emailStep !== 'VERIFIED') {
            alert('이메일 인증을 완료해주세요.');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                const updatedUser = { ...user, ...editForm };
                setUser(updatedUser as SessionUser);
                // 로컬 스토리지 갱신
                const sessionStr = localStorage.getItem('user_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    localStorage.setItem('user_session', JSON.stringify({ ...session, ...editForm }));
                }
                setIsModalOpen(false);
                alert('정보가 수정되었습니다.');
            } else {
                alert('수정 실패');
            }
        } catch (err) {
            console.error('Save profile error:', err);
            alert('수정 중 오류 발생');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const usagePercent = usage && usage.limit > 0
        ? Math.min(100, (usage.usage / usage.limit) * 100)
        : 0;

    const mcpUsagePercent = mcpUsage && mcpUsage.limit > 0
        ? Math.min(100, (mcpUsage.usage / mcpUsage.limit) * 100)
        : 0;

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 font-pretendard">
            {/* 상단 헤더 영역 */}
            <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">내 정보 (My Page)</h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400">계정 정보 및 사용 현황을 확인합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleEditStart}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                >
                    <Edit2 className="w-4 h-4" />
                    수정하기
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {/* 프로필 정보 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" /> 기본 정보
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3 h-10 items-center">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">아이디</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_id}</span>
                        </div>

                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3 h-10 items-center">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">이름</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_nm}</span>
                        </div>

                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3 h-10 items-center">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">이메일</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.user_email || '-'}</span>
                        </div>

                        <div className="flex justify-between border-b border-gray-50 dark:border-slate-800 pb-3 h-10 items-center">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">텔레그램 ID</span>
                            <span className="font-medium text-gray-900 dark:text-slate-200">{user.telegram_chat_id || '-'}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3 h-10">
                            <span className="text-gray-500 dark:text-slate-400 text-sm">권한</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'ROLE_ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 오늘의 OpenAPI 사용 현황 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-rose-500 dark:text-rose-400" /> 오늘의 OpenAPI 사용 현황
                    </h3>

                    {loadingUsage ? (
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">데이터를 불러오는 중...</div>
                    ) : usage ? (
                        <div className="space-y-6">
                            {/* 전체 한도 게이지 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 dark:text-slate-400">전체 한도 사용률</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                        {usage.usage} / {usage.limit === -1 ? '∞' : usage.limit} 건
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out rounded-full ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                                            }`}
                                        style={{ width: `${usage.limit === -1 ? 0 : usagePercent}%` }}
                                    />
                                </div>
                                {usage.limit !== -1 && usage.remaining <= 10 && usage.remaining > 0 && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-500 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" /> 일일 잔여 횟수가 얼마 남지 않았습니다! ({usage.remaining}건 남음)
                                    </p>
                                )}
                            </div>

                            {/* 도구별 분석 */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">도구별 사용량</h4>
                                {usage.tool_usage.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {usage.tool_usage.map(tool => (
                                            <div key={tool.tool_id} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 transition-colors">
                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                    <Globe className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                                    <span className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{tool.tool_id}</span>
                                                </div>
                                                <span className="flex-shrink-0 px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[11px] font-bold text-gray-600 dark:text-slate-400">
                                                    {tool.cnt}회
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 dark:text-slate-500">오늘 사용한 도구가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">사용량 정보를 찾을 수 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* 오늘의 일반 MCP 도구 사용 현황 카드 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-6 flex items-center">
                        <Terminal className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" /> 오늘의 일반 MCP 도구 사용 현황
                    </h3>

                    {loadingUsage ? (
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">데이터를 불러오는 중...</div>
                    ) : mcpUsage ? (
                        <div className="space-y-6">
                            {/* 전체 한도 게이지 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 dark:text-slate-400">전체 한도 사용률</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                        {mcpUsage.usage} / {mcpUsage.limit === -1 ? '∞' : mcpUsage.limit} 건
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out rounded-full ${mcpUsagePercent > 90 ? 'bg-rose-500' : mcpUsagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${mcpUsage.limit === -1 ? 0 : mcpUsagePercent}%` }}
                                    />
                                </div>
                                {mcpUsage.limit !== -1 && mcpUsage.remaining <= 10 && mcpUsage.remaining > 0 && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-500 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" /> 일일 잔여 횟수가 얼마 남지 않았습니다! ({mcpUsage.remaining}건 남음)
                                    </p>
                                )}
                            </div>

                            {/* 도구별 분석 */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">도구별 사용량</h4>
                                {mcpUsage.tool_usage.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {mcpUsage.tool_usage.map(tool => (
                                            <div key={tool.tool_nm} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 transition-colors">
                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                    <Terminal className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                                    <span className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{tool.tool_nm}</span>
                                                </div>
                                                <span className="flex-shrink-0 px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[11px] font-bold text-gray-600 dark:text-slate-400">
                                                    {tool.cnt}회
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                                        <p className="text-xs text-gray-400 dark:text-slate-500">오늘 사용한 도구가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">사용량 정보를 찾을 수 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 프로필 수정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">내 정보 수정</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <form onSubmit={handleSave} className="flex flex-col">
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-pretendard">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        <UserIcon className="w-4 h-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                                        아이디
                                    </label>
                                    <input
                                        type="text"
                                        value={user.user_id}
                                        disabled
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed border-gray-200 dark:border-slate-800 outline-none transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1 ml-1">아이디는 수정할 수 없습니다.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        이름
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.user_nm}
                                        onChange={(e) => setEditForm({ ...editForm, user_nm: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="이름 입력"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        이메일
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={editForm.user_email}
                                            onChange={(e) => {
                                                setEditForm({ ...editForm, user_email: e.target.value });
                                                setEmailStep('IDLE');
                                                setEmailCheckStatus('idle');
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="example@email.com"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckEmail}
                                            disabled={!editForm.user_email || emailCheckStatus === 'checking'}
                                            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                        >
                                            {emailCheckStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : '중복확인'}
                                        </button>
                                    </div>
                                    {emailCheckStatus === 'available' && editForm.user_email !== user.user_email && (
                                        <p className="text-[11px] text-green-600 mt-1 ml-1">사용 가능한 이메일입니다. 인증을 진행해주세요.</p>
                                    )}
                                    {emailCheckStatus === 'taken' && <p className="text-[11px] text-red-600 mt-1 ml-1">{emailError}</p>}

                                    {/* OTP 영역 */}
                                    {emailCheckStatus === 'available' && editForm.user_email !== user.user_email && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 space-y-3">
                                            {emailStep === 'CHECKED' && (
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    disabled={isSendingOtp}
                                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    {isSendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : '인증 코드 발송'}
                                                </button>
                                            )}

                                            {emailStep === 'OTP_SENT' && (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="인증코드 6자리"
                                                            value={otpCode}
                                                            onChange={(e) => setOtpCode(e.target.value)}
                                                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-center tracking-widest font-mono"
                                                            maxLength={6}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyOtp}
                                                            disabled={otpCode.length < 6 || isVerifyingOtp}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                                                        >
                                                            {isVerifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : '확인'}
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOtp}
                                                        className="text-[11px] text-indigo-500 hover:underline w-full text-center"
                                                    >
                                                        코드 재발송
                                                    </button>
                                                </div>
                                            )}

                                            {emailStep === 'VERIFIED' && (
                                                <div className="flex items-center justify-center text-green-600 dark:text-green-500 py-1">
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                    <span className="text-sm font-bold">이메일 인증 완료</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center">
                                        텔레그램 ID
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.telegram_chat_id}
                                        onChange={(e) => setEditForm({ ...editForm, telegram_chat_id: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Chat ID (숫자)"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1 ml-1">알림 수신을 위한 본인의 Telegram Chat ID를 입력하세요.</p>
                                </div>
                            </div>

                            <footer className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex gap-3 transition-colors">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || (editForm.user_email !== user.user_email && emailStep !== 'VERIFIED')}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? '저장 중...' : '변경사항 저장'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

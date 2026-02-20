import { useState, useEffect } from 'react';
import type { User } from '../types/auth';
import { Lock, User as UserIcon, LogIn, AlertCircle, UserPlus } from 'lucide-react';
import { SignupModal } from './SignupModal';

/* 
* 로그인 화면에 대한 컴포넌트
*/

interface Props {
    onLogin: (user: User) => void;
}

export function Login({ onLogin }: Props) {
    const [userId, setUserId] = useState('');               // 아이디
    const [password, setPassword] = useState('');           // 비밀번호
    const [rememberMe, setRememberMe] = useState(false);    // 아이디 기억하기
    const [error, setError] = useState('');                 // 에러 메시지
    const [loading, setLoading] = useState(false);          // 로딩 상태
    const [isSignupOpen, setIsSignupOpen] = useState(false); // 회원가입 모달 상태

    // 컴포넌트 마운트 시 저장된 아이디 불러오기
    useEffect(() => {
        const savedId = localStorage.getItem('saved_user_id');
        if (savedId) {
            setUserId(savedId);
            setRememberMe(true);
        }
    }, []);

    // 로그인 submit 핸들러
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 4) {
            setError('비밀번호는 4자리 이상이어야 합니다.');
            return;
        }

        setLoading(true);
        try {
            // OAuth2 Password Request Flow (form-data)
            const formData = new FormData();
            formData.append('username', userId);
            formData.append('password', password);

            const res = await fetch('/auth/login', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 401) {
                    throw new Error(data.detail || '아이디 또는 비밀번호가 잘못되었습니다.');
                }
                if (res.status === 403) {
                    // detail 내용에 locked가 포함되어 있으면 계정 잠김
                    if (data.detail && data.detail.includes('locked')) {
                        throw new Error('계정이 잠겼습니다. 관리자에게 문의하세요.');
                    }
                    // detail 내용에 locked가 포함되어 있지 않으면 계정 비활성화
                    throw new Error('계정이 비활성화되었습니다.');
                }
                throw new Error('로그인 중 오류가 발생했습니다.');
            }

            const data = await res.json();
            // JWT Response: { access_token, token_type, user }
            if (data.access_token && data.user) {
                // API Token 저장 (SSE 연결 및 API 호출용)
                localStorage.setItem('mcp_api_token', data.access_token);

                // 아이디 기억하기 처리
                if (rememberMe) {
                    localStorage.setItem('saved_user_id', userId);
                } else {
                    localStorage.removeItem('saved_user_id');
                }

                onLogin(data.user);
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('로그인 중 알 수 없는 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700 transition-colors">
                <div className="bg-blue-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Agent MCP Login</h1>
                    <p className="text-blue-100 mt-2">시스템에 접속하려면 로그인하세요</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">아이디</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors"
                                    placeholder="Enter User ID"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">비밀번호</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                                </div>
                                <input
                                    type="password"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors"
                                    placeholder="Enter Password (4+ chars)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-slate-300">
                                아이디 기억하기
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? '로그인 중...' : '로그인'}
                            {!loading && <LogIn className="ml-2 w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-slate-500">초기 계정: admin / 1234</span>
                        <button
                            onClick={() => setIsSignupOpen(true)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            회원가입
                        </button>
                    </div>
                </div>
            </div>

            <SignupModal
                isOpen={isSignupOpen}
                onClose={() => setIsSignupOpen(false)}
            />
        </div>
    );
}

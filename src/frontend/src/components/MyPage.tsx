import { useEffect, useState } from 'react';
import { Key, Copy, RefreshCw, Eye, EyeOff, Check, AlertTriangle, Shield } from 'lucide-react';

import { getAuthHeaders } from '../utils/auth';
import type { SessionUser } from '../types/auth';

/**
 * 내 정보 (My Page) 컴포넌트
 * - 사용자의 기본 정보(이름, ID, 권한)를 조회합니다.
 * - MCP 연결 토큰(API Key)을 발급받거나 조회, 복사할 수 있습니다.
 */
export function MyPage() {
    const [user, setUser] = useState<SessionUser | null>(null); // 사용자 세션 정보
    const [tokenData, setTokenData] = useState<{ exists: boolean, token?: string, expired_at?: string } | null>(null); // 토큰 데이터
    const [loading, setLoading] = useState(false); // 로딩 상태
    const [showToken, setShowToken] = useState(false); // 토큰 표시 여부 토글
    const [copySuccess, setCopySuccess] = useState(false); // 복사 완료 알림 상태

    /**
     * 현재 사용자의 활성 토큰 조회
     * - 서버로부터 토큰 존재 여부, 값, 만료일을 받아옵니다.
     */
    const fetchToken = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/token', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setTokenData(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 컴포넌트 마운트 시 사용자 정보 로드 및 토큰 조회
     * - localStorage에서 세션을 읽어와 사용자 정보를 설정합니다.
     * - 토큰 조회를 위한 fetchToken 함수를 호출합니다.
     */
    useEffect(() => {
        const userStr = localStorage.getItem('user_session');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        fetchToken();
    }, []);

    /**
     * 새 토큰 발급 요청
     * - 기존 토큰이 있어도 만료시키고 새로 발급합니다.
     */
    const generateToken = async () => {
        if (!confirm("새로운 토큰을 발급하시겠습니까? 기존 토큰은 즉시 만료됩니다.")) return;

        setLoading(true);
        try {
            const res = await fetch('/api/user/token', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // [UX 개선] 발급된 토큰을 로컬 스토리지에 자동 저장하여 바로 테스트 가능하도록 함
                    if (data.token) {
                        localStorage.setItem('mcp_api_token', data.token);
                    }
                    await fetchToken();
                    alert("새 토큰이 발급되었습니다.\n(클라이언트에 자동 적용되었습니다)");
                }
            }
        } catch (e) {
            alert("토큰 발급 실패: " + String(e));
        } finally {
            setLoading(false);
        }
    };

    /**
     * 토큰 클립보드 복사 핸들러
     */
    const handleCopy = () => {
        if (tokenData?.token) {
            navigator.clipboard.writeText(tokenData.token);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000); // 2초 후 복사 아이콘 복귀
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* 상단 헤더 영역 */}
            <header className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">내 정보 (My Page)</h1>
                    <p className="text-sm text-gray-500">계정 정보 및 MCP 연결 키를 관리합니다.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 좌측: 프로필 정보 카드 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-gray-500" /> 기본 정보
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                            <span className="text-gray-500 text-sm">이름</span>
                            <span className="font-medium text-gray-900">{user.user_nm}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                            <span className="text-gray-500 text-sm">아이디</span>
                            <span className="font-medium text-gray-900">{user.user_id}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                            <span className="text-gray-500 text-sm">권한</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 우측: 토큰 관리 카드 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Key className="w-5 h-5 mr-2 text-amber-500" /> MCP 연결 토큰
                    </h3>

                    <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-4">
                            Claude Desktop 등 외부 Client에서 MCP 서버에 접속할 때 사용하는 인증 키입니다.
                            <br />
                            <span className="text-xs text-amber-600 flex items-center mt-1">
                                <AlertTriangle className="w-3 h-3 mr-1" /> 이 키는 타인과 공유하지 마세요.
                            </span>
                        </p>

                        {!tokenData?.exists ? (
                            /* 토큰 미발급 상태: 발급 버튼 표시 */
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <p className="text-gray-500 mb-3 text-sm">발급된 토큰이 없습니다.</p>
                                <button
                                    onClick={generateToken}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    토큰 발급받기
                                </button>
                            </div>
                        ) : (
                            /* 토큰 존재 상태: 토큰 정보 및 관리 버튼 표시 */
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">API Key</span>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setShowToken(!showToken)} className="text-gray-400 hover:text-gray-600" title={showToken ? "숨기기" : "보기"}>
                                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={handleCopy} className="text-gray-400 hover:text-blue-600" title="복사">
                                            {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="font-mono text-sm break-all text-gray-800 bg-white p-3 rounded border border-gray-200 shadow-inner">
                                    {showToken ? tokenData?.token : "sk_mcp_********************************"}
                                </div>
                                <div className="mt-3 flex justify-between items-center text-xs">
                                    <span className="text-gray-500">만료일: {tokenData?.expired_at?.substring(0, 10)}</span>
                                    <button
                                        onClick={generateToken}
                                        className="text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" /> 재발급
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    )
}

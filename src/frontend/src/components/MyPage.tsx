import { useState } from 'react';
import { Shield } from 'lucide-react';

import type { SessionUser } from '../types/auth';

/**
 * 내 정보 (My Page) 컴포넌트
 * - 사용자의 기본 정보(이름, ID, 권한)를 조회합니다.
 */
export function MyPage() {
    const [user] = useState<SessionUser | null>(() => {
        const userStr = localStorage.getItem('user_session');
        return userStr ? JSON.parse(userStr) : null;
    }); // 사용자 세션 정보

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
                    <p className="text-sm text-gray-500">계정 정보를 확인합니다.</p>
                </div>
            </header>

            <div className="max-w-2xl">
                {/* 프로필 정보 카드 */}
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

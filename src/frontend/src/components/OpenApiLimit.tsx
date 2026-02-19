import { useState, useEffect, useCallback } from 'react';
import {
    ShieldAlert,
    Plus,
    Trash2,
    Save,
    X,
    User,
    Shield,
    Key
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import type { OpenApiLimit } from '../types/openapi';
import { Pagination } from './common/Pagination';
import clsx from 'clsx';

interface ExternalToken {
    id: number;
    name: string;
}

export default function OpenApiLimitView() {
    const [limits, setLimits] = useState<OpenApiLimit[]>([]);
    const [tokens, setTokens] = useState<ExternalToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    // 폼 상태
    const [isEditing, setIsEditing] = useState(false);
    const [currentLimit, setCurrentLimit] = useState<Partial<OpenApiLimit>>({
        target_type: 'ROLE',
        target_id: 'ROLE_USER',
        max_count: 100,
        description: ''
    });

    // 제한 정책 목록 조회
    const fetchLimits = useCallback(async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/openapi/limits?page=${pageNum}&size=${pageSize}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setLimits(data.items);
                setTotal(data.total);
                setPage(data.page);
            }
        } catch (err) {
            console.error('Failed to fetch limits:', err);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    // 외부 토큰 목록 조회
    const fetchTokens = useCallback(async () => {
        try {
            const res = await fetch('/api/access-tokens?size=100', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setTokens(data.items || []);
            }
        } catch (err) {
            console.error('Failed to fetch tokens:', err);
        }
    }, []);

    useEffect(() => {
        fetchLimits(1);
        fetchTokens();
    }, [fetchLimits, fetchTokens]);

    // 제한 정책 저장
    const handleSave = async () => {
        try {
            const res = await fetch('/api/openapi/limits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(currentLimit)
            });
            if (res.ok) {
                setIsEditing(false);
                fetchLimits(page);
            }
        } catch (err) {
            console.error('Failed to save limit:', err);
        }
    };

    // 제한 정책 삭제
    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/openapi/limits/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) fetchLimits(page);
        } catch (err) {
            console.error('Failed to delete limit:', err);
        }
    };

    // 제한 정책 편집
    const openEdit = (limit?: OpenApiLimit) => {
        if (limit) {
            setCurrentLimit(limit);
        } else {
            setCurrentLimit({
                target_type: 'ROLE',
                target_id: 'ROLE_USER',
                max_count: 100,
                description: ''
            });
        }
        setIsEditing(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">
                        <ShieldAlert className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 font-pretendard">API 사용 제한 관리</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-pretendard">사용자, 권한, 외부 토큰별 일일 호출 한도를 설정합니다.</p>
                    </div>
                </div>
                <button
                    onClick={() => openEdit()}
                    className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm font-pretendard"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    정책 추가
                </button>
            </header>

            {isEditing && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 font-pretendard">
                                {currentLimit.id ? '제한 정책 수정' : '새 제한 정책 추가'}
                            </h3>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">대상 유형</label>
                                        <div className="flex space-x-2">
                                            {(['ROLE', 'USER', 'TOKEN'] as const).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setCurrentLimit({ ...currentLimit, target_type: type, target_id: type === 'ROLE' ? 'ROLE_USER' : '' })}
                                                    className={clsx(
                                                        "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all",
                                                        currentLimit.target_type === type
                                                            ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-700 font-bold"
                                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {type === 'ROLE' ? '권한 (Role)' : type === 'USER' ? '사용자 (User)' : '토큰 (Token)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 font-pretendard">대상 식별자 (Target ID)</label>
                                        {currentLimit.target_type === 'TOKEN' ? (
                                            <select
                                                value={currentLimit.target_id}
                                                onChange={(e) => setCurrentLimit({ ...currentLimit, target_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-pretendard"
                                            >
                                                <option value="">토큰 선택...</option>
                                                {tokens.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                                                ))}
                                            </select>
                                        ) : currentLimit.target_type === 'ROLE' ? (
                                            <select
                                                value={currentLimit.target_id}
                                                onChange={(e) => setCurrentLimit({ ...currentLimit, target_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-pretendard"
                                            >
                                                <option value="ROLE_USER">일반 사용자 (ROLE_USER)</option>
                                                <option value="ROLE_ADMIN">관리자 (ROLE_ADMIN)</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={currentLimit.target_id}
                                                onChange={(e) => setCurrentLimit({ ...currentLimit, target_id: e.target.value })}
                                                placeholder="사용자 ID (예: admin, user1)"
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-pretendard"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 font-pretendard">일일 최대 호출 횟수 (-1: 무제한)</label>
                                        <input
                                            type="number"
                                            value={currentLimit.max_count}
                                            onChange={(e) => setCurrentLimit({ ...currentLimit, max_count: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 font-pretendard">설명</label>
                                        <input
                                            type="text"
                                            value={currentLimit.description || ''}
                                            onChange={(e) => setCurrentLimit({ ...currentLimit, description: e.target.value })}
                                            placeholder="설명을 입력하세요"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-pretendard"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800 font-pretendard"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors flex items-center shadow-sm font-pretendard"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Limits List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 font-pretendard">등록된 정책 목록</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider font-pretendard">유형</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider font-pretendard">대상 ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider font-pretendard">일일 한도</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider font-pretendard">설명</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider font-pretendard">작업</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {loading && limits.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">로딩 중...</td></tr>
                            ) : limits.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">등록된 정책이 없습니다.</td></tr>
                            ) : (
                                limits.map(limit => (
                                    <tr key={limit.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            {limit.target_type === 'USER' ? (
                                                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                                                    <User className="w-3 h-3 mr-1" /> 사용자
                                                </span>
                                            ) : limit.target_type === 'ROLE' ? (
                                                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                                    <Shield className="w-3 h-3 mr-1" /> 권한
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                                                    <Key className="w-3 h-3 mr-1" /> 토큰
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 dark:text-slate-100 font-pretendard">
                                                    {limit.target_name || limit.target_id}
                                                </span>
                                                {limit.target_name && (
                                                    <span className="text-xs text-gray-500 dark:text-slate-500 font-normal font-mono">
                                                        ({limit.target_id})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-slate-200 font-pretendard">
                                            {limit.max_count === -1 ? '무제한' : `${limit.max_count}회`}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 font-pretendard">{limit.description}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openEdit(limit)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="수정"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(limit.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors duration-300">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(total / pageSize)}
                        pageSize={pageSize}
                        totalItems={total}
                        onPageChange={(p) => fetchLimits(p)}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30 transition-colors duration-300">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2 flex items-center font-pretendard">
                    <ShieldAlert className="w-4 h-4 mr-2" /> 제한 적용 우선순위
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-pretendard">
                    동일한 요청에 대해 여러 정책이 겹치는 경우, 다음과 같은 순서로 가장 먼저 발견된 정책이 적용됩니다:
                    <br />
                    <strong className="text-blue-900 dark:text-blue-200">1. 토큰 (TOKEN)</strong> &gt;
                    <strong className="text-blue-900 dark:text-blue-200">2. 사용자 (USER)</strong> &gt;
                    <strong className="text-blue-900 dark:text-blue-200">3. 권한 (ROLE)</strong>
                    <br />
                    정책이 전혀 없는 경우 기본적으로 <strong className="text-blue-900 dark:text-blue-200">무제한(-1)</strong>으로 처리됩니다.
                </p>
            </div>
        </div>
    );
}

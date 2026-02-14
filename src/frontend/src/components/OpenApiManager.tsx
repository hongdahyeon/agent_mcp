import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Plus, Trash2, Edit2, Play, Save, X, Link as LinkIcon, FileText, Upload, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';
import type { OpenApiConfig, UploadedFile } from '../types/openApiConfig';

// 파일 다운로드
const handleDownload = async (fileId: string, fileName: string) => {
    try {
        const res = await fetch(`/api/files/download/${fileId}`, {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('다운로드 실패');
        }
    } catch (e) {
        console.error(e);
        alert('다운로드 중 오류 발생');
    }
};

export function OpenApiManager() {
    const [apis, setApis] = useState<OpenApiConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentApi, setCurrentApi] = useState<Partial<OpenApiConfig>>({});

    // File Upload State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
    const [removedFileIds, setRemovedFileIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Additional Modals
    const [fileListModal, setFileListModal] = useState<{ open: boolean; batchId?: string; apiName?: string }>({ open: false });
    const [testModal, setTestModal] = useState<{ open: boolean; api?: OpenApiConfig; testParams: Record<string, string>; result?: unknown; loading?: boolean }>({ open: false, testParams: {} });
    const [showAuthKey, setShowAuthKey] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [resultCopied, setResultCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);

    // 현재 세션 유저 정보
    const [currentUser] = useState(() => {
        const userStr = localStorage.getItem('user_session');
        return userStr ? JSON.parse(userStr) : null;
    });
    const isAdmin = currentUser?.role === 'ROLE_ADMIN';

    // OpenAPI 목록 조회
    const fetchApis = useCallback(async (pageNum = page, size = pageSize) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/openapi?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch OpenAPIs');
            const data = await res.json();
            setApis(data.items || []);
            setTotalItems(data.total || 0);
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchApis(page, pageSize);
    }, [page, pageSize, fetchApis]);

    // OpenAPI 저장
    const handleSave = async () => {
        if (!currentApi.tool_id || !currentApi.name_ko || !currentApi.api_url) {
            alert('필수 정보를 입력해주세요 (도구 ID, 한글명, URL)');
            return;
        }

        let batchId = currentApi.batch_id;

        // 1. 기존 파일 삭제 처리
        if (removedFileIds.length > 0) {
            try {
                await Promise.all(removedFileIds.map(fileId =>
                    fetch(`/api/files/${fileId}`, { method: 'DELETE', headers: getAuthHeaders() })
                ));
            } catch (err) {
                console.error('파일 삭제 중 오류 발생:', err);
                // 삭제 실패 시에도 진행? 일단 경고
            }
        }

        // 2. 파일이 선택되어 있다면 먼저 업로드
        if (selectedFiles.length > 0) {
            try {
                setIsUploading(true);
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append('files', file));
                if (batchId) {
                    formData.append('batch_id', batchId);
                }

                const uploadRes = await fetch('/api/files/upload', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('파일 업로드에 실패했습니다.');
                const uploadData = await uploadRes.json();
                batchId = uploadData.batch_id;
            } catch (err: unknown) {
                if (err instanceof Error) alert(err.message);
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        // 2. OpenAPI 정보 저장
        try {
            const res = await fetch('/api/openapi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    ...currentApi,
                    batch_id: batchId,
                    method: currentApi.method || 'GET',
                    auth_type: currentApi.auth_type || 'NONE',
                }),
            });

            if (!res.ok) throw new Error('Failed to save OpenAPI');

            setIsModalOpen(false);
            setCurrentApi({});
            setSelectedFiles([]);
            setAttachedFiles([]);
            setRemovedFileIds([]);
            fetchApis();
        } catch (err: unknown) {
            if (err instanceof Error) alert(err.message);
        }
    };

    // 등록된 OpenAPI 삭제
    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/openapi/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error('Failed to delete OpenAPI');
            fetchApis();
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message || '삭제에 실패했습니다.');
        }
    };

    // 선택 파일 삭제
    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // 파일 삭제
    const removeAttachedFile = (fileId: string) => {
        setAttachedFiles(prev => prev.filter(f => f.file_id !== fileId));
        setRemovedFileIds(prev => [...prev, fileId]);
    };

    // 파일 목록 조회
    const fetchAttachedFiles = async (batchId: string) => {
        try {
            const res = await fetch(`/api/files/batch/${batchId}`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setAttachedFiles(data.files || []);
            }
        } catch (err) {
            console.error('Failed to fetch attached files:', err);
        }
    };

    // 수정 모달
    const openEditModal = (api: OpenApiConfig) => {
        setCurrentApi({ ...api });
        setRemovedFileIds([]);
        setSelectedFiles([]);
        setShowAuthKey(false);
        if (api.batch_id) {
            fetchAttachedFiles(api.batch_id);
        } else {
            setAttachedFiles([]);
        }
        setIsModalOpen(true);
    };

    // 테스트 실행
    const handleRunTest = async () => {
        if (!testModal.api) return;
        setTestModal(prev => ({ ...prev, loading: true, result: null }));
        try {
            // testParams를 쿼리 문자열로 변환
            const qs = new URLSearchParams(testModal.testParams).toString();
            const url = `/api/execute/${testModal.api.tool_id}${qs ? `?${qs}` : ''}`;

            const res = await fetch(url, {
                method: testModal.api.method === 'GET' ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                }
            });
            const data = await res.json();
            setTestModal(prev => ({ ...prev, result: data, loading: false }));
        } catch (err: unknown) {
            setTestModal(prev => ({ ...prev, result: { error: err instanceof Error ? err.message : String(err) }, loading: false }));
        }
    };

    if (loading && apis.length === 0) return <div className="p-8 text-center text-gray-500">Loading OpenAPI configurations...</div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50">
                        <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {isAdmin ? 'OpenAPI Proxy 관리' : 'OpenAPI 목록 및 테스트'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAdmin
                                ? '외부 Public OpenAPI를 등록하고 내부 URL로 실행할 수 있도록 중계(Proxy)합니다.'
                                : '사용 가능한 OpenAPI 목록을 확인하고 직접 테스트해볼 수 있습니다.'}
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setCurrentApi({}); setIsModalOpen(true); setSelectedFiles([]); setAttachedFiles([]); setRemovedFileIds([]); }}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        신규 API 등록
                    </button>
                )}
            </header>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-gray-600 text-sm sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left font-medium">도구 ID / 한글명</th>
                                <th className="px-6 py-4 text-left font-medium">기관명</th>
                                <th className="px-6 py-4 text-left font-medium">메서드 / URL</th>
                                <th className="px-6 py-4 text-center font-medium">첨부파일</th>
                                <th className="px-6 py-4 text-center font-medium">인증</th>
                                {isAdmin && <th className="px-6 py-4 text-center font-medium">등록일</th>}
                                <th className="px-6 py-4 text-center font-medium">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {apis.map((api) => (
                                <tr key={api.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{api.name_ko}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-1">{api.tool_id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{api.org_name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={
                                            `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${api.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`
                                        }>
                                            {api.method}
                                        </span>
                                        <span className="text-sm text-gray-500 truncate inline-block max-w-[200px]" title={api.api_url}>
                                            {api.api_url}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {api.batch_id ? (
                                            <button
                                                onClick={() => setFileListModal({ open: true, batchId: api.batch_id, apiName: api.name_ko })}
                                                className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                            >
                                                <FileText className="w-3 h-3" />
                                                연동됨
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={
                                            `text-xs px-2 py-0.5 rounded-full ${api.auth_type === 'NONE' ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-700'
                                            }`
                                        }>
                                            {api.auth_type}
                                        </span>
                                    </td>
                                    {/* isAdmin: 등록일 */}
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-center text-xs text-gray-400">
                                            {api.reg_dt}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            {/* 관리자만 수정, 삭제 버튼 표시 */}
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(api)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="수정"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(api.id!)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => {
                                                    let params = {};
                                                    try {
                                                        if (api.params_schema) {
                                                            params = JSON.parse(api.params_schema);
                                                        }
                                                    } catch (e) { console.error("Params parse error:", e); }
                                                    setTestModal({ open: true, api: api, testParams: params });
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                title="테스트 실행"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {apis.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-20 text-center text-gray-500">
                                        등록된 OpenAPI가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white border-t border-gray-100 p-2">
                    <Pagination
                        currentPage={page}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        totalPages={Math.ceil(totalItems / pageSize)}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-600" />
                                {currentApi.id ? 'API 정보 수정' : '신규 API 등록'}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setSelectedFiles([]); setAttachedFiles([]); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* 기본 정보 */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> 기본 정보
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">도구 ID (영문, URL 경로용) *</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                                            placeholder="ex: get_holiday_info"
                                            value={currentApi.tool_id || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, tool_id: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">한글명 (표시용) *</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                            placeholder="ex: 공휴일 정보 조회"
                                            value={currentApi.name_ko || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, name_ko: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">기관명</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                            placeholder="ex: 공공데이터포털"
                                            value={currentApi.org_name || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, org_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">메서드</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                                            value={currentApi.method || 'GET'}
                                            onChange={(e) => setCurrentApi({ ...currentApi, method: e.target.value })}
                                        >
                                            <option value="GET">GET</option>
                                            <option value="POST_JSON">POST (JSON)</option>
                                            <option value="POST_FORM">POST (Form Data)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs font-medium text-gray-500">OpenAPI URL *</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                                placeholder="https://api.example.com/v1/resource"
                                                value={currentApi.api_url || ''}
                                                onChange={(e) => setCurrentApi({ ...currentApi, api_url: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 인증 설정 */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4" /> 인증 설정
                                </h4>
                                <div className="grid grid-cols-3 gap-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-purple-700">인증 유형</label>
                                        <select
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm bg-white"
                                            value={currentApi.auth_type || 'NONE'}
                                            onChange={(e) => setCurrentApi({ ...currentApi, auth_type: e.target.value })}
                                        >
                                            <option value="NONE">없음 (None)</option>
                                            <option value="SERVICE_KEY">서비스 키 (Query Param)</option>
                                            <option value="BEARER">Bearer Token (Header)</option>
                                        </select>
                                    </div>
                                    <div className={`space-y-1 ${currentApi.auth_type === 'NONE' ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <label className="text-xs font-medium text-purple-700">파라미터명 (ex: serviceKey)</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm"
                                            placeholder="serviceKey"
                                            value={currentApi.auth_param_nm || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, auth_param_nm: e.target.value })}
                                        />
                                    </div>
                                    <div className={`col-span-1 space-y-1 ${currentApi.auth_type === 'NONE' ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <label className="text-xs font-medium text-purple-700">인증 키값 (Token/Key)</label>
                                        <div className="relative">
                                            <input
                                                type={showAuthKey ? "text" : "password"}
                                                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm pr-10"
                                                placeholder="실제 인증키 입력"
                                                value={currentApi.auth_key_val || ''}
                                                onChange={(e) => setCurrentApi({ ...currentApi, auth_key_val: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAuthKey(!showAuthKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
                                            >
                                                {showAuthKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 상세 설정 */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> 상세 설정
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 flex justify-between">
                                            <span>파라미터 JSON 스키마</span>
                                            <span className="text-[10px] text-gray-400">JSON 형식으로 입력</span>
                                        </label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono h-24"
                                            placeholder='{"solYear": "2024", "solMonth": "05"}'
                                            value={currentApi.params_schema || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, params_schema: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">연합 파일 (h_file 연동)</label>
                                        <div
                                            className={
                                                `border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors 
                                                    ${selectedFiles.length > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                                                }`
                                            }
                                            onClick={() => {
                                                console.log("Uploader clicked, ref:", fileInputRef.current);
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            <Upload className={`w-6 h-6 mx-auto mb-1 ${selectedFiles.length > 0 ? 'text-indigo-600' : 'text-gray-400'}`} />
                                            <p className="text-[10px] text-gray-500">
                                                {selectedFiles.length > 0 ? `${selectedFiles.length}개 파일 선택됨 (클릭하여 추가)` : '클릭하여 파일 업로드'}
                                            </p>
                                        </div>
                                        {/* Hidden input moved outside for stability */}
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={(e) => {
                                                const files = e.target.files ? Array.from(e.target.files) : [];
                                                console.log("Files selected (OnChange):", files);
                                                if (files.length > 0) {
                                                    setSelectedFiles(prev => {
                                                        const next = [...prev, ...files];
                                                        console.log("Updating selectedFiles state. Next length:", next.length);
                                                        return next;
                                                    });
                                                }
                                                // Clear value after capturing to local variable
                                                e.target.value = '';
                                            }}
                                        />

                                        {/* 통합 파일 목록 (기존 + 신규) */}
                                        <div className="mt-2 space-y-1 border-2 border-indigo-100 rounded-lg p-2 bg-white shadow-inner">
                                            <p className="text-[10px] font-bold text-indigo-500 mb-2 px-1 uppercase flex justify-between">
                                                <span>📎 첨부 파일 ({selectedFiles.length + attachedFiles.length})</span>
                                                {selectedFiles.length > 0 && <span className="text-indigo-600 animate-pulse">새 파일 대기 중...</span>}
                                            </p>

                                            {/* 신규 파일 목록 - 최상단 고정 */}
                                            {selectedFiles.length > 0 && selectedFiles.map((file, idx) => (
                                                <div key={`new-file-${idx}`} className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-300 mb-1 last:mb-0 shadow-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                                                        <span className="text-sm text-indigo-900 truncate font-semibold">{file.name}</span>
                                                        <span className="text-[10px] bg-white text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-200 font-bold shrink-0">신규</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }}
                                                        className="ml-2 p-1.5 text-indigo-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                                                        title="취소"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* 기존 파일 목록 */}
                                            {attachedFiles.length > 0 && attachedFiles.map((file) => (
                                                <div key={file.file_uid} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 mb-1 last:mb-0">
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                                        <span className="text-sm text-gray-700 truncate">{file.org_file_nm}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">({(file.file_size / 1024).toFixed(1)}KB)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(file.file_id, file.org_file_nm); }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded transition-all"
                                                            title="다운로드"
                                                        >
                                                            <Upload className="w-4 h-4 rotate-180" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeAttachedFile(file.file_id); }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded transition-all"
                                                            title="삭제"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {selectedFiles.length === 0 && attachedFiles.length === 0 && (
                                                <div className="py-6 text-center">
                                                    <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-xs text-gray-400 italic font-medium text-center">첨부된 파일이 없습니다.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Agent용 부가 설명</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm h-[68px] resize-none"
                                            placeholder="LLM Agent에게 전달할 힌트"
                                            value={currentApi.description_agent || ''}
                                            onChange={(e) => setCurrentApi({ ...currentApi, description_agent: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <footer className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsModalOpen(false); setSelectedFiles([]); setAttachedFiles([]); }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isUploading}
                                className={`px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        업로드 중...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        저장하기
                                    </>
                                )}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* File List Modal (Viewer) */}
            {fileListModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    첨부 파일 목록
                                </h3>
                                <p className="text-xs text-indigo-500 mt-0.5">{fileListModal.apiName}</p>
                            </div>
                            <button onClick={() => setFileListModal({ open: false })} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <BatchFileList batchId={fileListModal.batchId!} />
                        </div>
                        <footer className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setFileListModal({ open: false })} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">닫기</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Test Execution Modal */}
            {testModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50/30">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Play className="w-5 h-5 text-green-600" />
                                    OpenAPI 테스트 실행
                                </h3>
                                <p className="text-xs text-green-600 mt-0.5">{testModal.api?.name_ko} ({testModal.api?.tool_id})</p>
                            </div>
                            <button onClick={() => setTestModal(prev => ({ ...prev, open: false }))} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <Globe className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-indigo-900">자동 인증 활성화</p>
                                        <p className="text-xs text-indigo-700 leading-relaxed">
                                            현재 로그인된 세션의 인증 정보(JWT)를 사용하여 내부 중계 API를 안전하게 실행합니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-1 pt-3 border-t border-indigo-200/50">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">외부 실행용 엔드포인트</label>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/api/execute/${testModal.api?.tool_id}`;
                                                navigator.clipboard.writeText(url);
                                                setUrlCopied(true);
                                                setTimeout(() => setUrlCopied(false), 2000);
                                            }}
                                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                                        >
                                            {urlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {urlCopied ? '복사완료' : 'URL 복사'}
                                        </button>
                                    </div>
                                    <div className="bg-white/60 p-2 rounded-lg border border-indigo-200 text-[11px] font-mono text-indigo-900 break-all">
                                        {window.location.origin}/api/execute/{testModal.api?.tool_id}
                                    </div>
                                </div>
                            </div>

                            {/* Parameter Inputs */}
                            {testModal.api?.params_schema && (
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-indigo-500" />
                                        파라미터 입력 (Query String)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        {Object.keys(testModal.testParams).map(key => (
                                            <div key={key} className="space-y-1">
                                                <span className="text-[10px] text-gray-500 font-mono ml-1 uppercase">{key}</span>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    value={testModal.testParams[key] || ''}
                                                    onChange={(e) => setTestModal(prev => ({
                                                        ...prev,
                                                        testParams: { ...prev.testParams, [key]: e.target.value }
                                                    }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400">설정된 Params Schema를 기반으로 동적 입력 필드가 생성되었습니다.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700">실행 결과</label>
                                    <div className="flex items-center gap-2">
                                        {!!testModal.result && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(JSON.stringify(testModal.result, null, 2));
                                                    setResultCopied(true);
                                                    setTimeout(() => setResultCopied(false), 2000);
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg transition-all"
                                            >
                                                {resultCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {resultCopied ? '복사됨' : '결과 복사'}
                                            </button>
                                        )}
                                        {testModal.loading && <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />}
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-xl p-4 overflow-hidden border border-gray-800 relative group">
                                    <pre className="text-xs text-green-400 font-mono overflow-auto max-h-80 custom-scrollbar">
                                        {testModal.result ? JSON.stringify(testModal.result, null, 2) : (testModal.loading ? '실행 중...' : '테스트를 실행해주세요.')}
                                    </pre>
                                </div>
                            </div>
                        </div>
                        <footer className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setTestModal(prev => ({ ...prev, open: false }))} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">닫기</button>
                            <button
                                onClick={handleRunTest}
                                disabled={testModal.loading}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                <Play className="w-4 h-4" />
                                실행하기
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}

// 모달 내 파일 목록
function BatchFileList({ batchId }: { batchId: string }) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const res = await fetch(`/api/files/batch/${batchId}`, { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setFiles(data.files || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [batchId]);

    if (loading) return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
    if (files.length === 0) return <div className="text-center py-8 text-sm text-gray-400 italic">첨부된 파일이 없습니다.</div>;

    return (
        <div className="space-y-2">
            {files.map((file) => (
                <div key={file.file_uid} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl hover:shadow-sm transition-shadow group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.org_file_nm}</p>
                            <p className="text-[10px] text-gray-400">{(file.file_size / 1024).toFixed(1)} KB • {new Date(file.reg_dt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(file.file_id, file.org_file_nm); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="다운로드"
                    >
                        <Upload className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            ))}
        </div>
    );
}

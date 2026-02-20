
import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, Edit2, Play, AlertCircle, X, Database, Code, RefreshCw
} from 'lucide-react';
import type { CustomTool, ToolParam, CustomToolFormData } from '../types/CustomToolMng';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';

/**
 * 사용자 정의 도구 (Custom Tools) 관리 컴포넌트
 * - 등록된 도구 목록을 조회, 생성, 수정, 삭제합니다.
 * - SQL 쿼리나 Python 로직을 작성하고 즉시 테스트해볼 수 있습니다.
 */
export function CustomTools() {
    // -------------------------------------------------------------------------
    // 1. 상태 관리 (State Management)
    // -------------------------------------------------------------------------

    // 도구 목록 및 로딩/에러 상태
    const [tools, setTools] = useState<CustomTool[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState(''); // API 에러 등 글로벌 에러
    const [processing, setProcessing] = useState(false); // 저장/삭제 중 로딩 상태

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Server-side pagination
    const displayedTools = Array.isArray(tools) ? tools : [];

    // 모달(Modal) 관련 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<CustomTool | null>(null); // 수정 시 해당 도구 정보

    // 폼 데이터 (생성/수정 시 사용)
    const [formData, setFormData] = useState<CustomToolFormData>({
        name: '',
        tool_type: 'SQL',
        definition: '',
        description_user: '',
        description_agent: '',
        is_active: 'Y',
        params: []
    });

    // 필드별 유효성 검사 에러 상태 (key: 필드명, value: 에러메시지)
    // 파라미터의 경우 `param_name_${index}` 형태로 키를 생성
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    // 테스트 실행(Run) 관련 상태
    const [testResult, setTestResult] = useState<string>('');
    const [testParams, setTestParams] = useState<{ [key: string]: string | number | boolean }>({});
    const [isTestRunning, setIsTestRunning] = useState(false);

    // -------------------------------------------------------------------------
    // 2. 초기화 및 데이터 로딩
    // -------------------------------------------------------------------------
    /** 도구 목록 조회 API 호출 */
    const fetchTools = useCallback(async (pageNum = page, size = pageSize) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/mcp/custom-tools?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setTools(data.items);
                setTotalItems(data.total);
            } else {
                throw new Error('Failed to fetch tools');
            }
        } catch (e) {
            setGlobalError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchTools(page, pageSize);
    }, [fetchTools, page, pageSize]);

    /** 도구 상세 정보 조회 (수정을 위해 파라미터 정보까지 로드) */
    const fetchToolDetail = async (toolId: number) => {
        try {
            const res = await fetch(`/api/mcp/custom-tools/${toolId}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();

                setEditingTool(data.tool);
                setFormData({
                    name: data.tool.name,
                    tool_type: data.tool.tool_type,
                    definition: data.tool.definition,
                    description_user: data.tool.description_user || '',
                    description_agent: data.tool.description_agent || '',
                    is_active: data.tool.is_active,
                    params: data.params.map((p: ToolParam) => ({
                        param_name: p.param_name,
                        param_type: p.param_type,
                        is_required: p.is_required,
                        description: p.description
                    }))
                });
                setFieldErrors({}); // 에러 초기화
                setIsModalOpen(true);
            }
        } catch (e) {
            console.error(e);
            alert("상세 정보를 불러오는데 실패했습니다.");
        }
    };

    // -------------------------------------------------------------------------
    // 3. 이벤트 핸들러 (Event Handlers)
    // -------------------------------------------------------------------------

    /** '새 도구 만들기' 버튼 클릭 시 모달 초기화 */
    const handleOpenModal = () => {
        setEditingTool(null);
        setFormData({
            name: '',
            tool_type: 'SQL',
            definition: '',
            description_user: '',
            description_agent: '',
            is_active: 'Y',
            params: []
        });
        setFieldErrors({});
        setTestResult('');
        setIsModalOpen(true);
    };

    /** 파라미터 추가 버튼 클릭 */
    const handleAddParam = () => {
        setFormData({
            ...formData,
            params: [...formData.params, {
                param_name: '',
                param_type: 'STRING',
                is_required: 'Y',
                description: ''
            }]
        });
    };

    /** 파라미터 삭제 버튼 클릭 */
    const handleRemoveParam = (index: number) => {
        const newParams = [...formData.params];
        newParams.splice(index, 1);
        setFormData({ ...formData, params: newParams });

        // 삭제된 인덱스 이후의 에러 메시지 키 정리 (복잡하므로 에러도 날림)
        setFieldErrors(prev => {
            const next = { ...prev };
            // 단순히 전체 파라미터 에러를 날리고 재검증 유도하거나, 여기서 놔둬도 submit시 갱신됨
            return next;
        });
    };

    /** 파라미터 입력 필드 변경 처리 */
    const handleParamChange = (index: number, field: keyof ToolParam, value: string | boolean) => {
        const newParams = [...formData.params];
        newParams[index] = { ...newParams[index], [field]: value };
        setFormData({ ...formData, params: newParams });

        // 입력 시 해당 필드 에러 제거
        if (field === 'param_name') {
            setFieldErrors(prev => ({ ...prev, [`param_name_${index}`]: '' }));
        } else if (field === 'description') {
            setFieldErrors(prev => ({ ...prev, [`param_desc_${index}`]: '' }));
        }
    };

    // 일반 입력 필드 변경 핸들러
    const handleChange = (field: keyof CustomToolFormData, value: string | 'Y' | 'N' | ToolParam[]) => {
        setFormData({ ...formData, [field]: value });
        setFieldErrors(prev => ({ ...prev, [field]: '' })); // 입력 시 에러 제거
    };

    /** 폼 제출 (저장/수정) */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setGlobalError('');

        // ---------------------------------------------------------------------
        // Validation Check (필수값 검증) - 인라인 에러용
        // ---------------------------------------------------------------------
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) newErrors.name = "도구 이름(영문)을 입력해주세요.";
        if (!formData.description_user.trim()) newErrors.description_user = "사용자용 설명을 입력해주세요.";
        if (!formData.description_agent.trim()) newErrors.description_agent = "Agent용 설명을 입력해주세요.";
        if (!formData.definition.trim()) {
            newErrors.definition = formData.tool_type === 'SQL'
                ? "SQL 쿼리를 입력해주세요."
                : "Python 표현식을 입력해주세요.";
        }

        // 파라미터 유효성 검사
        formData.params.forEach((p, idx) => {
            if (!p.param_name.trim()) {
                newErrors[`param_name_${idx}`] = "이름을 입력해주세요.";
            }
            if (!p.description.trim()) {
                newErrors[`param_desc_${idx}`] = "설명을 입력해주세요.";
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setProcessing(false);
            return;
        }
        // ---------------------------------------------------------------------

        try {
            const url = editingTool
                ? `/api/mcp/custom-tools/${editingTool.id}`
                : '/api/mcp/custom-tools';

            const method = editingTool ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.detail || 'Failed to save tool');
            }

            setIsModalOpen(false);
            fetchTools(); // 목록 새로고침
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Failed to save tool');
        } finally {
            setProcessing(false);
        }
    };

    /** 도구 삭제 */
    const handleDelete = async (id: number) => {
        if (!confirm("정말 이 도구를 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`/api/mcp/custom-tools/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to delete tool');
            fetchTools();
        } catch (e) {
            alert("삭제 실패: " + e);
        }
    };

    /** 테스트 실행 (Run Test) */
    const handleTestRun = async () => {
        setIsTestRunning(true);
        setTestResult('');
        try {
            const res = await fetch('/api/mcp/custom-tools/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    tool_type: formData.tool_type,
                    definition: formData.definition,
                    params: testParams
                })
            });

            const data = await res.json();
            if (data.success) {
                setTestResult(data.result);
            } else {
                setTestResult("Error: " + data.error);
            }
        } catch (e) {
            setTestResult("Execution Failed: " + String(e));
        } finally {
            setIsTestRunning(false);
        }
    };

    // -------------------------------------------------------------------------
    // 4. UI 렌더링
    // -------------------------------------------------------------------------
    return (
        <div className="space-y-6 h-full flex flex-col font-pretendard">
            {/* Header 섹션 */}
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Database className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            사용자 정의 도구 (Custom Tools)
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">SQL 쿼리나 스크립트 기반의 도구를 동적으로 생성하고 관리합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-md"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    새 도구 만들기
                </button>
            </header>

            {/* 글로벌 에러 메시지 (API 에러 등) */}
            {globalError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center animate-pulse border border-red-100 dark:border-red-900/30 transition-colors">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {globalError}
                </div>
            )}

            {/* 도구 목록 테이블 (Tool List) */}
            <div className="bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 flex-1 flex flex-col transition-colors duration-300">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">이름 / 타입</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">설명 (Agent용)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800 transition-colors">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-500">로딩 중...</td></tr>
                            ) : tools.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-500">등록된 도구가 없습니다.</td></tr>
                            ) : (
                                displayedTools.map(tool => (
                                    <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {tool.tool_type === 'SQL'
                                                    ? <Database className="w-4 h-4 text-orange-500 dark:text-orange-400 mr-2" />
                                                    : <Code className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" />
                                                }
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{tool.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">{tool.tool_type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-slate-100 max-w-md truncate" title={tool.description_agent}>
                                                {tool.description_agent}
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-slate-500 max-w-md truncate">
                                                {tool.description_user}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tool.is_active === 'Y' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {tool.is_active === 'Y' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button onClick={() => fetchToolDetail(tool.id)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"><Edit2 className="w-4 h-4 inline" /></button>
                                            <button onClick={() => handleDelete(tool.id)} className="text-red-600 hover:text-red-900 transition-colors"><Trash2 className="w-4 h-4 inline" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 transition-colors">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(totalItems / pageSize)}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => {
                            setPageSize(s);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* 도구 생성/수정 모달 (Modal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in font-pretendard">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">
                                {editingTool ? '도구 수정' : '새 도구 생성'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* 기본 정보 (Basic Info) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">도구 이름 (영문)</label>
                                    <input
                                        type="text"
                                        className={`block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none sm:text-sm transition-all ${fieldErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                        value={formData.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        placeholder="get_user_info"
                                    />
                                    {fieldErrors.name && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">타입</label>
                                    <select
                                        className="block w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all"
                                        value={formData.tool_type}
                                        onChange={e => handleChange('tool_type', e.target.value)}
                                    >
                                        <option value="SQL">SQL Query</option>
                                        <option value="PYTHON">Python Expression</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">사용자용 설명</label>
                                    <input
                                        type="text"
                                        className={`block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none sm:text-sm transition-all ${fieldErrors.description_user ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                        value={formData.description_user}
                                        onChange={e => handleChange('description_user', e.target.value)}
                                        placeholder="사용자 정보를 조회합니다."
                                    />
                                    {fieldErrors.description_user && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.description_user}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Agent용 설명 (프롬프트)</label>
                                    <input
                                        type="text"
                                        className={`block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none sm:text-sm transition-all ${fieldErrors.description_agent ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                        value={formData.description_agent}
                                        onChange={e => handleChange('description_agent', e.target.value)}
                                        placeholder="Retrieve user information from DB."
                                    />
                                    {fieldErrors.description_agent && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.description_agent}</p>}
                                </div>
                            </div>

                            {/* 로직 정의 (Logic Definition) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    {formData.tool_type === 'SQL' ? 'SQL Query (Use :param_name for binding)' : 'Python Expression'}
                                </label>
                                <textarea
                                    className={`w-full h-32 font-mono text-sm border rounded-lg p-3 focus:outline-none bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-slate-100 transition-all ${fieldErrors.definition ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                    value={formData.definition}
                                    onChange={e => handleChange('definition', e.target.value)}
                                    placeholder={formData.tool_type === 'SQL'
                                        ? "SELECT * FROM h_user WHERE user_id = :user_id"
                                        : "a * b"
                                    }
                                />
                                {fieldErrors.definition && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.definition}</p>}
                            </div>

                            {/* 파라미터 정의 (Parameters) */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 font-bold">파라미터 정의</label>
                                    <button type="button" onClick={handleAddParam} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors">
                                        <Plus className="w-4 h-4 mr-1" />
                                        파라미터 추가
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.params.map((param, idx) => (
                                        <div key={idx} className="flex flex-col space-y-1 bg-gray-50/50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-100 dark:border-slate-800 transition-colors hover:border-gray-200 dark:hover:border-slate-700">
                                            <div className="flex space-x-2 items-start">
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Name"
                                                        className={`w-full border rounded-lg px-2 py-1.5 text-sm transition-all ${fieldErrors[`param_name_${idx}`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none'}`}
                                                        value={param.param_name}
                                                        onChange={e => handleParamChange(idx, 'param_name', e.target.value)}
                                                    />
                                                </div>
                                                <select
                                                    className="w-24 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={param.param_type}
                                                    onChange={e => handleParamChange(idx, 'param_type', e.target.value)}
                                                >
                                                    <option value="STRING">String</option>
                                                    <option value="NUMBER">Number</option>
                                                    <option value="BOOLEAN">Boolean</option>
                                                </select>
                                                <select
                                                    className="w-20 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                                    value={param.is_required}
                                                    onChange={e => handleParamChange(idx, 'is_required', e.target.value)}
                                                >
                                                    <option value="Y">필수</option>
                                                    <option value="N">선택</option>
                                                </select>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Description"
                                                        className={`w-full border rounded-lg px-2 py-1.5 text-sm transition-all ${fieldErrors[`param_desc_${idx}`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none'}`}
                                                        value={param.description}
                                                        onChange={e => handleParamChange(idx, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <button type="button" onClick={() => handleRemoveParam(idx)} className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {/* 파라미터 에러 메시지 표시 */}
                                            {(fieldErrors[`param_name_${idx}`] || fieldErrors[`param_desc_${idx}`]) && (
                                                <div className="flex space-x-2 text-xs text-red-600 px-1 font-medium">
                                                    <div className="flex-1">{fieldErrors[`param_name_${idx}`]}</div>
                                                    <div className="w-24"></div>
                                                    <div className="w-20"></div>
                                                    <div className="flex-1">{fieldErrors[`param_desc_${idx}`]}</div>
                                                    <div className="w-7"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {formData.params.length === 0 && (
                                        <p className="text-sm text-gray-400 dark:text-slate-600 italic text-center py-4 bg-gray-50/30 dark:bg-slate-800/20 rounded-lg border border-dashed border-gray-200 dark:border-slate-800">파라미터가 비어 있습니다.</p>
                                    )}
                                </div>
                            </div>

                            {/* 테스트 실행 (Test Runner) */}
                            <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30 shadow-inner">
                                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                    <Play className="w-4 h-4 mr-1.5" /> 테스트 실행
                                </h4>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    {/* 정의된 파라미터가 있을 때만 테스트 입력 필드 표시 */}
                                    {formData.params.map((p, idx) => (
                                        p.param_name ? (
                                            <div key={idx}>
                                                <label className="block text-xs font-semibold text-blue-700/70 dark:text-blue-400/70 mb-1">{p.param_name}</label>
                                                <input
                                                    type="text"
                                                    className="w-full text-sm border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    placeholder={p.param_type}
                                                    onChange={e => {
                                                        const valInput = e.target.value;
                                                        let val: string | number | boolean = valInput;
                                                        if (p.param_type === 'NUMBER') val = Number(valInput);
                                                        if (p.param_type === 'BOOLEAN') val = (valInput === 'true');
                                                        setTestParams(prev => ({ ...prev, [p.param_name]: val }));
                                                    }}
                                                />
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleTestRun}
                                        disabled={isTestRunning}
                                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                                    >
                                        {isTestRunning && <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />}
                                        {isTestRunning ? '실행 중...' : 'RUN'}
                                    </button>
                                </div>
                                {testResult && (
                                    <div className="mt-3 bg-gray-900 dark:bg-black text-green-400 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto shadow-inner border border-gray-800 dark:border-slate-800">
                                        {testResult}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={processing}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                            >
                                {processing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                {processing ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

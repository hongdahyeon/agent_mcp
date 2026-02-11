import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import { Pagination } from './common/Pagination';
import type { SystemConfig, ConfigFormData } from '../types/systemConfig';


export function SystemConfig() {
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<ConfigFormData>({
        name: '',
        configuration: '',
        description: ''
    });

    const [totalItems, setTotalItems] = useState(0);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Server-side pagination
    const displayedConfigs = Array.isArray(configs) ? configs : [];

    // Reset page when search term changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchConfigs = useCallback(async (pageNum = page, size = pageSize) => {
        // if (!token) return; // token prop is not actually used in this component based on the code viewed
        setLoading(true);
        try {
            const res = await fetch(`/api/system/config?page=${pageNum}&size=${size}`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch configs');
            const data = await res.json();
            setConfigs(data.items);
            setTotalItems(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchConfigs(page, pageSize);
    }, [fetchConfigs, page, pageSize]);

    const handleOpenAdd = () => {
        setFormData({ name: '', configuration: '', description: '' });
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (config: SystemConfig) => {
        let prettyConfig = config.configuration;
        try {
            // Try to format JSON for better readability
            const jsonObj = JSON.parse(config.configuration);
            prettyConfig = JSON.stringify(jsonObj, null, 4);
        } catch {
            // keep original if not json
        }

        setFormData({
            name: config.name,
            configuration: prettyConfig,
            description: config.description
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (name: string) => {
        if (!window.confirm(`'${name}'를 삭제하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/system/config/${name}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (!res.ok) throw new Error('Failed to delete config');
            
            setConfigs(prev => prev.filter(c => c.name !== name));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Simple Validation
        if (!formData.name.trim() || !formData.configuration.trim() || !formData.description.trim()) {
            alert("입력값을 확인해주세요.");
            return;
        }

        // JSON Validation
        try {
            JSON.parse(formData.configuration);
        } catch {
            alert("Configuration must be a valid JSON string.");
            return;
        }

        try {
            const res = await fetch('/api/system/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to save config');
            }

            await fetchConfigs();
            setIsModalOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Save failed');
        }
    };

    const filteredConfigs = configs.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );



    // Reset page when search term changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
    if (error) return <div className="p-8 text-center text-red-500">에러: {error}</div>;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Settings className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            시스템 설정
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">시스템 설정 관리</p>
                    </div>
                </div>

            </header>

            {/* Search Bar & Action */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">검색 및 관리</h2>
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="이름 또는 설명으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0 font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        추가
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설정 (JSON)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 수정일</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredConfigs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No configurations found.
                                    </td>
                                </tr>
                            ) : (
                                displayedConfigs.map((config) => (
                                    <tr key={config.name} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {config.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={config.configuration}>
                                            {config.name.includes('password') || config.name.includes('secret') 
                                                ? '••••••••' 
                                                : config.configuration}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {config.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {config.reg_dt}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleOpenEdit(config)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(config.name)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-white border-t border-gray-200">
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

            {/* Modal */}
            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in border border-gray-100">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {isEditMode ? '설정 수정' : '새 설정 추가'}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col">
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        이름 (Key) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        readOnly={isEditMode}
                                        placeholder="e.g. mail.host"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${isEditMode ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'border-gray-200'}`}
                                    />
                                    {isEditMode && <p className="text-xs text-gray-400 mt-1">이름은 생성 후 변경할 수 없습니다.</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        설정 (JSON) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.configuration}
                                        onChange={(e) => setFormData({...formData, configuration: e.target.value})}
                                        placeholder='{"key": "value"}'
                                        rows={5}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm bg-gray-50/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        설명 <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="설정에 대한 간단한 설명"
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

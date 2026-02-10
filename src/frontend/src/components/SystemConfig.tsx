import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import type { Props, SystemConfig, ConfigFormData } from '../types/systemConfig';


export function SystemConfig({ token }: Props) {
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

    const fetchConfigs = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/system/config', {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch configs');
            const data = await res.json();
            setConfigs(data.configs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

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
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    추가
                </button>
            </header>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="이름 또는 설명으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
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
                                filteredConfigs.map((config) => (
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEditMode ? '설정 수정' : '새 설정 추가'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-mono text-sm"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
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

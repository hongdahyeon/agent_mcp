import { useState, useEffect, useCallback } from 'react';
import { Tag, Folder, Edit2, Trash2, X, Check, Search, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface MetaItem {
    id: number | string;
    name: string;
    count: number;
}

interface ApiItem {
    id: number;
    name_ko: string;
    tool_id: string;
}

export const OpenApiMetaManager = () => {
    const [categories, setCategories] = useState<MetaItem[]>([]);
    const [tags, setTags] = useState<MetaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'category' | 'tag'>('category');

    // Editing state
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [editName, setEditName] = useState('');

    // Relation view state
    const [selectedMeta, setSelectedMeta] = useState<{ type: 'category' | 'tag', id: number | string, name: string } | null>(null);
    const [relatedApis, setRelatedApis] = useState<ApiItem[]>([]);
    const [apisLoading, setApisLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/openapi/stats', { headers: getAuthHeaders() });
            const data = await res.json();
            setCategories(data.categories || []);
            setTags(data.tags || []);
        } catch (err) {
            console.error('Failed to fetch meta stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleUpdate = async (id: number | string, type: 'category' | 'tag') => {
        if (!editName.trim()) return;
        try {
            const endpoint = type === 'category' ? `/api/openapi/categories/${id}` : `/api/openapi/tags/${id}`;
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ name: editName })
            });
            if (res.ok) {
                setEditingId(null);
                fetchStats();
            } else {
                const err = await res.json();
                alert(err.detail || '수정 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number | string, type: 'category' | 'tag', count: number) => {
        if (count > 0) {
            alert('연관된 OpenAPI가 있는 항목은 삭제할 수 없습니다.');
            return;
        }
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const endpoint = type === 'category' ? `/api/openapi/categories/${id}` : `/api/openapi/tags/${id}`;
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                fetchStats();
                if (selectedMeta?.id === id && selectedMeta?.type === type) {
                    setSelectedMeta(null);
                }
            } else {
                const err = await res.json();
                alert(err.detail || '삭제 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRelatedApis = async (type: 'category' | 'tag', id: number | string, name: string) => {
        try {
            setApisLoading(true);
            setSelectedMeta({ type, id, name });
            const res = await fetch(`/api/openapi/by-meta/${type}/${id}`, { headers: getAuthHeaders() });
            const data = await res.json();
            setRelatedApis(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setApisLoading(false);
        }
    };

    if (loading && categories.length === 0) {
        return <div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>;
    }

    const items = activeTab === 'category' ? categories : tags;

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)] font-pretendard">
            {/* Left: Metadata List */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <header className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
                        <button
                            onClick={() => { setActiveTab('category'); setEditingId(null); }}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'category' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                        >
                            <Folder className="w-4 h-4" /> 분류 관리
                        </button>
                        <button
                            onClick={() => { setActiveTab('tag'); setEditingId(null); }}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'tag' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                        >
                            <Tag className="w-4 h-4" /> 태그 관리
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${selectedMeta?.id === item.id && selectedMeta?.type === activeTab ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-gray-50/30 dark:bg-slate-800/30 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'}`}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {editingId === item.id ? (
                                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                                        <input
                                            autoFocus
                                            className="w-full px-2 py-1 text-sm border border-indigo-300 dark:border-indigo-700 rounded-md bg-white dark:bg-slate-800 outline-none"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdate(item.id, activeTab);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                        />
                                        <button onClick={() => handleUpdate(item.id, activeTab)} className="text-green-500"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                        onClick={() => fetchRelatedApis(activeTab, item.id, item.name)}
                                    >
                                        <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{item.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${item.count > 0 ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}>
                                            {item.count}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                                    title="이름 수정"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id, activeTab, item.count)}
                                    className={`p-1.5 rounded-lg transition-all ${item.count > 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800'}`}
                                    disabled={item.count > 0}
                                    title={item.count > 0 ? "연관 API가 있어 삭제 불가" : "삭제"}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Related APIs */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <header className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-bold text-gray-600 dark:text-slate-400 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        {selectedMeta ? (
                            <><span className="text-indigo-600 dark:text-indigo-400">"{selectedMeta.name}"</span> 연관 OpenAPI 목록</>
                        ) : (
                            '항목을 선택하여 연관 API 확인'
                        )}
                    </h3>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedMeta ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                            <Info className="w-12 h-12 opacity-20" />
                            <p className="text-sm italic">왼쪽 목록에서 분류나 태그를 선택해 주세요.</p>
                        </div>
                    ) : apisLoading ? (
                        <div className="p-8 text-center text-gray-500">목록을 불러오는 중...</div>
                    ) : relatedApis.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                            <AlertCircle className="w-12 h-12 opacity-20" />
                            <p className="text-sm italic">연관된 OpenAPI가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {relatedApis.map(api => (
                                <div key={api.id} className="flex flex-col p-3 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{api.name_ko}</span>
                                    <span className="text-[11px] text-gray-400 font-mono mt-1">{api.tool_id}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

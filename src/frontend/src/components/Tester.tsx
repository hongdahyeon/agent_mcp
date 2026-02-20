
import { useState, useEffect } from 'react';
import type { Tool } from '../types';
import { Play, RotateCcw, RefreshCw, Copy, Check } from 'lucide-react';

/* 
* 도구 사용하기 화면에 대한 컴포넌트
* 서버에서 제공하는 도구 목록(`tools/list`)을 동적으로 불러온다.
* 선택한 도구의 스키마(`inputSchema`)에 맞춰 입력폼을 자동 생성한다.
* 실행 결과를 JSON 형태로 보여준다.
*/

interface Props {
    tools: Tool[];
    sendRpc: (method: string, params?: Record<string, unknown>, id?: number | string) => Promise<void>;
    lastResult: unknown;
    refreshTools?: () => void;
}

export function Tester({ tools, sendRpc, lastResult, refreshTools }: Props) {
    const [selectedTool, setSelectedTool] = useState<string>('');
    const [formValues, setFormValues] = useState<Record<string, unknown>>({});

    // Result handling (Local state for display control)
    const [displayResult, setDisplayResult] = useState<unknown>(lastResult || null);
    const [copied, setCopied] = useState(false);

    const currentTool = tools.find(t => t.name === selectedTool);

    // Reset form when tool changes
    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTool(e.target.value);
        setFormValues({});
        setDisplayResult(null); // Reset result display
        setCopied(false);
    };

    // Update display result when new result arrives from prop
    useEffect(() => {
        if (lastResult) {
            setDisplayResult(lastResult);
            setCopied(false);
        }
    }, [lastResult]);

    const handleExecute = () => {
        if (!currentTool) return;

        // Convert types based on schema
        const args: Record<string, unknown> = {};
        const props = currentTool.inputSchema.properties;

        Object.keys(formValues).forEach(key => {
            const prop = props[key] as { type?: string };
            const type = prop?.type;
            const value = formValues[key];

            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                return; // Skip empty values
            }

            if (type === 'integer' || type === 'number') {
                const numericVal = Number(value);
                if (!isNaN(numericVal)) {
                    args[key] = numericVal;
                }
            } else if (type === 'boolean') {
                args[key] = value === 'true' || value === true;
            } else {
                args[key] = value;
            }
        });

        // Check required fields
        const requiredFields = currentTool.inputSchema.required || [];
        const missingFields = requiredFields.filter(f => args[f] === undefined);
        if (missingFields.length > 0) {
            alert(`필수 파라미터가 누락되었습니다: ${missingFields.join(', ')}`);
            return;
        }

        // Use tool name as ID for stats tracking in hook
        sendRpc('tools/call', { name: selectedTool, arguments: args }, selectedTool);
    };

    const getFormattedResult = () => {
        if (!displayResult) return '';
        // Deep clone to avoid mutating state directly
        const renderedResult = JSON.parse(JSON.stringify(displayResult)) as { content?: Array<{ type: string; text?: unknown }> };
        if (renderedResult.content && Array.isArray(renderedResult.content)) {
            renderedResult.content.forEach((item) => {
                if (item.type === 'text' && typeof item.text === 'string') {
                    try {
                        // Try to parse inner JSON
                        const parsed = JSON.parse(item.text) as unknown;
                        item.text = parsed;
                    } catch {
                        // Ignore if not valid JSON, keep as string
                    }
                }
            });
        }
        return JSON.stringify(renderedResult, null, 2);
    };

    const handleCopy = () => {
        const text = getFormattedResult();
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 font-pretendard">
                            도구 테스터
                        </h2>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Input Area */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors duration-300">
                        <div className="mb-6 flex-shrink-0">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-pretendard">테스트할 도구 선택</label>
                            <div className="flex items-center space-x-2">
                                <select
                                    value={selectedTool}
                                    onChange={handleToolChange}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 hover:border-blue-400"
                                >
                                    <option value="">선택하세요 (Select Tool)</option>
                                    {tools.length === 0 && <option disabled>도구 목록 로딩 중...</option>}
                                    {tools.map(t => {
                                        const isDynamic = t.description?.startsWith('[Dynamic]');
                                        const isSystem = t.description?.startsWith('[System]');
                                        const typeLabel = isDynamic ? '(Dynamic)' : isSystem ? '(System)' : '';
                                        return <option key={t.name} value={t.name}>{t.name} {typeLabel}</option>
                                    })}
                                </select>
                                {refreshTools && (
                                    <button
                                        onClick={refreshTools}
                                        className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-gray-200 dark:border-slate-700"
                                        title="도구 목록 새로고침"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 mb-6 overflow-y-auto custom-scrollbar">
                            {currentTool ? Object.keys(currentTool.inputSchema.properties).map(key => {
                                const prop = currentTool.inputSchema.properties[key];
                                return (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 font-pretendard">
                                            {key} {prop.description && <span className="text-gray-400 dark:text-slate-500 text-xs">({prop.description})</span>}
                                        </label>
                                        <input
                                            type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-pretendard"
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                                            value={(formValues[key] as string | number) || ''}
                                        />
                                    </div>
                                )
                            }) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 font-pretendard">
                                    <RotateCcw className="w-8 h-8 mb-2 opacity-50" />
                                    <p>도구를 선택하면 입력 필드가 표시됩니다.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0">
                            <button
                                onClick={handleExecute}
                                disabled={!selectedTool}
                                className="w-full bg-blue-600 dark:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group font-pretendard"
                            >
                                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                실행 (Execute)
                            </button>
                        </div>
                    </div>

                    {/* Result Area */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center font-pretendard">
                                실행 결과 (JSON)
                                {!!displayResult && <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Updated</span>}
                            </h3>

                            {!!displayResult && (
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-gray-200 dark:border-slate-700"
                                    title="결과 복사"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    <span className="font-pretendard">{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                            )}
                        </div>
                        <pre className="flex-1 bg-gray-900 dark:bg-[#020617] text-green-400 dark:text-emerald-400 rounded-lg p-4 font-mono text-sm overflow-auto whitespace-pre-wrap border border-gray-800 dark:border-slate-800 shadow-inner custom-scrollbar">
                            {displayResult ? (() => {
                                // Deep clone to avoid mutating state directly
                                const renderedResult = JSON.parse(JSON.stringify(displayResult));
                                if (renderedResult && typeof renderedResult === 'object' && 'content' in renderedResult && Array.isArray(renderedResult.content)) {
                                    (renderedResult.content as Array<{ type: string; text?: unknown }>).forEach((item) => {
                                        if (item.type === 'text' && typeof item.text === 'string') {
                                            try {
                                                const parsed = JSON.parse(item.text) as unknown;
                                                item.text = parsed;
                                            } catch {
                                                // Ignore
                                            }
                                        }
                                    });
                                }
                                return JSON.stringify(renderedResult, null, 2);
                            })() : <span className="text-gray-600 dark:text-slate-600 font-pretendard"> ... 실행 결과가 여기에 표시됩니다.</span>}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}

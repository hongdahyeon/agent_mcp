
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
    sendRpc: (method: string, params?: any, id?: number | string) => Promise<void>;
    lastResult: any;
    refreshTools?: () => void;
}

export function Tester({ tools, sendRpc, lastResult, refreshTools }: Props) {
    const [selectedTool, setSelectedTool] = useState<string>('');
    const [formValues, setFormValues] = useState<Record<string, any>>({});

    // Result handling (Local state for display control)
    const [displayResult, setDisplayResult] = useState<any>(lastResult || null);
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
        const args: Record<string, any> = {};
        const props = currentTool.inputSchema.properties;

        Object.keys(formValues).forEach(key => {
            const prop = props[key];
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
        const renderedResult = JSON.parse(JSON.stringify(displayResult));
        if (renderedResult.content && Array.isArray(renderedResult.content)) {
            renderedResult.content.forEach((item: any) => {
                if (item.type === 'text' && typeof item.text === 'string') {
                    try {
                        // Try to parse inner JSON
                        const parsed = JSON.parse(item.text);
                        item.text = parsed;
                    } catch (e) {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Input Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">테스트할 도구 선택</label>
                    <div className="flex items-center space-x-2">
                        <select
                            value={selectedTool}
                            onChange={handleToolChange}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white hover:border-blue-400"
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
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                                title="도구 목록 새로고침"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
                    {currentTool ? Object.keys(currentTool.inputSchema.properties).map(key => {
                        const prop = currentTool.inputSchema.properties[key];
                        return (
                            <div key={key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {key} {prop.description && <span className="text-gray-400 text-xs">({prop.description})</span>}
                                </label>
                                <input
                                    type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                                    value={formValues[key] || ''}
                                />
                            </div>
                        )
                    }) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <RotateCcw className="w-8 h-8 mb-2 opacity-50" />
                            <p>도구를 선택하면 입력 필드가 표시됩니다.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleExecute}
                    disabled={!selectedTool}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
                >
                    <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    실행 (Execute)
                </button>
            </div>

            {/* Result Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        실행 결과 (JSON)
                        {displayResult && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Updated</span>}
                    </h3>

                    {displayResult && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                            title="결과 복사"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                    )}
                </div>
                <pre className="flex-1 bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-auto whitespace-pre-wrap border border-gray-800 shadow-inner">
                    {displayResult ? (() => {
                        // Deep clone to avoid mutating state directly if we were modifying it (though here we just render)
                        // But we want to parse the 'text' fields if they are JSON strings
                        const renderedResult = JSON.parse(JSON.stringify(displayResult));
                        if (renderedResult.content && Array.isArray(renderedResult.content)) {
                            renderedResult.content.forEach((item: any) => {
                                if (item.type === 'text' && typeof item.text === 'string') {
                                    try {
                                        // Try to parse inner JSON
                                        const parsed = JSON.parse(item.text);
                                        item.text = parsed;
                                    } catch (e) {
                                        // Ignore if not valid JSON, keep as string
                                    }
                                }
                            });
                        }
                        return JSON.stringify(renderedResult, null, 2);
                    })() : <span className="text-gray-600"> ... 실행 결과가 여기에 표시됩니다.</span>}
                </pre>
            </div>
        </div>
    );
}

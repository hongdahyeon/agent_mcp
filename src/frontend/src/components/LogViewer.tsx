
import { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import type { LogFileResponse, LogContentResponse } from '../types';
import clsx from 'clsx';

/* 
* 로그 이력 보기 화면에 대한 컴포넌트
* 서버에 저장된 일별 로그 파일(`logs/YYYY-MM-DD.txt`) 목록을 조회하고 내용을 보여준다.
*/

export function LogViewer() {
    const [files, setFiles] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/logs');
            const data: LogFileResponse = await res.json();
            setFiles(data.files || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchContent = async (filename: string) => {
        setCurrentFile(filename);
        setContent('Loading...');
        try {
            const res = await fetch(`/logs/${filename}`);
            const data: LogContentResponse = await res.json();
            setContent(data.content || '');
        } catch {
            setContent('Error loading file.');
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 font-pretendard">
                            서버 로그 뷰어
                        </h2>
                    </div>
                </div>
                <button
                    onClick={fetchFiles}
                    className="flex items-center text-sm bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 font-pretendard">
                    <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
                    목록 새로고침
                </button>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* File List */}
                <div className="col-span-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 font-semibold text-sm text-gray-600 dark:text-slate-300 font-pretendard">
                        로그 파일 목록 ({files.length})
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {files.map(file => (
                            <li
                                key={file}
                                onClick={() => fetchContent(file)}
                                className={clsx(
                                    "px-3 py-2 cursor-pointer rounded-lg text-sm transition-all duration-200 font-pretendard",
                                    currentFile === file
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium shadow-sm"
                                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                                )}
                            >
                                {file}
                            </li>
                        ))}
                        {files.length === 0 && <li className="text-gray-400 dark:text-slate-500 text-center py-6 text-sm font-pretendard">파일이 없습니다.</li>}
                    </ul>
                </div>

                {/* Content */}
                <div className="col-span-9 bg-[#1E1E1E] dark:bg-[#020617] rounded-xl shadow-lg border border-gray-700 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
                    <div className="p-3 bg-[#2D2D2D] dark:bg-[#0f172a] border-b border-gray-700 dark:border-slate-800 text-gray-300 dark:text-slate-400 text-sm font-mono flex justify-between items-center">
                        <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-2 opacity-50" />
                            {currentFile || '파일을 선택하세요'}
                        </span>
                        {currentFile && (
                            <span className="text-xs text-gray-500 dark:text-slate-500">{content.length} bytes</span>
                        )}
                    </div>
                    <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-[#4CAF50] dark:text-emerald-400 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}

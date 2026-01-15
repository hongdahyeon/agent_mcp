
import { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import type { LogFileResponse, LogContentResponse } from '../types';
import clsx from 'clsx';

/* 
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
        } catch (e) {
            setContent('Error loading file.');
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
             <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-blue-600" />
                    서버 로그 뷰어
                </h2>
                <button 
                    onClick={fetchFiles}
                    className="flex items-center text-sm bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-700"
                >
                    <RefreshCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
                    목록 새로고침
                </button>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* File List */}
                <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-600">
                        로그 파일 목록 ({files.length})
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 space-y-1">
                        {files.map(file => (
                            <li 
                                key={file}
                                onClick={() => fetchContent(file)}
                                className={clsx(
                                    "px-3 py-2 cursor-pointer rounded-lg text-sm transition-all duration-200",
                                    currentFile === file 
                                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm" 
                                        : "text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {file}
                            </li>
                        ))}
                        {files.length === 0 && <li className="text-gray-400 text-center py-6 text-sm">파일이 없습니다.</li>}
                    </ul>
                </div>

                {/* Content */}
                <div className="col-span-9 bg-[#1E1E1E] rounded-xl shadow-lg border border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-3 bg-[#2D2D2D] border-b border-gray-700 text-gray-300 text-sm font-mono flex justify-between items-center">
                        <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-2 opacity-50" />
                            {currentFile || '파일을 선택하세요'}
                        </span>
                        {currentFile && (
                            <span className="text-xs text-gray-500">{content.length} bytes</span>
                        )}
                    </div>
                    <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-[#4CAF50] leading-relaxed custom-scrollbar whitespace-pre-wrap">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}

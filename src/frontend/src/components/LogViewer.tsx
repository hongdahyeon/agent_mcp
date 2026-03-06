
import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Archive, CheckSquare, Square, FileArchive, ArrowUpCircle, Download } from 'lucide-react';
import type { LogFileResponse, LogContentResponse, LogFileInfo } from '../types';
import clsx from 'clsx';
import { getAuthHeaders } from '../utils/auth';

/* 
* 로그 이력 보기 화면에 대한 컴포넌트
* 서버에 저장된 일별 로그 파일(`logs/YYYY-MM-DD.txt`) 및 압축된 로그(`*.zip`) 목록을 조회하고 내용을 보여준다.
*/

export function LogViewer() {
    const [files, setFiles] = useState<LogFileInfo[]>([]);
    const [currentFile, setCurrentFile] = useState<LogFileInfo | null>(null);
    const [content, setContent] = useState<string>('');
    const [zipFiles, setZipFiles] = useState<string[]>([]); // Zip 내부 파일 목록
    const [loading, setLoading] = useState(false);

    // 다중 선택 상태
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [archiveName, setArchiveName] = useState('');
    const [archiving, setArchiving] = useState(false);
    const [unzipping, setUnzipping] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/logs', { headers: getAuthHeaders() });
            const data: LogFileResponse = await res.json();
            setFiles(data.files || []);
            setSelectedFiles([]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchContent = async (file: LogFileInfo) => {
        setCurrentFile(file);
        setContent('Loading...');
        setZipFiles([]);

        if (file.type === 'zip') {
            try {
                const res = await fetch(`/api/system/logs/zip-content/${file.name}`, { headers: getAuthHeaders() });
                const data = await res.json();
                setZipFiles(data.files || []);
                setContent(`[Zip Archive Contents]\n\n${(data.files || []).join('\n')}`);
            } catch {
                setContent('Error loading zip content.');
            }
        } else {
            try {
                const res = await fetch(`/logs/${file.name}`, { headers: getAuthHeaders() });
                const data: LogContentResponse = await res.json();
                setContent(data.content || '');
            } catch {
                setContent('Error loading file.');
            }
        }
    };

    const handleToggleSelect = (e: React.MouseEvent, file: LogFileInfo) => {
        e.stopPropagation();
        if (file.is_today || file.type === 'zip') return; // 오늘 로그나 이미 압축된 파일은 선택 불가

        setSelectedFiles(prev =>
            prev.includes(file.name)
                ? prev.filter(f => f !== file.name)
                : [...prev, file.name]
        );
    };

    const handleArchive = async () => {
        if (selectedFiles.length === 0) return;
        if (!archiveName.trim()) {
            alert('압축 파일명을 입력해주세요.');
            return;
        }

        setArchiving(true);
        try {
            const res = await fetch('/api/system/logs/archive', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filenames: selectedFiles,
                    archive_name: archiveName
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`압축 및 원본 삭제 완료: ${data.archive_name}`);
                setArchiveName('');
                setSelectedFiles([]);
                fetchFiles();
            } else {
                alert(`압축 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (e) {
            console.error(e);
            alert('압축 요청 중 오류가 발생했습니다.');
        } finally {
            setArchiving(false);
        }
    };

    const handleUnzip = async (filename: string) => {
        if (!confirm(`${filename} 파일의 압축을 해제하시겠습니까?`)) return;

        setUnzipping(true);
        try {
            const res = await fetch('/api/system/logs/unzip', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                alert('압축 해제 완료');
                if (currentFile?.name === filename) {
                    setCurrentFile(null);
                    setContent('');
                }
                fetchFiles();
            } else {
                alert(`해제 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (e) {
            console.error(e);
            alert('압축 해제 중 오류가 발생했습니다.');
        } finally {
            setUnzipping(false);
        }
    };

    const handleDownload = (filename: string) => {
        const url = `/logs/${filename}`; // Backend should support serving zip files same as txt
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                            서버 로그 보관소
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
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                        <span className="font-semibold text-sm text-gray-600 dark:text-slate-300 font-pretendard">
                            로그 파일 목록 ({files.length})
                        </span>
                    </div>

                    {/* Archiving Controls */}
                    {selectedFiles.length > 0 && (
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 space-y-2 animate-in slide-in-from-top-2">
                            <input
                                type="text"
                                placeholder="압축 파일명"
                                value={archiveName}
                                onChange={(e) => setArchiveName(e.target.value)}
                                className="w-full text-xs p-2 rounded border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleArchive}
                                disabled={archiving}
                                className="w-full flex items-center justify-center text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
                            >
                                <Archive className={clsx("w-3.5 h-3.5 mr-1.5", archiving && "animate-pulse")} />
                                {selectedFiles.length}개 파일 압축 및 삭제
                            </button>
                        </div>
                    )}

                    <ul className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {files.map(file => (
                            <li
                                key={file.name}
                                onClick={() => fetchContent(file)}
                                className={clsx(
                                    "group px-3 py-2 cursor-pointer rounded-lg text-sm transition-all duration-200 font-pretendard flex items-center justify-between",
                                    currentFile?.name === file.name
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium shadow-sm"
                                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                                )}
                            >
                                <div className="flex items-center truncate mr-2">
                                    <div
                                        onClick={(e) => handleToggleSelect(e, file)}
                                        className={clsx(
                                            "mr-2 transition-colors",
                                            (file.is_today || file.type === 'zip') ? "opacity-20 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                    >
                                        {selectedFiles.includes(file.name) ? (
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Square className={clsx("w-4 h-4", (!file.is_today && file.type === 'text') && "group-hover:text-blue-400 text-gray-300 dark:text-slate-600")} />
                                        )}
                                    </div>
                                    <div className="flex items-center truncate">
                                        {file.type === 'zip' ? (
                                            <FileArchive className="w-4 h-4 mr-2 text-amber-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 mr-2 text-gray-400 group-hover:text-blue-400" />
                                        )}
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                </div>
                                {file.is_today && (
                                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded shrink-0">TODAY</span>
                                )}
                                {file.type === 'zip' && (
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded shrink-0 uppercase font-bold tracking-tighter">Zip</span>
                                )}
                            </li>
                        ))}
                        {files.length === 0 && <li className="text-gray-400 dark:text-slate-500 text-center py-6 text-sm font-pretendard">파일이 없습니다.</li>}
                    </ul>
                </div>

                {/* Content Area */}
                <div className="col-span-9 bg-[#1E1E1E] dark:bg-[#020617] rounded-xl shadow-lg border border-gray-700 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
                    <div className="p-3 bg-[#2D2D2D] dark:bg-[#0f172a] border-b border-gray-700 dark:border-slate-800 text-gray-300 dark:text-slate-400 text-sm font-mono flex justify-between items-center">
                        <span className="flex items-center">
                            {currentFile?.type === 'zip' ? <FileArchive className="w-4 h-4 mr-2 opacity-50" /> : <FileText className="w-4 h-4 mr-2 opacity-50" />}
                            {currentFile?.name || '파일을 선택하세요'}
                        </span>

                        <div className="flex items-center space-x-3">
                            {currentFile?.type === 'zip' && (
                                <>
                                    <button
                                        onClick={() => handleDownload(currentFile.name)}
                                        className="flex items-center px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                                    >
                                        <Download className="w-3 h-3 mr-1" /> 받기
                                    </button>
                                    <button
                                        onClick={() => handleUnzip(currentFile.name)}
                                        disabled={unzipping}
                                        className="flex items-center px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs transition-colors disabled:opacity-50"
                                    >
                                        <ArrowUpCircle className={clsx("w-3 h-3 mr-1", unzipping && "animate-spin")} />
                                        압축 해제
                                    </button>
                                </>
                            )}
                            {currentFile && (
                                <span className="text-xs text-gray-500 dark:text-slate-500">{currentFile.size.toLocaleString()} bytes</span>
                            )}
                        </div>
                    </div>
                    {currentFile?.type === 'zip' ? (
                        <div className="flex-1 p-6 overflow-auto custom-scrollbar bg-slate-900/50">
                            <div className="max-w-xl mx-auto space-y-4">
                                <h3 className="text-blue-400 font-pretendard font-bold flex items-center">
                                    <FileArchive className="w-5 h-5 mr-2" />
                                    압축 해제 시 복구될 파일 목록:
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {zipFiles.map(zf => (
                                        <div key={zf} className="p-3 bg-white/5 border border-white/10 rounded-lg text-emerald-400 font-mono text-sm flex items-center">
                                            <FileText className="w-4 h-4 mr-3 opacity-30" />
                                            {zf}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-[#4CAF50] dark:text-emerald-400 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                            {content}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}

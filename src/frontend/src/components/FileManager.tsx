import { Download, File as FileIcon, Trash2, Upload, X, History, FolderOpen } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getAuthHeaders } from '../utils/auth';

interface UploadedFile {
    file_uid: number;
    file_id: string;
    org_file_nm: string;
    file_url: string;
    file_size: number;
    reg_dt: string;
    batch_id?: string;
}

interface FileLog {
    uid: number;
    file_uid: number;
    file_id: string;
    reg_uid: string;
    reg_dt: string;
}

interface FileBatch {
    batchId: string;
    files: UploadedFile[];
    uploadDate: string;
}

export const FileManager: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [groupedFiles, setGroupedFiles] = useState<FileBatch[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    // Log Modal State
    const [showLogModal, setShowLogModal] = useState(false);
    const [currentFileLogs, setCurrentFileLogs] = useState<FileLog[]>([]);
    const [currentFileName, setCurrentFileName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        fetchFileList();
    }, []);

    const fetchFileList = async () => {
        try {
            const res = await fetch('/api/files/list?limit=100', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                groupFiles(data.files);
            }
        } catch (e) {
            console.error("Failed to fetch file list:", e);
        }
    };

    const groupFiles = (files: UploadedFile[]) => {
        const groups: { [key: string]: UploadedFile[] } = {};
        
        files.forEach(file => {
            // batch_id가 없으면 개별 그룹으로 처리 (또는 'Others'로 묶음)
            const key = file.batch_id || `single_${file.file_uid}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(file);
        });

        // Convert to array and sort by date (assuming batch files have same/similar reg_dt)
        const batchList: FileBatch[] = Object.keys(groups).map(key => {
            const batchFiles = groups[key];
            // Use the first file's date as batch date
            const firstFile = batchFiles[0];
            return {
                batchId: key,
                files: batchFiles,
                uploadDate: firstFile.reg_dt
            };
        }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

        setGroupedFiles(batchList);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch('/api/files/upload', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders()
                },
                body: formData
            });

            if (res.ok) {
                // Upload success -> Refresh list
                await fetchFileList();
                setSelectedFiles([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                alert('파일 업로드 완료!');
            } else {
                alert('파일 업로드 실패');
            }
        } catch (e) {
            console.error(e);
            alert('업로드 중 오류 발생');
        } finally {
            setIsUploading(false);
        }
    };

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

    const handleShowLogs = async (fileUid: number, fileName: string) => {
        setCurrentFileName(fileName);
        try {
            const res = await fetch(`/api/files/${fileUid}/logs`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentFileLogs(data.logs);
                setShowLogModal(true);
            } else {
                alert('로그 조회 실패');
            }
        } catch (e) {
            console.error(e);
            alert('로그 조회 중 오류 발생');
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 relative">
            <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">파일 관리 (테스트)</h2>
                        <p className="text-sm text-gray-500 mt-1">파일 업로드 및 다운로드 기능을 테스트합니다.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-gray-600" /> 파일 업로드
                    </h3>
                    
                    <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer mb-4 flex-1"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-12 h-12 mb-3 text-gray-400" />
                        <p className="font-medium">클릭하여 파일 선택 (다중 선택 가능)</p>
                        <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                                    <span className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                    <button onClick={() => removeSelectedFile(idx)} className="text-red-500 hover:text-red-700">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={handleUpload} 
                        disabled={selectedFiles.length === 0 || isUploading}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                            selectedFiles.length === 0 || isUploading 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                        }`}
                    >
                        {isUploading ? '업로드 중...' : `${selectedFiles.length}개 파일 업로드`}
                    </button>
                </div>

                {/* File List Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileIcon className="w-5 h-5 text-gray-600" /> 업로드 된 파일 목록
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 px-1">
                        {groupedFiles.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                업로드 된 파일이 없습니다.
                            </div>
                        ) : (
                            groupedFiles.map((batch) => (
                                <div key={batch.batchId} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <FolderOpen className="w-4 h-4" />
                                            <span className="text-xs font-medium">
                                                업로드 일시: {new Date(batch.uploadDate).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                            {batch.files.length}개 파일
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {batch.files.map((file) => (
                                            <div key={file.file_uid} className="flex items-center justify-between p-3 hover:bg-white transition-colors group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-blue-500 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                                        <FileIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{file.org_file_nm}</p>
                                                        <p className="text-xs text-gray-500 truncate">{file.file_id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleShowLogs(file.file_uid, file.org_file_nm)}
                                                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="로그 보기"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownload(file.file_id, file.org_file_nm)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="다운로드"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Log Modal */}
            {showLogModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
                    <div className="bg-white w-full max-w-lg m-4 rounded-xl shadow-2xl flex flex-col max-h-[80%]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                파일 이력: {currentFileName}
                            </h3>
                            <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {currentFileLogs.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">이력이 없습니다.</p>
                            ) : (
                                <div className="space-y-3">
                                    {currentFileLogs.map((log) => (
                                        <div key={log.uid} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg text-sm">
                                            <div>
                                                <p className="font-medium text-gray-900">{log.reg_uid}</p>
                                                <p className="text-xs text-gray-500">ID: {log.file_id}</p>
                                            </div>
                                            <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                                                {new Date(log.reg_dt).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                            <button 
                                onClick={() => setShowLogModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Database, RotateCcw, Trash2, Plus, FileText, AlertTriangle, RefreshCw, History, Shield, CheckCircle2 } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface BackupFile {
    filename: string;
    size: number;
    created_at: string;
}

const DbBackupManager: React.FC = () => {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 백업 파일 목록 조회
    const fetchBackups = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/db/backups', {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setBackups(data);
            } else {
                const err = await response.json();
                setError(err.detail || '백업 목록을 불러오지 못했습니다.');
            }
        } catch (err) {
            console.error('fetchBackups error:', err);
            setError('서버 연결 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    // 백업 파일 생성
    const handleCreateBackup = async () => {
        setActionLoading('create');
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await fetch('/api/admin/db/backup', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (response.ok) {
                setSuccessMessage('새로운 백업이 생성되었습니다.');
                fetchBackups();
            } else {
                const err = await response.json();
                setError(err.detail || '백업 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('handleCreateBackup error:', err);
            setError('서버 연결 오류가 발생했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 복구 진행하기
    const handleRestore = async (filename: string) => {
        if (!confirm(`${filename} 파일로 DB를 복구하시겠습니까?\n현재 데이터가 선택한 시점의 데이터로 완전히 교체되며, 작업 전 현재 상태가 자동 백업됩니다.`)) return;

        setActionLoading(filename);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await fetch(`/api/admin/db/restore/${filename}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (response.ok) {
                setSuccessMessage('DB 복구가 완료되었습니다. 페이지를 새로고침합니다.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                const err = await response.json();
                setError(err.detail || '복구에 실패했습니다.');
            }
        } catch (err) {
            console.error('handleRestore error:', err);
            setError('서버 연결 오류가 발생했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 백업 파일 삭제
    const handleDelete = async (filename: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        setActionLoading(`delete-${filename}`);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await fetch(`/api/admin/db/backups/${filename}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (response.ok) {
                setSuccessMessage('백업 파일이 삭제되었습니다.');
                fetchBackups();
            } else {
                const err = await response.json();
                setError(err.detail || '삭제에 실패했습니다.');
            }
        } catch (err) {
            console.error('handleDelete error:', err);
            setError('서버 연결 오류가 발생했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    // 파일 크기 변환
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 날짜 변환
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ko-KR');
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 font-pretendard">
            <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                            DB 백업 및 복구
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">서버 데이터 스냅샷을 생성하고 특정 시점으로 복원합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {actionLoading === 'create' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    지금 백업 생성
                </button>
            </header>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30 transition-colors">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                    <CheckCircle2 className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0 z-10 transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">백업 파일명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">용량</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">생성 일시</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center">
                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">목록을 불러오는 중...</p>
                                    </td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p>백업 내역이 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <History className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-slate-200">{backup.filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                            {formatSize(backup.size)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                            {formatDate(backup.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleRestore(backup.filename)}
                                                    disabled={actionLoading !== null}
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="이 시점으로 복구"
                                                >
                                                    {actionLoading === backup.filename ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(backup.filename)}
                                                    disabled={actionLoading !== null}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="삭제"
                                                >
                                                    {actionLoading === `delete-${backup.filename}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-xl flex gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm">
                    <p className="text-amber-800 dark:text-amber-400 font-bold mb-1">복구 시 주의사항</p>
                    <ul className="text-amber-700 dark:text-amber-500/80 space-y-1 list-disc list-inside">
                        <li>복구 시 현재 운영 중인 데이터가 선택한 시점의 데이터로 완전히 교체되었습니다.</li>
                        <li>작업 전 자동으로 현재 운영 중인 파일(`agent_mcp.db`)을 `safety`라는 명칭을 포함하여 자동 백업합니다.</li>
                        <li>하지만 만약을 위해 작업 전 수동으로 백업을 생성하는 것을 권장합니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DbBackupManager;

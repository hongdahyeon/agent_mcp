
import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  Activity,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { getAuthHeaders } from '../../utils/auth';
import type { SchedulerJob, SystemHealth } from '../../types/system';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SchedulerManager() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, healthRes] = await Promise.all([
        fetch('/api/system/scheduler/jobs', { headers: getAuthHeaders() }),
        fetch('/api/system/health', { headers: getAuthHeaders() })
      ]);

      if (!jobsRes.ok || !healthRes.ok) throw new Error('Failed to fetch data');

      const jobsData = await jobsRes.json();
      const healthData = await healthRes.json();

      setJobs(jobsData.jobs);
      setHealth(healthData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const controlScheduler = async (action: 'start' | 'stop') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/system/scheduler/control?action=${action}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`Failed to ${action} scheduler`);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(t('systemTab.scheduler.controlFail'));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteJob = async (id: string) => {
    const message = t('systemTab.scheduler.deleteConfirm');
    if (!confirm(message)) return;
    try {
      const res = await fetch(`/api/system/scheduler/jobs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete job');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(t('systemTab.scheduler.deleteFail'));
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mr-2" />
        {t('systemTab.scheduler.loading')}
      </div>
    );
  }

  const isRunning = health?.scheduler === 'ON';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-pretendard">
      {/* Header */}
      <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('systemTab.scheduler.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('systemTab.scheduler.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <button
            onClick={() => fetchData()}
            className="p-2 text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            title={t('systemTab.scheduler.refresh')}
          >
            <RefreshCw className={clsx("w-5 h-5", actionLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={clsx(
              "p-3 rounded-full",
              isRunning ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
            )}>
              <Activity className={clsx(
                "w-6 h-6",
                isRunning ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('systemTab.scheduler.engineStatus')}</p>
              <h4 className={clsx(
                "text-lg font-bold",
                isRunning ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {isRunning ? t('systemTab.scheduler.statusRunning') : t('systemTab.scheduler.statusStopped')}
              </h4>
            </div>
          </div>
          <button
            onClick={() => controlScheduler(isRunning ? 'stop' : 'start')}
            disabled={actionLoading}
            className={clsx(
              "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
              isRunning 
                ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                : "bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400"
            )}
          >
            {isRunning ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? t('systemTab.scheduler.btnStop') : t('systemTab.scheduler.btnStart')}</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
           <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('systemTab.scheduler.scheduledJobs')}</p>
              <h4 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('systemTab.scheduler.jobsCount').replace('{count}', String(jobs.length))}</h4>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
           <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('systemTab.scheduler.resourceCheck')}</p>
              <div className="flex items-center space-x-2 mt-1">
                {health?.db === 'OK' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-xs dark:text-slate-300">DB</span>
                {health?.smtp === 'OK' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-xs dark:text-slate-300">SMTP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-gray-700 dark:text-slate-200">{t('systemTab.scheduler.tableTitle')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">{t('systemTab.scheduler.thJobId')}</th>
                <th className="px-6 py-3">{t('systemTab.scheduler.thJobName')}</th>
                <th className="px-6 py-3">{t('systemTab.scheduler.thNextRun')}</th>
                <th className="px-6 py-3">{t('systemTab.scheduler.thArgs')}</th>
                <th className="px-6 py-3 text-right">{t('systemTab.scheduler.thActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {jobs.length > 0 ? jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-blue-600 dark:text-blue-400">{job.id}</td>
                  <td className="px-6 py-4 dark:text-slate-200">{job.name}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center space-x-1 dark:text-slate-300">
                      <Clock className="w-3 h-3" />
                      <span>{job.next_run_time ? new Date(job.next_run_time).toLocaleString() : 'N/A'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-slate-400 truncate max-w-[200px]" title={job.args}>
                    {job.args}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title={t('systemTab.scheduler.tooltipCancel')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                    {t('systemTab.scheduler.noJobs')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import ReactECharts from 'echarts-for-react';
import type { UsageStats } from '../types';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Activity, RotateCw, User, BarChart } from 'lucide-react';
import { clsx } from 'clsx';
import { getAuthHeaders } from '../utils/auth';

/*
* 메인 대시보드에 대한 컴포넌트
* - 서버 상태, 도구 사용 통계(차트)를 보여준다.
* - 기존 로그 영역은 사용자별 요청 횟수 차트로 대체됨.
*/
interface Props {
  stats: UsageStats;
  theme: 'light' | 'dark';
  role: string;
  onRefresh?: () => Promise<void>;
}

export function Dashboard({ stats, theme, role, onRefresh }: Props) {
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 1. Heatmap Data Processing
  const days = useMemo(() => ['일', '월', '화', '수', '목', '금', '토'], []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => `${i}시`), []);

  // heatmapStats: { dow: string, hour: string, cnt: number }[]
  const heatmapData = useMemo(() => (stats.heatmapStats || []).map(item => [
    parseInt(item.hour),
    parseInt(item.dow),
    item.cnt
  ]), [stats.heatmapStats]);

  const heatmapOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { position: 'top' },
    grid: { height: '70%', top: '10%' },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: { show: true },
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b', interval: 1 }
    },
    yAxis: {
      type: 'category',
      data: days,
      splitArea: { show: true },
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    visualMap: {
      min: 0,
      max: Math.max(1, ...(heatmapData.map(d => d[2] as number) || [])),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      textStyle: { color: isDark ? '#94a3b8' : '#64748b' },
      inRange: {
        color: isDark ? ['#1e293b', '#3b82f6'] : ['#f1f5f9', '#3b82f6']
      }
    },
    series: [{
      name: '사용 횟수',
      type: 'heatmap',
      data: heatmapData,
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  }), [hours, days, heatmapData, isDark]);

  // 2. Tool Usage Chart Data
  const tools = useMemo(() => Object.keys(stats.tools), [stats.tools]);
  const pieData = useMemo(() => tools.map(t => ({ value: stats.tools[t].count, name: t })), [tools, stats.tools]);
  const successData = useMemo(() => tools.map(t => stats.tools[t].success), [tools, stats.tools]);
  const failureData = useMemo(() => tools.map(t => stats.tools[t].failure), [tools, stats.tools]);

  const pieOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', textStyle: { color: isDark ? '#94a3b8' : '#64748b' } },
    series: [{
      name: '도구 사용', type: 'pie', radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: isDark ? '#0f172a' : '#fff',
        borderWidth: 2
      },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      data: pieData.length ? pieData : [{ value: 0, name: 'No Data' }]
    }]
  }), [pieData, isDark]);

  const barOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['성공', '실패'],
      bottom: '0%',
      textStyle: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: tools,
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    series: [
      { name: '성공', type: 'bar', stack: 'total', itemStyle: { color: '#10b981' }, data: successData },
      { name: '실패', type: 'bar', stack: 'total', itemStyle: { color: '#ef4444' }, data: failureData }
    ]
  }), [tools, successData, failureData, isDark]);


  // 3. User Usage Chart Data & Interaction
  const userList = useMemo(() => Object.keys(stats.users || {}), [stats.users]);
  const userData = useMemo(() => userList.map(u => ({ value: stats.users![u], name: u })), [userList, stats.users]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userToolStats, setUserToolStats] = useState<{ tool_nm: string; cnt: number }[]>([]);
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  const fetchUserToolStats = useCallback(async (userId: string) => {
    setLoadingUserStats(true);
    try {
      const res = await fetch(`/api/mcp/user-tool-stats?user_id=${userId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setUserToolStats(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch user tool stats:', err);
    } finally {
      setLoadingUserStats(false);
    }
  }, []);

  const onUserChartClick = (params: any) => {
    if (role !== 'ROLE_ADMIN') return;
    if (params.name && params.name !== 'No Data') {
      setSelectedUser(params.name);
      fetchUserToolStats(params.name);
    }
  };

  const userOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', textStyle: { color: isDark ? '#94a3b8' : '#64748b' } },
    series: [
      {
        name: '사용자별 요청',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: isDark ? '#0f172a' : '#fff',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' }
        },
        data: userData.length > 0 ? userData : [{ value: 0, name: 'No Data' }]
      }
    ]
  }), [userData, isDark]);

  const userToolOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    yAxis: {
      type: 'category',
      data: userToolStats.map(s => s.tool_nm).reverse(),
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b' }
    },
    series: [{
      name: '사용 횟수',
      type: 'bar',
      data: userToolStats.map(s => s.cnt).reverse(),
      itemStyle: { color: '#3b82f6', borderRadius: [0, 5, 5, 0] }
    }]
  }), [userToolStats, isDark]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [health, setHealth] = useState<any>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/system/health', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  }, []);

  useEffect(() => {
    // health check 경우 ADMIN 권한만
    if (role === 'ROLE_ADMIN') {
      fetchHealth();
      const timer = setInterval(fetchHealth, 30000); // 30초마다 갱신
      return () => clearInterval(timer);
    }
  }, [fetchHealth, role]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      const tasks: Promise<any>[] = [onRefresh()];
      if (role === 'ROLE_ADMIN') tasks.push(fetchHealth());
      await Promise.all(tasks);
      if (selectedUser) fetchUserToolStats(selectedUser);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const HealthItem = ({ label, status }: { label: string, status: 'OK' | 'ERROR' | 'ON' | 'OFF' }) => {
    const isGood = status === 'OK' || status === 'ON';
    const isBad = status === 'ERROR';

    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
        <div className={clsx(
          "w-2 h-2 rounded-full",
          isGood ? "bg-green-500" : isBad ? "bg-red-500" : "bg-gray-400"
        )} />
        <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}:</span>
        <span className={clsx(
          "text-xs font-bold",
          isGood ? "text-green-600 dark:text-green-400" : isBad ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-slate-400"
        )}>
          {status}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-pretendard">
      {/* 상단 헤더 영역 */}
      <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">대시보드</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-tight">실시간 성능 및 사용량 모니터링</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {health && (
            <div className="hidden lg:flex items-center space-x-2 mr-4 border-r border-gray-100 dark:border-slate-800 pr-4">
              <HealthItem label="DB" status={health.db} />
              <HealthItem label="SMTP" status={health.smtp} />
              <HealthItem label="SCHEDULER" status={health.scheduler} />
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium text-sm">{isRefreshing ? '새로고침 중...' : '새로고침'}</span>
          </button>
        </div>
      </header>

      {/* Heatmap Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center">
            <BarChart className="w-5 h-5 mr-2 text-blue-500" /> 시간대별/요일별 사용 패턴
          </h3>
          <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">사용량 히트맵 (7x24)</span>
        </div>
        <div className="h-[300px]">
          {mounted && <ReactECharts key={`heatmap-${theme}`} theme={isDark ? 'dark' : undefined} option={heatmapOption} style={{ height: '100%' }} notMerge={true} lazyUpdate={true} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Row: Tools and General Results */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 font-pretendard">도구별 사용 횟수</h3>
            {mounted && <ReactECharts key={`pie-${theme}`} theme={isDark ? 'dark' : undefined} option={pieOption} style={{ height: '350px' }} notMerge={true} lazyUpdate={true} />}
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 font-pretendard">요청 처리 결과</h3>
            {mounted && <ReactECharts key={`bar-${theme}`} theme={isDark ? 'dark' : undefined} option={barOption} style={{ height: '300px' }} notMerge={true} lazyUpdate={true} />}
          </div>
        </div>

        {/* Right Row: Users and User-specific Detail */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 font-pretendard">사용자별 요청 횟수</h3>
              {role === 'ROLE_ADMIN' && <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">분석하려면 클릭</span>}
            </div>
            {userList.length > 0 ? (
              mounted && (
                <ReactECharts
                  key={`user-${theme}`}
                  theme={isDark ? 'dark' : undefined}
                  option={userOption}
                  onEvents={{ 'click': onUserChartClick }}
                  style={{ height: '350px' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-400 dark:text-slate-500 font-pretendard">데이터 없음</div>
            )}
          </div>

          {role === 'ROLE_ADMIN' && (
            <div className={clsx(
              "bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border transition-all duration-500",
              selectedUser ? "border-blue-200 dark:border-blue-900/50 shadow-md" : "border-gray-100 dark:border-slate-800 opacity-60"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center">
                  <User className="w-5 h-5 mr-2 text-indigo-500" />
                  {selectedUser ? <span className="text-blue-600 dark:text-blue-400 font-bold">[{selectedUser}]</span> : "사용자"} 상세 분석
                </h3>
                {selectedUser && (
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 underline decoration-dotted underline-offset-4"
                  >
                    선택 초기화
                  </button>
                )}
              </div>

              {!selectedUser ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 space-y-3">
                  <div className="p-4 rounded-full bg-gray-50 dark:bg-slate-800/50">
                    <User className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">사용자 차트의 항목을 클릭하여 상세 정보를 조회하세요.</p>
                </div>
              ) : loadingUserStats ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RotateCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : userToolStats.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">주 사용 도구 TOP 5 (전체 기간)</p>
                  <div className="h-[250px]">
                    {mounted && <ReactECharts key={`user-tool-${selectedUser}-${theme}`} theme={isDark ? 'dark' : undefined} option={userToolOption} style={{ height: '100%' }} notMerge={true} lazyUpdate={true} />}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 space-y-2">
                  <BarChart className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-bold">사용한 도구가 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

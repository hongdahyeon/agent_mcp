
import ReactECharts from 'echarts-for-react';
import type { UsageStats } from '../types';
import { Activity, RotateCw } from 'lucide-react';
import { useState } from 'react';

/*
* 메인 대시보드에 대한 컴포넌트
* - 서버 상태, 도구 사용 통계(차트)를 보여준다.
* - 기존 로그 영역은 사용자별 요청 횟수 차트로 대체됨.
*/
interface Props {
  stats: UsageStats;
  theme: 'light' | 'dark';
  onRefresh?: () => Promise<void>;
}

export function Dashboard({ stats, theme, onRefresh }: Props) {
  const isDark = theme === 'dark';

  // 1. Tool Usage Chart Data
  const tools = Object.keys(stats.tools);
  const pieData = tools.map(t => ({ value: stats.tools[t].count, name: t }));
  const successData = tools.map(t => stats.tools[t].success);
  const failureData = tools.map(t => stats.tools[t].failure);

  const pieOption = {
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
  };

  const barOption = {
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
  };


  // 2. User Usage Chart Data
  const userList = Object.keys(stats.users || {});
  const userData = userList.map(u => ({ value: stats.users![u], name: u }));

  const userOption = {
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
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // 애니메이션 효과를 위해 약간의 지연 시간 부여
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 상단 헤더 영역 */}
      <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">대시보드</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">도구 및 사용자별 실시간 사용 통계를 확인합니다.</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="font-medium text-sm">{isRefreshing ? '새로고침 중...' : '새로고침'}</span>
        </button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Tool Usage (Pie) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 font-pretendard">도구별 사용 횟수</h3>
          <ReactECharts theme={isDark ? 'dark' : undefined} option={pieOption} style={{ height: '400px' }} />
        </div>

        {/* Right: User Usage (Donut) - Moved from bottom */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 font-pretendard">사용자별 요청 횟수</h3>
          {userList.length > 0 ? (
            <ReactECharts theme={isDark ? 'dark' : undefined} option={userOption} style={{ height: '400px' }} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-400 dark:text-slate-500 font-pretendard">데이터 없음</div>
          )}
        </div>
      </div>

      {/* Bottom: Request Results (Bar) - Moved from top right */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 font-pretendard">요청 처리 결과</h3>
        <ReactECharts theme={isDark ? 'dark' : undefined} option={barOption} style={{ height: '350px' }} />
      </div>
    </div>
  );
}

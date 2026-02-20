
import ReactECharts from 'echarts-for-react';
import type { UsageStats } from '../types';

/* 
* 메인 대시보드에 대한 컴포넌트
* - 서버 상태, 도구 사용 통계(차트)를 보여준다.
* - 기존 로그 영역은 사용자별 요청 횟수 차트로 대체됨.
*/
interface Props {
  stats: UsageStats;
  theme: 'light' | 'dark';
}

export function Dashboard({ stats, theme }: Props) {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

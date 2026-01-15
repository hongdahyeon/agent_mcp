
import ReactECharts from 'echarts-for-react';
import type { UsageStats } from '../types';

/* 
* 서버 상태, 도구 사용 통계(차트), 실시간 로그를 한눈에 보여준다.
*/

interface Props {
  stats: UsageStats;
  logs: string[];
}

export function Dashboard({ stats, logs }: Props) {
  // Chart Data Preparation
  const tools = Object.keys(stats.tools);
  const pieData = tools.map(t => ({ value: stats.tools[t].count, name: t }));
  const successData = tools.map(t => stats.tools[t].success);
  const failureData = tools.map(t => stats.tools[t].failure);

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%' },
    series: [{
      name: '도구 사용', type: 'pie', radius: ['40%', '70%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' }, emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      data: pieData.length ? pieData : [{ value: 0, name: 'No Data' }]
    }]
  };

  const barOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['성공', '실패'], bottom: '0%' },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: tools },
    yAxis: { type: 'value' },
    series: [
      { name: '성공', type: 'bar', stack: 'total', itemStyle: { color: '#4CAF50' }, data: successData },
      { name: '실패', type: 'bar', stack: 'total', itemStyle: { color: '#F44336' }, data: failureData }
    ]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">도구별 사용 횟수</h3>
          <ReactECharts option={pieOption} style={{ height: '300px' }} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">요청 처리 결과</h3>
          <ReactECharts option={barOption} style={{ height: '300px' }} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">최근 활동 로그</h3>
        <div className="h-48 overflow-y-auto font-mono text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-gray-100 last:border-0 pb-1">{log}</div>
            ))}
            {logs.length === 0 && <div className="text-gray-400 text-center py-10">로그 데이터 없음</div>}
        </div>
      </div>
    </div>
  );
}

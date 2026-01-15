import { useState } from 'react';
import { useMcp } from './hooks/useMcp';
import { Dashboard } from './components/Dashboard';
import { Tester } from './components/Tester';
import { LogViewer } from './components/LogViewer';
import { Activity, Terminal, FileText, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';

/* 
* 애플리케이션의 진입점 및 레이아웃(사이드바, 라우팅)을 관리한다
* useMcp 훅을 사용하여 상태를 관리한다
*/

function App() {
  const [activeView, setActiveView] = useState<'dashboard'|'tester'|'logs'>('dashboard');
  const { connected, statusText, stats, availableTools, sendRpc, logs, lastResult } = useMcp();

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Activity },
    { id: 'tester', label: '도구 테스터', icon: Terminal },
    { id: 'logs', label: '로그 뷰어', icon: FileText },
  ] as const;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg mr-3">
            A
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Agent MCP
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={clsx(
                "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ease-in-out",
                activeView === item.id 
                  ? "bg-blue-50 text-blue-600 font-semibold shadow-sm translate-x-1" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={clsx("w-5 h-5 mr-3", activeView === item.id ? "text-blue-600" : "text-gray-400")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className={clsx(
            "flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
            connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {connected ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            {statusText}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {menuItems.find(i => i.id === activeView)?.label}
          </h2>
          <div className="text-xs text-gray-400 font-mono">
           {statusText}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
           {activeView === 'dashboard' && <Dashboard stats={stats} logs={logs} />}
           {activeView === 'tester' && <Tester tools={availableTools} sendRpc={sendRpc} lastResult={lastResult} />}
           {activeView === 'logs' && <LogViewer />}
        </div>
      </main>
    </div>
  )
}

export default App

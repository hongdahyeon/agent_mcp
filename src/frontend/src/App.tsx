import { useEffect, useState } from 'react';
import { useMcp } from './hooks/useMcp';
import { Dashboard } from './components/Dashboard';
import { Tester } from './components/Tester';
import { LogViewer } from './components/LogViewer';
import { Login } from './components/Login';
import { LoginHistViewer } from './components/LoginHistViewer';
import { Users } from './components/Users';
import { UsageHistory } from './components/UsageHistory'; // Import UsageHistory
import {
  Activity, Terminal, FileText,
  CheckCircle2, XCircle, History, LogOut,
  User as UserIcon, Users as UsersIcon, BarChart4, Database // Import Database icon
} from 'lucide-react';
import { SchemaManager } from './components/SchemaManager'; // Import SchemaManager
import { MyPage } from './components/MyPage'; // Import MyPage
import type { User } from './types/auth'; // Import User type
import clsx from 'clsx';

/**
* 애플리케이션의 진입점 및 레이아웃(사이드바, 라우팅)을 관리한다
* useMcp 훅을 사용하여 상태를 관리한다
*/

// 세션은 최대 3시간까지 유지할 수 있다.
const SESSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours

function App() {
  // Auth State: 세션 저장
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 세션 만료 체크 (3시간)
        if (parsed.login_ts && (Date.now() - parsed.login_ts > SESSION_TIMEOUT)) {
             localStorage.removeItem('user_session');
             return null;
        }
        return parsed;
      } catch {
        localStorage.removeItem('user_session');
      }
    }
    return null;
  });

  // View State
  const [activeView, setActiveView] = useState<'dashboard' | 'tester' | 'logs' | 'history' | 'users' | 'usage-history' | 'schema' | 'mypage'>('dashboard');

  const { connected, statusText, stats, availableTools, sendRpc, logs, lastResult } = useMcp();

  const handleLogout = () => {
    // 로그아웃 시점에 세션 remove
    localStorage.removeItem('user_session');
    setUser(null);
  };

  // 세션 만료 주기적 체크 (1분마다) 대신 사용자 활동 감지
  useEffect(() => {
     if (!user) return;

     const events = ['click', 'keypress', 'mousemove', 'scroll'];
     
     const handleActivity = () => {
         // 현재 저장된 세션 확인
         const stored = localStorage.getItem('user_session');
         if (stored) {
             const parsed = JSON.parse(stored);
             const lastTs = parsed.login_ts || Date.now();
             
             // 이미 만료되었는지 확인
             if (Date.now() - lastTs > SESSION_TIMEOUT) {
                 alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                 handleLogout();
                 return;
             }
             
             // 만료되지 않았으면 타임스탬프 갱신 (1분 단위로만 갱신하여 부하 감소)
             if (Date.now() - lastTs > 60000) {
                 const updatedUser = { ...parsed, login_ts: Date.now() };
                 localStorage.setItem('user_session', JSON.stringify(updatedUser));
                 // State 업데이트는 불필요할 수 있으나 동기화를 위해 (또는 생략 가능)
                 // setUser(updatedUser); 
             }
         }
     };

     // Throttling or simple addEventListener
     // 여기서는 간단히 이벤트 등록
     events.forEach(event => window.addEventListener(event, handleActivity));

     return () => {
         events.forEach(event => window.removeEventListener(event, handleActivity));
     };
  }, [user]);

  // 로그인 이벤트
  const handleLogin = (loggedInUser: User) => {
    // 로그인 시 현재 시간(login_ts) 추가
    const sessionUser = { ...loggedInUser, login_ts: Date.now() };
    localStorage.setItem('user_session', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setActiveView('dashboard');
  };

  // If not logged in, show Login Screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 기본 구성되는 메뉴 목록
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Activity },
    { id: 'tester', label: '도구 테스터', icon: Terminal },
    { id: 'logs', label: '로그 뷰어', icon: FileText },
    { id: 'history', label: '접속 이력', icon: History },
  ];
  // role 값이 'ROLE_ADMIN'인 경우에만 '사용자 관리' 메뉴를 추가한다
  if (user.role === 'ROLE_ADMIN') {
    menuItems.push({ id: 'users', label: '사용자 관리', icon: UsersIcon });
    menuItems.push({ id: 'usage-history', label: '사용 이력', icon: BarChart4 }); // Add Usage History menu
    menuItems.push({ id: 'schema', label: 'DB 관리', icon: Database }); // Add Schema Manager menu
  }

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

        {/* User Profile Summary */}
        <div className="px-4 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <button 
            onClick={() => setActiveView('mypage')}
            className="flex items-center flex-1 hover:bg-gray-200/50 p-1.5 -ml-1.5 rounded-lg transition-colors text-left group cursor-pointer"
            title="내 정보 관리"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2 group-hover:bg-blue-200 transition-colors">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-700 truncate">{user.user_nm}</p>
              <p className="text-xs text-gray-500 truncate">{user.user_id}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
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
            {menuItems.find(i => i.id === activeView)?.label || (activeView === 'mypage' ? '내 정보' : '')}
          </h2>
          <div className="text-xs text-gray-400 font-mono">
            {statusText}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          {activeView === 'dashboard' && <Dashboard stats={stats} logs={logs} />}
          {activeView === 'tester' && <Tester tools={availableTools} sendRpc={sendRpc} lastResult={lastResult} />}
          {activeView === 'logs' && <LogViewer />}
          {activeView === 'history' && <LoginHistViewer />}
          {activeView === 'mypage' && <MyPage />}
          {activeView === 'users' && user.role === 'ROLE_ADMIN' && <Users />}  {/* 관리자 전용 */}
          {activeView === 'usage-history' && user.role === 'ROLE_ADMIN' && <UsageHistory />} {/* 관리자 전용 */}
          {activeView === 'schema' && user.role === 'ROLE_ADMIN' && <SchemaManager />} {/* 관리자 전용 */}
        </div>
      </main>
    </div>
  )
}

export default App

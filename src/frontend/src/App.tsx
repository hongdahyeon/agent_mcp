import { useEffect, useState } from 'react';
import { AccessTokenManager } from './components/AccessTokenManager';
import clsx from 'clsx';
import { useMcp } from './hooks/useMcp';
import { Dashboard } from './components/Dashboard';
import { Tester } from './components/Tester';
import { LogViewer } from './components/LogViewer';
import { Login } from './components/Login';
import { LoginHistViewer } from './components/LoginHistViewer';
import { Users } from './components/Users';
import { UsageHistory } from './components/UsageHistory';
import { SchemaManager } from './components/SchemaManager';
import { LimitManagement } from './components/LimitManagement';
import { CustomTools } from './components/CustomTools';
import { MyPage } from './components/MyPage';
import { SystemConfig } from './components/SystemConfig';
import { EmailSender } from './components/EmailSender';
import type { User } from './types/auth';
import {
  Activity, Terminal, FileText,
  CheckCircle2, XCircle, History, LogOut,
  User as UserIcon, Users as UsersIcon, BarChart4, Database, Shield, Wrench, Settings, Send
} from 'lucide-react';
import type { UsageData } from './types/Usage';
import { getAuthHeaders } from './utils/auth';

// 세션은 최대 3시간까지 유지할 수 있다.
const SESSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours

// 각 사용자의 사용량을 표시하는 컴포넌트
function UsageBadge({ usageData }: { usageData: UsageData | null }) {
  if (!usageData) return null;

  const { usage, limit, remaining } = usageData;
  const isUnlimited = limit === -1;

  // 스타일 결정 (잔여량에 따라 색상 변경)
  let badgeColor = "bg-blue-100 text-blue-700";
  if (!isUnlimited) {
    if (remaining === 0) badgeColor = "bg-red-100 text-red-700";
    else if (remaining < 5) badgeColor = "bg-orange-100 text-orange-700";
  }

  return (
    <div className={clsx("flex items-center px-3 py-1.5 rounded-full text-xs font-medium mr-4 border border-transparent shadow-sm", badgeColor)} title="오늘 사용량 / 일일 한도">
      <BarChart4 className="w-3.5 h-3.5 mr-1.5" />
      <span>
        {isUnlimited ? (
          `사용: ${usage} (무제한)`
        ) : (
          `사용: ${usage} / ${limit} (잔여: ${remaining})`
        )}
      </span>
    </div>
  );
}

function App() {
  // 인증 상태 (Auth State): 세션 저장
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

  // 화면 상태 (View State)
  const [activeView, setActiveView]
    = useState<'dashboard' | 'tester' | 'logs' | 'history' | 'users'
      | 'usage-history' | 'schema' | 'limits' | 'mypage' | 'custom-tools' | 'access-tokens' | 'config' | 'email'>('dashboard');

  // API Token 상태 관리 (SSE 재연결 트리거용)
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('mcp_api_token'));

  // 로그인 상태와 상관없이 useMcp는 항상 호출되지만, authToken이 변경되면 재연결됨
  const { connected, statusText, stats, availableTools, sendRpc, logs, lastResult, refreshTools } = useMcp('/sse', authToken);

  // Phase 3: 사용량 데이터 상태 관리
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  // 사용량 조회 함수
  const fetchMyUsage = async (userId: string) => {
    if (!userId) {
      console.warn("[App] userId is empty in fetchMyUsage");
      return;
    }
    try {
      console.log("[App] Fetching usage stats for user:", userId);
      const res = await fetch('/api/mcp/my-usage', {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[App] Usage stats fetched:", data);
        setUsageData({
          usage: data.usage,
          limit: data.limit,
          remaining: data.remaining
        });
      } else {
        const errText = await res.text();
        console.error(`[App] Failed to fetch usage (Status: ${res.status}):`, errText);
      }
    } catch (e) {
      console.error("[App] Exception in fetchMyUsage:", e);
    }
  };

  // 초기 로딩 및 도구 실행 결과(lastResult)가 바뀔 때마다 사용량 갱신
  useEffect(() => {
    const loadData = async () => {
      if (user && user.user_id) {
        await fetchMyUsage(user.user_id);
      }
    };
    loadData();
  }, [user, lastResult]); // lastResult 변경 시(도구 사용 후) 업데이트

  const handleLogout = () => {
    // 로그아웃 시점에 세션 삭제
    localStorage.removeItem('user_session');
    // MCP 토큰도 함께 제거
    localStorage.removeItem('mcp_api_token');
    setAuthToken(null);
    setUser(null);
  };

  // 세션 만료 주기적 체크 및 활동 감지
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
        }
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user]);

  // 로그인 이벤트
  const handleLogin = (loggedInUser: User) => {
    const sessionUser = { ...loggedInUser, login_ts: Date.now() };
    localStorage.setItem('user_session', JSON.stringify(sessionUser));

    // Login 컴포넌트에서 이미 setItem 했지만, 상태 동기화를 위해 여기서도 읽거나 Login에서 setAuthToken을 호출하게 해야 함
    // 여기서는 localStorage에서 다시 읽어서 상태 업데이트
    const token = localStorage.getItem('mcp_api_token');
    setAuthToken(token);

    setUser(sessionUser);
    setActiveView('dashboard');
  };

  // 로그인되지 않은 경우 로그인 화면 표시 (If not logged in, show Login Screen)
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
  }

  interface MenuGroup {
    label?: string; // Group Header (Optional)
    items: MenuItem[];
  }

  // 메뉴 구성 정의
  const menuStructure: MenuGroup[] = [
    {
      items: [
        { id: 'dashboard', label: '대시보드', icon: Activity }
      ]
    },
    {
      label: '기능',
      items: [
        { id: 'tester', label: '도구 테스터', icon: Terminal },
        { id: 'logs', label: '로그 뷰어', icon: FileText },
        { id: 'email', label: '메일 발송', icon: Send }
      ]
    },
    {
      label: '이력',
      items: [
        { id: 'history', label: '접속 이력', icon: History },
        { id: 'usage-history', label: '사용자 이력', icon: BarChart4, adminOnly: true }
      ]
    },
    {
      label: '설정 및 관리',
      items: [
        { id: 'limits', label: '사용제한 관리', icon: Shield, adminOnly: true },
        { id: 'schema', label: 'DB 관리', icon: Database, adminOnly: true },
        { id: 'custom-tools', label: '도구 생성', icon: Wrench, adminOnly: true },
        { id: 'access-tokens', label: '보안 토큰 관리', icon: Wrench, adminOnly: true },
        { id: 'config', label: '시스템 설정', icon: Settings, adminOnly: true },
        { id: 'users', label: '사용자 관리', icon: UsersIcon, adminOnly: true }
      ]
    }
  ];

  // Flattened items for finding labels in header (Simple utility)
  const allMenuItems = menuStructure.flatMap(g => g.items);

  return (
    <div className="flex h-full bg-gray-50">
      {/* 사이드바 (Sidebar) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg mr-3">
            A
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Agent MCP
          </h1>
        </div>

        {/* 사용자 프로필 요약 (User Profile Summary) */}
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

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {menuStructure.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              {group.label && (
                <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  // Admin check
                  if (item.adminOnly && user.role !== 'ROLE_ADMIN') return null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      className={clsx(
                        "w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm",
                        activeView === item.id
                          ? "bg-blue-50 text-blue-600 font-semibold shadow-sm translate-x-1"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon className={clsx("w-4 h-4 mr-3", activeView === item.id ? "text-blue-600" : "text-gray-400")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
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

      {/* 메인 콘텐츠 영역 (Main Content) */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {allMenuItems.find(i => i.id === activeView)?.label || (activeView === 'mypage' ? '내 정보' : '')}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Phase 3 Badge */}
            <UsageBadge usageData={usageData} />
            <div className="text-xs text-gray-400 font-mono">
              {statusText}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          {activeView === 'dashboard' && <Dashboard stats={stats} logs={logs} />}
          {activeView === 'tester' && <Tester tools={availableTools} sendRpc={sendRpc} lastResult={lastResult} refreshTools={refreshTools} />}
          {activeView === 'logs' && <LogViewer />}
          {activeView === 'email' && user && <EmailSender />}
          {activeView === 'history' && <LoginHistViewer />}
          {activeView === 'mypage' && <MyPage />}
          {activeView === 'users' && user.role === 'ROLE_ADMIN' && <Users />}
          {activeView === 'usage-history' && user.role === 'ROLE_ADMIN' && <UsageHistory />}
          {activeView === 'limits' && user.role === 'ROLE_ADMIN' && <LimitManagement />}
          {activeView === 'custom-tools' && user.role === 'ROLE_ADMIN' && <CustomTools />}
          {activeView === 'access-tokens' && user.role === 'ROLE_ADMIN' && <AccessTokenManager />}
          {activeView === 'schema' && user.role === 'ROLE_ADMIN' && <SchemaManager />}
          {activeView === 'config' && user.role === 'ROLE_ADMIN' && <SystemConfig token={authToken} />}
        </div>
      </main>
    </div>
  )
}

export default App

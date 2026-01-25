import { useState, useCallback, useEffect, useRef } from 'react';
import type { RpcMessage, RpcResponse, Tool, UsageStats } from '../types';

/* 
* FE & MCP BE 서버 간의 통신 전체를 관리하는 React Hook
* - 연결 관리: '/sse' 엔드포인트로 Server-Sent Events(SSE) 연결 유지 (connected:true/false)
* - 메시지 수신: 서버에서 오는 모든 메시지(도구 목록, 실행 결과, 에러 등)을 받아서 처리
* - 메시지 전송: FE에서 버튼을 누르면 sendRpc 함수를 통해 서버로 JSON-RPC 요청 전송 (ex. 더하기 도구 실행해줘)
* - 상태 저장: logs 화면에 보이는 로그 창의 내용들
*/


interface UseMcpResult {
    stats: UsageStats;
    availableTools: Tool[];
    sendRpc: (method: string, params?: any, id?: number | string) => Promise<void>;
    initialized: boolean;
    lastResult: any;
    logs: string[];
    connected: boolean;
    statusText: string;
}

export function useMcp(sseEndpoint: string = '/sse'): UseMcpResult {
    const [stats, setStats] = useState<UsageStats>({ tools: {} });
    const [availableTools, setAvailableTools] = useState<Tool[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // Connection State
    const [connected, setConnected] = useState(false);
    const [statusText, setStatusText] = useState('Disconnected');
    const [postEndpoint, setPostEndpoint] = useState<string | null>(null);

    // Ref to track postEndpoint without triggering re-renders or stale closures in sendRpc
    const postEndpointRef = useRef<string | null>(null);

    // Function to add log
    const addLog = useCallback((type: string, msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${type}: ${msg}`, ...prev].slice(0, 50));
    }, []);

    /*
        Send JSON-RPC
        - method: 호출할 도구 이름 (ex. "add")
        - params: 도구에 전달할 파라미터 (ex. { a: 1, b: 2 })
        - id: 요청 ID (보통 자동으로 생성되지만, 필요시 지정 가능)
     */
    const sendRpc = useCallback(async (method: string, params: any = {}, id?: number | string) => {
        const endpoint = postEndpointRef.current;
        console.log('>>> sendRpc called. Method:', method, 'Endpoint:', endpoint);
        if (!endpoint) {
            addLog('ERROR', 'Cannot send RPC: No postEndpoint');
            return;
        }

        const message: RpcMessage = {
            jsonrpc: "2.0",
            method,
            params,
            id
        };

        /*
            기존에는 {_user_uid}를 파라미터에 넣어서 보내고,
            해당 정보를 통해 Tool 사용 기록을 남겼음.

            이제는 토큰을 통해 유저를 식별하고,
            context.py에서 유저 정보를 가져와서 Tool 사용 기록을 남김.
         */

        if (method.startsWith('notifications/')) delete message.id;

        addLog('SEND', method);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            if (!res.ok) {
                addLog('ERROR', `Send Failed: ${res.statusText}`);
            }
        } catch (e: any) {
            addLog('ERROR', `Send Failed: ${e.message}`);
        }
    }, [addLog]); // Removed postEndpoint dep

    /*
        DB에서 통계 데이터 가져오기
     */
    const fetchStats = useCallback(async () => {
        if (!postEndpoint) return;
        try {
            // endpoint: /messages -> /api/mcp/stats
            const res = await fetch('/api/mcp/stats');
            if (res.ok) {
                const data = await res.json();
                setStats({ tools: data });
            }
        } catch (e) {
            console.error("Failed to fetch stats:", e);
        }
    }, [postEndpoint]);

    // Update stats when endpoint is ready
    useEffect(() => {
        if (postEndpoint) {
            fetchStats();
        }
    }, [postEndpoint, fetchStats]);

    // Handle SSE Connection & Messages
    useEffect(() => {
        setStatusText('Connecting...');

        // [Phase 2] Token Authentication
        // MyPage에서 발급받아 저장된 토큰이 있다면 사용
        const token = localStorage.getItem('mcp_api_token');
        const url = token ? `${sseEndpoint}?token=${token}` : sseEndpoint;
        const source = new EventSource(url);

        source.onopen = () => {
            addLog('SYS', 'SSE Connected');
            setConnected(true);
            setStatusText('Connected');
        };

        source.addEventListener('endpoint', (event: MessageEvent) => {
            addLog('SYS', `Endpoint received: ${event.data}`);
            setPostEndpoint(event.data);
            postEndpointRef.current = event.data; // Update Ref
        });

        source.onmessage = (event) => {
            try {
                const data: RpcResponse & { method?: string } = JSON.parse(event.data);

                // General Debug
                // addLog('DEBUG', `Received: ${JSON.stringify(data).slice(0, 100)}...`);

                // 1. Initialize Response
                if (String(data.id) === 'init_req') {
                    addLog('MCP', 'Init Response Received');
                    if (data.result && data.result.protocolVersion) {
                        addLog('MCP', 'Initialized. Sending notification.');
                        sendRpc('notifications/initialized');
                        setInitialized(true);

                        // Fetch Tools
                        setTimeout(() => {
                            addLog('MCP', 'Fetching tools...');
                            sendRpc('tools/list', {}, 'list_tools');
                        }, 500);
                    } else {
                        addLog('ERROR', 'Init failed: No protocolVersion');
                    }
                    return;
                }

                // 2. Initialized Notification
                if (data.method === 'notifications/initialized') {
                    addLog('MCP', 'Session Ready');
                    return;
                }

                // 3. Tool List Response
                if (String(data.id) === 'list_tools') {
                    if (data.result) {
                        const toolCount = data.result.tools ? data.result.tools.length : 0;
                        addLog('SYSTEM', `Tools fetched: ${toolCount} found`);

                        if (data.result.tools) {
                            setAvailableTools(data.result.tools);
                        } else {
                            addLog('WARN', 'Tools array missing in result');
                            console.log('Full Result:', data.result);
                        }
                    } else if (data.error) {
                        addLog('ERROR', `Tool fetch failed: ${data.error.message}`);
                    }
                    return;
                }

                // 4. Tool Execution Result
                if (data.id && (typeof data.id === 'number' || typeof data.id === 'string')) {
                    const toolName = String(data.id); // In Tester, we send toolName as ID directly

                    if (data.error) {
                        addLog('ERROR', `RPC Error: ${data.error.message}`);
                        setLastResult(data.error);
                        // Update Stats (Failure) -> Refresh from DB
                        fetchStats();
                    } else if (data.result) {
                        setLastResult(data.result);
                        // DB 통계로 대체되므로 로컬 카운트 로직은 제거하지만,
                        // UX를 위해 로그는 남김
                        let isLogicalError = data.result.isError;
                        if (data.result.content && Array.isArray(data.result.content)) {
                            const text = data.result.content[0]?.text || '';
                            if (text.startsWith('Error:') || text.startsWith('User not found') || text.startsWith('Missing')) {
                                isLogicalError = true;
                            }
                        }
                        if (isLogicalError) {
                            addLog('RESULT', 'Logical Failure');
                        } else {
                            addLog('RESULT', 'Success');
                        }
                        // Refresh DB Stats
                        fetchStats();
                    }
                }

            } catch (e: any) {
                console.error(e);
            }
        };

        source.onerror = () => {
            addLog('SYS', 'SSE Error / Reconnecting');
            setConnected(false);
            setStatusText('Reconnecting...');
            setInitialized(false);
            setPostEndpoint(null);
            postEndpointRef.current = null; // Reset Ref
        };

        return () => {
            source.close();
            setConnected(false);
        };
    }, [sseEndpoint, addLog, sendRpc]); // Added sendRpc back as it is now stable

    // Trigger Initialize when Endpoint is ready
    useEffect(() => {
        // Use a ref or simple check to ensure we only init once per connection session if needed
        // But here, simply checking initialized state resets on disconnect
        if (connected && postEndpoint && !initialized) {
            addLog('MCP', `Sending Initialize to ${postEndpoint}...`);
            sendRpc('initialize', {
                protocolVersion: '2024-11-05',
                capabilities: { sampling: {} },
                clientInfo: { name: 'react-client', version: '1.0.0' }
            }, 'init_req');
        }
    }, [connected, postEndpoint, initialized, sendRpc, addLog]);

    return { stats, availableTools, sendRpc, initialized, lastResult, logs, connected, statusText };
}

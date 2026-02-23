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
    refreshTools: () => void;
    refreshStats: () => Promise<void>;
}

/*
    {authToken: string | null = null}: SSE 연결 시 보안(인증) 강화
    - MCP BE 서버에서 토큰을 통해 사용자 식별: /sse?token={authToken}
    - MCP BE 서버에서 사용자 정보를 가져와서 Tool 사용 기록을 남김
*/
export function useMcp(sseEndpoint: string = '/sse', authToken: string | null = null): UseMcpResult {
    const [stats, setStats] = useState<UsageStats>({ tools: {}, users: {} });
    const [availableTools, setAvailableTools] = useState<Tool[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // 연결 상태 (Connection State)
    const [connected, setConnected] = useState(false);
    const [statusText, setStatusText] = useState('Disconnected');
    const [postEndpoint, setPostEndpoint] = useState<string | null>(null);

    // sendRpc 내부에서 재렌더링 없이 postEndpoint 최신값을 참조하기 위한 Ref
    const postEndpointRef = useRef<string | null>(null);

    // 로그 추가 함수
    const addLog = useCallback((type: string, msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${type}: ${msg}`, ...prev].slice(0, 50));
    }, []);

    /*
        JSON-RPC 요청 전송
        - method: 호출할 도구 이름 (ex. "add")
        - params: 도구에 전달할 파라미터 (ex. { a: 1, b: 2 })
        - id: 요청 ID (보통 자동으로 생성되지만, 필요시 지정 가능)
     */
    const sendRpc = useCallback(async (method: string, params: any = {}, id?: number | string) => {
        const endpoint = postEndpointRef.current;
        console.log('[useMcp] sendRpc called. Method:', method, 'Endpoint:', endpoint);
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
    }, [addLog]); // postEndpoint 의존성 제거

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
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats:", e);
        }
    }, [postEndpoint]);

    // 엔드포인트 준비 시 통계 업데이트
    useEffect(() => {
        if (postEndpoint) {
            fetchStats();
        }
    }, [postEndpoint, fetchStats]);

    // SSE 연결 및 메시지 처리 (Handle SSE Connection & Messages)
    useEffect(() => {
        setStatusText('Connecting...');

        // [Phase 2] 토큰 인증 (Token Authentication)
        // authToken prop이 있으면 우선 사용, 없으면 localStorage 확인 (하위 호환)
        const token = authToken || localStorage.getItem('mcp_api_token');
        //console.log(">>>> token:: ", token)
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
            postEndpointRef.current = event.data; // Ref 업데이트
        });

        source.onmessage = (event) => {
            try {
                const data: RpcResponse & { method?: string } = JSON.parse(event.data);

                // 1. 초기화 응답 (Initialize Response)
                if (String(data.id) === 'init_req') {
                    addLog('MCP', 'Init Response Received');
                    if (data.result && data.result.protocolVersion) {
                        addLog('MCP', 'Initialized. Sending notification.');
                        sendRpc('notifications/initialized');
                        setInitialized(true);

                        // 도구 목록 조회 (Fetch Tools)
                        setTimeout(() => {
                            addLog('MCP', 'Fetching tools...');
                            sendRpc('tools/list', {}, 'list_tools');
                        }, 500);
                    } else {
                        addLog('ERROR', 'Init failed: No protocolVersion');
                    }
                    return;
                }

                // 2. 초기화 완료 알림 (Initialized Notification)
                if (data.method === 'notifications/initialized') {
                    addLog('MCP', 'Session Ready');
                    return;
                }

                // 3. 도구 목록 응답 (Tool List Response)
                if (String(data.id) === 'list_tools') {
                    if (data.result) {
                        const toolCount = data.result.tools ? data.result.tools.length : 0;
                        addLog('SYSTEM', `Tools fetched: ${toolCount} found`);
                        console.log('Full Result:', data.result);
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

                // 4. 도구 실행 결과 (Tool Execution Result)
                if (data.id && (typeof data.id === 'number' || typeof data.id === 'string')) {
                    const toolName = String(data.id); // 테스터에서는 도구 이름을 ID로 직접 사용
                    console.log(">> toolName: ", toolName)

                    if (data.error) {
                        addLog('ERROR', `RPC Error: ${data.error.message}`);
                        setLastResult(data.error);
                        // 통계 업데이트 (실패) -> DB에서 갱신
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
                        // DB 통계 갱신
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
            postEndpointRef.current = null; // Ref 초기화
        };

        return () => {
            source.close();
            setConnected(false);
        };
    }, [sseEndpoint, authToken, addLog, sendRpc]); // sendRpc가 안정화되어 의존성 추가, authToken 변경 시 재연결

    // 연결 및 엔드포인트 수신 시 초기화 요청 (Trigger Initialize)
    useEffect(() => {
        // 연결 세션당 한 번만 초기화하도록 체크
        // 여기서는 initialized 상태가 연결 끊김 시 리셋되므로 이를 확인
        if (connected && postEndpoint && !initialized) {
            addLog('MCP', `Sending Initialize to ${postEndpoint}...`);
            sendRpc('initialize', {
                protocolVersion: '2024-11-05',
                capabilities: { sampling: {} },
                clientInfo: { name: 'react-client', version: '1.0.0' }
            }, 'init_req');
        }
    }, [connected, postEndpoint, initialized, sendRpc, addLog]);

    // 도구 목록 새로고침 함수
    const refreshTools = useCallback(() => {
        addLog('MCP', 'Refetching tools...');
        sendRpc('tools/list', {}, 'list_tools');
    }, [sendRpc, addLog]);

    // 통계 데이터 새로고침 함수 (명시적 노출)
    const refreshStats = useCallback(async () => {
        await fetchStats();
    }, [fetchStats]);

    return { stats, availableTools, sendRpc, initialized, lastResult, logs, connected, statusText, refreshTools, refreshStats };
}

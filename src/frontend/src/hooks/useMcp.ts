import { useState, useCallback, useEffect, useRef } from 'react';
import type { RpcMessage, RpcResponse, Tool, UsageStats } from '../types';

/* 
* useMcp 훅은 MCP 서버와의 통신을 담당한다
* SSE를 사용하여 서버로부터 실시간 데이터를 수신한다
* JSON-RPC를 사용하여 서버와 통신한다
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

export function useMcp(
  sseEndpoint: string = '/sse'
): UseMcpResult {
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

  // Send JSON-RPC
  const sendRpc = useCallback(async (method: string, params: any = {}, id?: number | string) => {
    const endpoint = postEndpointRef.current;
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

  // Handle SSE Connection & Messages
  useEffect(() => {
    setStatusText('Connecting...');
    const source = new EventSource(sseEndpoint);

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
                    
                    // Update Stats (Failure)
                    setStats(prev => {
                        const current = prev.tools[toolName] || { count: 0, success: 0, failure: 0 };
                        return {
                            ...prev,
                            tools: {
                                ...prev.tools,
                                [toolName]: {
                                    ...current,
                                    count: current.count + 1,
                                    failure: current.failure + 1
                                }
                            }
                        };
                    });

                } else if (data.result) {
                    addLog('RESULT', 'Success');
                    setLastResult(data.result);

                    // Update Stats (Success)
                     setStats(prev => {
                        const current = prev.tools[toolName] || { count: 0, success: 0, failure: 0 };
                        return {
                            ...prev,
                            tools: {
                                ...prev.tools,
                                [toolName]: {
                                    ...current,
                                    count: current.count + 1,
                                    success: current.success + 1
                                }
                            }
                        };
                    });
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

/* 
*   MCP(Model Context Protocol) 시스템의 핵심 기능과 관련된 데이터 타입들 정의
    - 도구 실행
    - 서버 통신
    - 대시보드 데이터
*/

// 서버에서 제공하는 도구의 정의
export interface Tool {
    name: string;
    description?: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

// 도구 실행 결과의 통계 정보
export interface ToolStats {
    count: number;
    success: number;
    failure: number;
}

// 도구 실행 결과의 통계 정보
export interface UsageStats {
    tools: Record<string, ToolStats>;
    users?: Record<string, number>;
    heatmapStats?: { dow: string; hour: string; cnt: number }[];
}

// 서버와 통신시 사용하는 JSON-RPC 프로토콜 메시지 규격
export interface RpcMessage {
    jsonrpc: "2.0";
    method: string;
    params?: any;
    id?: number | string;
}
// 서버와 통신시 사용하는 JSON-RPC 프로토콜 메시지 규격
export interface RpcResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

// 로그 파일 목록
export interface LogFileResponse {
    files: string[];
}
// 로그 파일 내용
export interface LogContentResponse {
    filename: string;
    content: string;
}

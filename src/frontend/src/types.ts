
export interface Tool {
    name: string;
    description?: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface ToolStats {
    count: number;
    success: number;
    failure: number;
}

export interface UsageStats {
    tools: Record<string, ToolStats>;
}

export interface RpcMessage {
    jsonrpc: "2.0";
    method: string;
    params?: any;
    id?: number | string;
}

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

export interface LogFileResponse {
    files: string[];
}

export interface LogContentResponse {
    filename: string;
    content: string;
}

/**
 * API 요청 시 사용할 인증 헤더를 생성합니다.
 * localStorage의 'mcp_api_token' (JWT)을 사용하여 'Authorization' 헤더를 구성합니다.
 * @returns {Record<string, string>} 헤더 객체
 */
export const getAuthHeaders = (): Record<string, string> => {
    try {
        const headers: Record<string, string> = {};
        
        // JWT Token
        const token = localStorage.getItem('mcp_api_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    } catch (e) {
        console.error("Failed to get auth headers", e);
        return {};
    }
};

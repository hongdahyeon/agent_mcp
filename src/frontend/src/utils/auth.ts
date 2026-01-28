/**
 * API 요청 시 사용할 인증 헤더를 생성합니다.
 * localStorage의 'user_session'에서 user_id를 추출하여 'X-User-Id' 헤더를 구성합니다.
 * (+) {token} 값도 함께 반환
 * @returns {Record<string, string>} 헤더 객체
 */
export const getAuthHeaders = (): Record<string, string> => {
    try {
        const headers: Record<string, string> = {};
        
        // 1. User ID (X-User-Id)
        const userStr = localStorage.getItem('user_session');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.user_id) {
                headers['X-User-Id'] = String(user.user_id);
            }
        }

        // 2. Token
        const token = localStorage.getItem('mcp_api_token');
        if (token) {
            headers['token'] = token;
        }

        return headers;
    } catch (e) {
        console.error("Failed to parse user session", e);
        return {};
    }
};

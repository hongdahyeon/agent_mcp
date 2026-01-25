/**
 * API 요청 시 사용할 인증 헤더를 생성합니다.
 * localStorage의 'user_session'에서 user_id를 추출하여 'X-User-Id' 헤더를 구성합니다.
 * @returns {Record<string, string>} 헤더 객체
 */
export const getAuthHeaders = (): Record<string, string> => {
    try {
        const userStr = localStorage.getItem('user_session');
        if (!userStr) return {};
        
        const user = JSON.parse(userStr);
        // User ID가 존재하면 문자열로 변환하여 헤더에 추가
        return user.user_id ? { 'X-User-Id': String(user.user_id) } : {};
    } catch (e) {
        console.error("Failed to parse user session", e);
        return {};
    }
};

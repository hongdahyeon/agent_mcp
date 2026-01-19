import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* 
* vite 설정 파일
* - FE: localhost:5173
* - BE: localhost:8000
* -> /auth, /sse와 같은 요청이 오면 마치 자기 자신한테 보낸 것처럼 받아서, 뒤로는 8000번 포트로 넘기기
* -> 개발에 있어서 CORS 문제 해결을 위한 설정
*/

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sse': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/logs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})

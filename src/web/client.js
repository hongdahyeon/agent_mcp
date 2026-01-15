
// ==========================================
// 설정 및 전역 변수
// ==========================================
const SSE_ENDPOINT = '/sse';
let postEndpoint = '/messages'; // 서버로부터 'endpoint' 이벤트를 통해 업데이트됨

let requestId = 0;
let isInitialized = false;

// 통계 데이터 저장용 객체
const usageStats = {
    add: 0,
    subtract: 0,
    success: 0,
    failure: 0
};

// ECharts 인스턴스 변수
let usageChart = null;
let statusChart = null;

// ==========================================
// 유틸리티 함수
// ==========================================

/**
 * 로그 메시지를 화면에 출력합니다.
 * @param {string} type - 로그 타입 (SYSTEM, MCP, ERROR 등)
 * @param {string} message - 출력할 메시지
 */
function log(type, message) {
    const time = new Date().toLocaleTimeString();
    const html = `<div><span class="text-blue-400 mr-2">[${time}]</span><span class="font-bold text-purple-400 mr-2">${type}</span> ${message}</div>`;
    
    // 대시보드 로그 업데이트
    const dashboardLog = document.getElementById('dashboard-log');
    if (dashboardLog) {
        dashboardLog.innerHTML = html + dashboardLog.innerHTML; // 최신순 정렬
    }

    // 테스터 로그 업데이트
    const testerLog = document.getElementById('tester-log');
    if (testerLog) {
        testerLog.innerHTML += html;
        testerLog.scrollTop = testerLog.scrollHeight;
    }
}

/**
 * 연결 상태 UI를 업데이트합니다.
 * @param {boolean} connected - 연결 여부
 * @param {string} text - 표시할 텍스트
 */
function updateStatus(connected, text) {
    const statusDiv = document.getElementById('connectionStatus');
    const dot = statusDiv.querySelector('span');
    
    statusDiv.lastChild.textContent = text || (connected ? ' Connected' : ' Disconnected');
    
    if (connected) {
        statusDiv.className = 'flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800';
        dot.className = 'w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse';
        setButtonsEnabled(true);
    } else {
        statusDiv.className = 'flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800';
        dot.className = 'w-2 h-2 mr-2 bg-red-500 rounded-full';
        setButtonsEnabled(false);
    }
}

/**
 * 버튼 활성화/비활성화 제어
 */
function setButtonsEnabled(enabled) {
    document.querySelectorAll('button:not(#btn-dashboard):not(#btn-tester)').forEach(btn => {
        btn.disabled = !enabled;
    });
}

/**
 * 화면 전환 함수
 * @param {string} viewName - 전환할 뷰 이름 ('dashboard' or 'tester')
 */
function showView(viewName) {
    // 모든 뷰 숨김
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-tester').classList.add('hidden');
    
    // 메뉴 버튼 스타일 초기화
    document.getElementById('btn-dashboard').className = 'w-full flex items-center px-4 py-2 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors';
    document.getElementById('btn-tester').className = 'w-full flex items-center px-4 py-2 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors';
    
    // 선택된 뷰 보이기 및 버튼 활성화 스타일 적용
    if (viewName === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('btn-dashboard').className = 'w-full flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium text-blue-600';
        updateCharts(); // 차트 리사이즈를 위해 호출
    } else {
        document.getElementById('view-tester').classList.remove('hidden');
        document.getElementById('btn-tester').className = 'w-full flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium text-blue-600';
    }
}

// 전역으로 노출 (HTML에서 호출 가능하도록)
window.showView = showView;
window.callTool = callTool;

// ==========================================
// ECharts 차트 관리
// ==========================================

function initCharts() {
    // 1. 도구 사용량 차트
    usageChart = echarts.init(document.getElementById('chart-usage'));
    const usageOption = {
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%' },
        series: [{
            name: '도구 사용',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
            data: [
                { value: 0, name: 'Add' },
                { value: 0, name: 'Subtract' }
            ]
        }]
    };
    usageChart.setOption(usageOption);

    // 2. 성공/실패 차트
    statusChart = echarts.init(document.getElementById('chart-status'));
    const statusOption = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['성공', '실패'] },
        yAxis: { type: 'value' },
        series: [{
            name: '횟수',
            type: 'bar',
            data: [
                { value: 0, itemStyle: { color: '#4CAF50' } },
                { value: 0, itemStyle: { color: '#F44336' } }
            ]
        }]
    };
    statusChart.setOption(statusOption);

    // 반응형 리사이즈 처리
    window.addEventListener('resize', () => {
        usageChart.resize();
        statusChart.resize();
    });
}

/**
 * 차트 데이터를 업데이트합니다.
 */
function updateCharts() {
    if (!usageChart || !statusChart) return;

    // 통계 데이터 반영
    usageChart.setOption({
        series: [{
            data: [
                { value: usageStats.add, name: 'Add' },
                { value: usageStats.subtract, name: 'Subtract' }
            ]
        }]
    });

    statusChart.setOption({
        series: [{
            data: [
                { value: usageStats.success, itemStyle: { color: '#4CAF50' } },
                { value: usageStats.failure, itemStyle: { color: '#F44336' } }
            ]
        }]
    });
    
    // 탭 전환 시 차트 크기가 깨지는 것 방지
    usageChart.resize();
    statusChart.resize();
}


// ==========================================
// 통신 로직 (SSE & JSON-RPC)
// ==========================================

/**
 * SSE 연결 초기화
 */
function connect() {
    setButtonsEnabled(false);
    updateStatus(false, 'Connecting...');
    
    log('SYSTEM', '서버(SSE)에 연결을 시도합니다...');
    const source = new EventSource(SSE_ENDPOINT);

    source.onopen = () => {
        log('SYSTEM', 'SSE 연결이 열렸습니다.');
        updateStatus(true, 'Connected (Init)');
    };

    // 'endpoint' 이벤트 수신: 세션 ID가 포함된 POST URL을 받음
    source.addEventListener('endpoint', (event) => {
        const endpointUri = event.data;
        log('SYSTEM', `POST 통신 엔드포인트 수신: ${endpointUri}`);
        postEndpoint = endpointUri;
        
        // MCP 초기화 핸드셰이크 시작
        initializeSession();
    });

    source.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {
            log('ERROR', '메시지 파싱 실패: ' + event.data);
        }
    };

    source.onerror = (err) => {
        log('ERROR', '연결 오류 발생. 재연결 시도 중...');
        updateStatus(false, 'Reconnecting...');
        // EventSource는 자동으로 재연결을 시도합니다.
    };
}

/**
 * MCP 세션 초기화 요청 전송 ('initialize')
 */
async function initializeSession() {
    log('MCP', '세션 초기화 요청(initialize) 전송...');
    await sendRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { sampling: {} },
        clientInfo: { name: 'mcp-web-dashboard', version: '2.0.0' }
    });
}

/**
 * 서버로부터 수신된 JSON-RPC 메시지 처리
 */
function handleMessage(data) {
    // 1. 초기화 응답 처리
    if (data.result && data.result.protocolVersion) {
        log('MCP', '초기화 응답 수신 완료. initialized 알림 전송.');
        sendRpc('notifications/initialized', {});
        
        isInitialized = true;
        updateStatus(true, 'Connected & Ready');
        return;
    }

    // 2. 초기화 완료 알림
    if (data.method === 'notifications/initialized') {
        log('MCP', '서버 세션 초기화 완료.');
    }
    
    // 3. 도구 실행 결과 처리
    if (data.result) {
        log('RESULT', JSON.stringify(data.result));
        
        usageStats.success++; // 성공 카운트 증가
        updateCharts();

        if (data.result.content) {
            data.result.content.forEach(c => {
                if (c.type === 'text') {
                    // 결과 영역 업데이트
                    const resultEl = document.getElementById('execution-result');
                    if (resultEl) {
                        resultEl.innerText = c.text;
                        resultEl.className = 'text-5xl font-bold text-blue-600 animate-bounce'; // 애니메이션 효과 추가
                        
                        // 애니메이션 재실행을 위한 타이머
                        setTimeout(() => {
                            resultEl.className = 'text-5xl font-bold text-blue-600';
                        }, 1000);
                    }
                }
            });
        }
    }
    
    // 4. 에러 처리
    if (data.error) {
        log('ERROR', `RPC 에러: ${data.error.message}`);
        
        usageStats.failure++; // 실패 카운트 증가
        updateCharts();
        
        alert(`오류 발생: ${data.error.message}`);
    }
}

/**
 * JSON-RPC 메시지 전송
 */
async function sendRpc(method, params) {
    requestId++;
    const message = {
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: requestId
    };

    // 알림류 메서드는 id 제외 (스펙에 따라 다를 수 있으나 일반적인 처리)
    if (method.startsWith('notifications/')) {
        delete message.id;
    }

    log('SEND', `메서드 요청: ${method}`);

    try {
        const response = await fetch(postEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error(`HTTP 상태 오류: ${response.status}`);
        }
    } catch (e) {
        log('ERROR', `전송 실패: ${e.message}`);
        usageStats.failure++;
        updateCharts();
    }
}

/**
 * 도구 호출 (Add/Subtract)
 */
async function callTool(toolName) {
    if (!isInitialized) {
        alert("초기화되지 않았습니다. 잠시만 기다려주세요.");
        return;
    }

    const a = parseInt(document.getElementById('inputA').value);
    const b = parseInt(document.getElementById('inputB').value);

    // 통계 카운트 증가
    if (toolName === 'add') usageStats.add++;
    if (toolName === 'subtract') usageStats.subtract++;
    updateCharts();

    await sendRpc("tools/call", {
        name: toolName,
        arguments: { a, b }
    });
}

// ==========================================
// 앱 시작
// ==========================================
// DOM 로드 후 차트 초기화 및 연결 시작
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connect();
});

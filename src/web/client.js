
// ==========================================
// 설정 및 전역 변수
// ==========================================
const SSE_ENDPOINT = '/sse';
let postEndpoint = '/messages'; // 서버로부터 'endpoint' 이벤트를 통해 업데이트됨

let requestId = 0;
let isInitialized = false;

// 통계 데이터 저장용 객체 (도구별/결과별 집계)
const usageStats = {
    // 구조 예시: { "add": { count: 0, success: 0, failure: 0 }, ... }
    tools: {}
};

// 요청 추적용 (ID -> 메타데이터 매핑)
const pendingRequests = new Map();

// 사용 가능한 도구 목록 (init 시 조회)
let availableTools = [];

// ECharts 인스턴스 변수
let usageChart = null;
let statusChart = null;


// ==========================================
// 유틸리티 함수
// ==========================================

function ensureToolStats(toolName) {
    if (!usageStats.tools[toolName]) {
        usageStats.tools[toolName] = { count: 0, success: 0, failure: 0 };
    }
}

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
    document.querySelectorAll('button:not(#btn-dashboard):not(#btn-tester):not(#btn-logs)').forEach(btn => {
        btn.disabled = !enabled;
    });
}

/**
 * 화면 전환 함수
 * @param {string} viewName - 전환할 뷰 이름 ('dashboard', 'tester', 'logs')
 */
function showView(viewName) {
    // 모든 뷰 숨김
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-tester').classList.add('hidden');
    document.getElementById('view-logs').classList.add('hidden');
    
    // 메뉴 버튼 스타일 초기화
    ['dashboard', 'tester', 'logs'].forEach(name => {
        const btn = document.getElementById(`btn-${name}`);
        if(btn) btn.className = 'w-full flex items-center px-4 py-2 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors';
    });
    
    // 선택된 뷰 보이기 및 버튼 활성화 스타일 적용
    const selectedView = document.getElementById(`view-${viewName}`);
    if (selectedView) selectedView.classList.remove('hidden');
    
    const selectedBtn = document.getElementById(`btn-${viewName}`);
    if (selectedBtn) selectedBtn.className = 'w-full flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium text-blue-600';

    if (viewName === 'dashboard') {
        updateCharts();
    } else if (viewName === 'logs') {
        loadLogFiles();
    }
}

// 전역으로 노출
window.showView = showView;
window.callSelectedTool = callSelectedTool;
window.loadLogFiles = loadLogFiles;


// ==========================================
// ECharts 차트 관리
// ==========================================
// (Chart code remains mostly same, slightly compacted)
function initCharts() {
    usageChart = echarts.init(document.getElementById('chart-usage'));
    usageChart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%' },
        series: [{
            name: '도구 사용', type: 'pie', radius: ['40%', '70%'],
            avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' }, emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
            data: []
        }]
    });

    statusChart = echarts.init(document.getElementById('chart-status'));
    statusChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['성공', '실패'], bottom: '0%' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [
            { name: '성공', type: 'bar', stack: 'total', itemStyle: { color: '#4CAF50' }, data: [] },
            { name: '실패', type: 'bar', stack: 'total', itemStyle: { color: '#F44336' }, data: [] }
        ]
    });

    window.addEventListener('resize', () => { usageChart.resize(); statusChart.resize(); });
}

function updateCharts() {
    if (!usageChart || !statusChart) return;
    const tools = Object.keys(usageStats.tools);
    const chartDataUsage = tools.map(t => ({ value: usageStats.tools[t].count, name: t }));
    const chartDataSuccess = tools.map(t => usageStats.tools[t].success);
    const chartDataFailure = tools.map(t => usageStats.tools[t].failure);

    usageChart.setOption({ series: [{ data: chartDataUsage }] });
    statusChart.setOption({
        xAxis: { data: tools },
        series: [{ data: chartDataSuccess }, { data: chartDataFailure }]
    });
    usageChart.resize(); statusChart.resize();
}


// ==========================================
// 통신 로직 (SSE & JSON-RPC)
// ==========================================

function connect() {
    setButtonsEnabled(false);
    updateStatus(false, 'Connecting...');
    log('SYSTEM', '서버(SSE)에 연결을 시도합니다...');
    const source = new EventSource(SSE_ENDPOINT);

    source.onopen = () => { log('SYSTEM', 'SSE 연결이 열렸습니다.'); updateStatus(true, 'Connected (Init)'); };

    source.addEventListener('endpoint', (event) => {
        postEndpoint = event.data;
        log('SYSTEM', `POST EndPoint: ${postEndpoint}`);
        initializeSession();
    });

    source.onmessage = (event) => {
        try { handleMessage(JSON.parse(event.data)); }
        catch (e) { log('ERROR', '메시지 파싱 실패'); }
    };

    source.onerror = (err) => { log('ERROR', '연결 오류. 재연결...'); updateStatus(false, 'Reconnecting...'); };
}

async function initializeSession() {
    log('MCP', '세션 초기화 요청(initialize)...');
    await sendRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { sampling: {} },
        clientInfo: { name: 'mcp-web-dashboard', version: '2.0.0' }
    }, { type: 'initialize' });
}

function handleMessage(data) {
    // 1. 요청 컨텍스트 확인
    const context = data.id ? pendingRequests.get(data.id) : null;
    if (data.id) pendingRequests.delete(data.id);

    // 2. 초기화 응답
    if (context && context.type === 'initialize' && data.result) {
        log('MCP', '초기화 완료. 도구 목록 요청.');
        sendRpc('notifications/initialized', {});
        isInitialized = true;
        updateStatus(true, 'Connected & Ready');
        
        // 도구 목록 가져오기
        sendRpc('tools/list', {}, { type: 'list_tools' });
        return;
    }

    // 3. 도구 목록 응답
    if (context && context.type === 'list_tools' && data.result) {
        log('SYSTEM', '도구 목록 수신 완료.');
        availableTools = data.result.tools || [];
        renderToolSelect();
        return;
    }

    // 4. 도구 실행 결과
    if (context && context.type === 'call_tool') {
        const toolName = context.toolName;
        ensureToolStats(toolName);

        if (data.error) {
            log('ERROR', `RPC 에러 (${toolName}): ${data.error.message}`);
            usageStats.tools[toolName].failure++;
            updateResultView(data.error); // 에러도 JSON으로 표시
        } else {
            log('RESULT', `성공 (${toolName})`);
            usageStats.tools[toolName].success++;
            updateResultView(data.result);
        }
        updateCharts();
    }
}

async function sendRpc(method, params, context = null) {
    requestId++;
    const message = { jsonrpc: "2.0", method, params, id: requestId };
    if (context) pendingRequests.set(requestId, context);
    if (method.startsWith('notifications/')) delete message.id;

    log('SEND', method);
    try {
        await fetch(postEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
    } catch (e) {
        log('ERROR', `전송 실패: ${e.message}`);
    }
}


// ==========================================
// 동적 도구 테스터 로직
// ==========================================

function renderToolSelect() {
    const select = document.getElementById('tool-select');
    select.innerHTML = '<option value="">선택하세요</option>';
    availableTools.forEach(tool => {
        const option = document.createElement('option');
        option.value = tool.name;
        option.textContent = tool.name;
        select.appendChild(option);
    });

    select.onchange = (e) => renderToolInputs(e.target.value);
}

function renderToolInputs(toolName) {
    const container = document.getElementById('dynamic-inputs');
    container.innerHTML = '';
    
    if (!toolName) return;

    const tool = availableTools.find(t => t.name === toolName);
    if (!tool || !tool.inputSchema || !tool.inputSchema.properties) return;

    const props = tool.inputSchema.properties;
    
    Object.keys(props).forEach(key => {
        const prop = props[key];
        const wrapper = document.createElement('div');
        
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.textContent = key + (prop.description ? ` (${prop.description})` : '');
        
        const input = document.createElement('input');
        input.className = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
        input.id = `input-${key}`;
        input.name = key;
        
        if (prop.type === 'integer' || prop.type === 'number') {
            input.type = 'number';
            input.value = 0;
        } else {
            input.type = 'text';
        }
        
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });
}

function updateResultView(resultData) {
    const el = document.getElementById('execution-result');
    el.textContent = JSON.stringify(resultData, null, 2);
    // 애니메이션
    el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
    setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
    }, 500);
}

async function callSelectedTool() {
    const toolSelect = document.getElementById('tool-select');
    const toolName = toolSelect ? toolSelect.value : null;

    if (!toolName) {
        alert('도구를 선택해주세요.');
        return;
    }

    const tool = availableTools.find(t => t.name === toolName);
    const args = {};

    // 입력값 수집
    const inputs = document.getElementById('dynamic-inputs').querySelectorAll('input');
    inputs.forEach(input => {
        const key = input.name;
        const type = tool.inputSchema.properties[key].type;
        
        if (type === 'integer') args[key] = parseInt(input.value);
        else if (type === 'number') args[key] = parseFloat(input.value);
        else args[key] = input.value;
    });

    ensureToolStats(toolName);
    usageStats.tools[toolName].count++;
    updateCharts();

    await sendRpc("tools/call", {
        name: toolName,
        arguments: args
    }, { type: 'call_tool', toolName: toolName });
}


// ==========================================
// 로그 뷰어 로직
// ==========================================

async function loadLogFiles() {
    const listEl = document.getElementById('log-file-list');
    listEl.innerHTML = '<li class="text-center py-4 text-gray-500">로딩 중...</li>';

    try {
        const res = await fetch('/logs');
        const data = await res.json();
        
        if (data.files && data.files.length > 0) {
            listEl.innerHTML = '';
            data.files.forEach(file => {
                const li = document.createElement('li');
                li.className = 'px-3 py-2 hover:bg-blue-50 cursor-pointer rounded text-sm text-gray-600 transition-colors';
                li.textContent = file;
                li.onclick = () => loadLogContent(file);
                listEl.appendChild(li);
            });
        } else {
            listEl.innerHTML = '<li class="text-center py-4 text-gray-400">파일이 없습니다.</li>';
        }
    } catch (e) {
        listEl.innerHTML = `<li class="text-center py-4 text-red-500">로드 실패: ${e.message}</li>`;
    }
}

async function loadLogContent(filename) {
    const contentEl = document.getElementById('log-file-content');
    const titleEl = document.getElementById('current-log-filename');
    
    titleEl.textContent = filename;
    contentEl.textContent = '로딩 중...';
    
    try {
        const res = await fetch(`/logs/${filename}`);
        const data = await res.json();
        
        if (data.content) {
            contentEl.textContent = data.content;
            // 스크롤 최하단으로
            contentEl.scrollTop = contentEl.scrollHeight;
        } else {
            contentEl.textContent = '내용을 불러올 수 없습니다.';
        }
    } catch (e) {
        contentEl.textContent = `오류 발생: ${e.message}`;
    }
}


// ==========================================
// 앱 시작
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connect();
});

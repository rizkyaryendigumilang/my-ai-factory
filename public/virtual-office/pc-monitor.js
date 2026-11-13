// PC Performance Monitor — polls metrics from Windows PC / VPS
(function() {
    const POLL_INTERVAL = 1500;
    const HISTORY_LEN = 60; // 60 data points

    // History arrays
    const history = {
        cpu: [],
        ram: [],
        gpu: {} // gpu[index] = []
    };

    let _open = false;
    let _pollTimer = null;
    let _online = false;

    function safeTimeoutSignal(ms) {
        try {
            if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                return AbortSignal.timeout(ms);
            }
        } catch (e) {}
        try {
            const controller = new AbortController();
            setTimeout(function() { controller.abort(); }, ms);
            return controller.signal;
        } catch (e) {
            return undefined;
        }
    }

    function getMetricsUrl() {
        return window.location.pathname.startsWith('/ai-factory') ? '/ai-factory/pc-metrics' : '/pc-metrics';
    }

    window.togglePcMonitor = function() {
        const body = document.getElementById('pc-monitor-body');
        const arrow = document.getElementById('pc-toggle-arrow');
        _open = body ? (body.style.display === 'none' || !body.style.display) : !_open;
        if (body) body.style.display = _open ? 'block' : 'none';
        if (arrow) arrow.textContent = _open ? '▼' : '▶';
        if (_open) {
            startPolling();
        } else {
            stopPolling();
        }
    };

    function startPolling() {
        fetchMetrics();
        if (!_pollTimer) {
            _pollTimer = setInterval(fetchMetrics, POLL_INTERVAL);
        }
    }

    function stopPolling() {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = null;
    }

    window.startPcPolling = startPolling;
    window.stopPcPolling = stopPolling;

    async function fetchMetrics() {
        try {
            const url = getMetricsUrl();
            const signal = safeTimeoutSignal(5000);
            const opts = signal ? { signal: signal } : {};
            const res = await fetch(url, opts);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            _online = true;
            updateUI(data);
        } catch(e) {
            _online = false;
            setStatusDot(false);
        }
    }

    function setStatusDot(online) {
        const dot = document.getElementById('pc-status-dot');
        if (!dot) return;
        dot.className = 'pc-dot ' + (online ? 'online' : 'offline');
        dot.title = online ? 'Connected' : 'Offline';
    }

    function pushHistory(arr, val) {
        arr.push(val);
        if (arr.length > HISTORY_LEN) arr.shift();
    }

    function updateUI(data) {
        setStatusDot(true);

        // CPU
        const cpuPct = data.cpu?.percent ?? 0;
        pushHistory(history.cpu, cpuPct);
        const cpuVal = document.getElementById('pc-cpu-val');
        if (cpuVal) cpuVal.textContent = cpuPct.toFixed(0) + '%';
        const cpuBar = document.getElementById('pc-cpu-bar');
        if (cpuBar) cpuBar.style.width = cpuPct + '%';
        setBarColor('pc-cpu-bar', cpuPct);
        const cpuDetail = document.getElementById('pc-cpu-detail');
        if (cpuDetail) {
            cpuDetail.textContent =
                `${data.cpu?.threads || '?'} threads / ${Math.round(data.cpu?.freqMHz || 0)} MHz`;
        }
        drawGraph('pc-cpu-graph', history.cpu, '#4fc3f7');

        // RAM
        const ramPct = data.memory?.percent ?? 0;
        pushHistory(history.ram, ramPct);
        const ramVal = document.getElementById('pc-ram-val');
        if (ramVal) ramVal.textContent = ramPct.toFixed(0) + '%';
        const ramBar = document.getElementById('pc-ram-bar');
        if (ramBar) ramBar.style.width = ramPct + '%';
        setBarColor('pc-ram-bar', ramPct);
        const ramDetail = document.getElementById('pc-ram-detail');
        if (ramDetail) {
            ramDetail.textContent =
                `${data.memory?.usedGB || '?'} / ${data.memory?.totalGB || '?'} GB`;
        }
        drawGraph('pc-ram-graph', history.ram, '#ce93d8');

        // GPUs
        const container = document.getElementById('pc-gpus-container');
        if (!container) return;
        const gpus = data.gpus || [];
        
        // Build GPU sections dynamically
        gpus.forEach((gpu, i) => {
            let section = document.getElementById('pc-gpu-' + i);
            if (!section) {
                section = document.createElement('div');
                section.id = 'pc-gpu-' + i;
                section.className = 'pc-metric-row';
                section.innerHTML = `
                    <div class="pc-metric">
                        <div class="pc-metric-header">
                            <span class="pc-label">GPU ${i}</span>
                            <span class="pc-value" id="pc-gpu${i}-val">--%</span>
                        </div>
                        <div class="pc-bar-track"><div class="pc-bar gpu" id="pc-gpu${i}-bar" style="width:0%"></div></div>
                        <canvas id="pc-gpu${i}-graph" class="pc-graph" width="260" height="40"></canvas>
                        <div class="pc-detail" id="pc-gpu${i}-detail">--</div>
                        <div class="pc-detail" id="pc-gpu${i}-detail2">--</div>
                    </div>
                `;
                container.appendChild(section);
            }
            if (!history.gpu[i]) history.gpu[i] = [];
            
            const util = gpu.utilization ?? 0;
            pushHistory(history.gpu[i], util);
            
            const valEl = document.getElementById(`pc-gpu${i}-val`);
            if (valEl) valEl.textContent = util.toFixed(0) + '%';
            const barEl = document.getElementById(`pc-gpu${i}-bar`);
            if (barEl) barEl.style.width = util + '%';
            setBarColor(`pc-gpu${i}-bar`, util);
            
            const vramUsed = (gpu.memoryUsedMB / 1024).toFixed(1);
            const vramTotal = (gpu.memoryTotalMB / 1024).toFixed(1);
            const detail1 = document.getElementById(`pc-gpu${i}-detail`);
            if (detail1) {
                detail1.textContent = `${gpu.name || 'GPU'} · ${vramUsed}/${vramTotal} GB`;
            }
            const powerStr = gpu.powerW > 0 ? ` · ${gpu.powerW}W / ${gpu.powerLimitW}W` : '';
            const detail2 = document.getElementById(`pc-gpu${i}-detail2`);
            if (detail2) {
                detail2.textContent = `${gpu.tempC || '?'}°C${powerStr}`;
            }
            
            const colors = ['#66bb6a', '#ffb74d'];
            drawGraph(`pc-gpu${i}-graph`, history.gpu[i], colors[i % colors.length]);
        });

        // Total GPU power summary
        let totalPower = 0, totalLimit = 0;
        gpus.forEach(gpu => {
            totalPower += (gpu.powerW || 0);
            totalLimit += (gpu.powerLimitW || 0);
        });
        let powerSummary = document.getElementById('pc-power-summary');
        if (!powerSummary && totalPower > 0) {
            powerSummary = document.createElement('div');
            powerSummary.id = 'pc-power-summary';
            powerSummary.className = 'pc-power-summary';
            container.parentElement.appendChild(powerSummary);
        }
        if (powerSummary && totalPower > 0) {
            powerSummary.textContent = `⚡ Total GPU Power: ${totalPower.toFixed(0)}W / ${totalLimit.toFixed(0)}W`;
        }
    }

    function setBarColor(barId, pct) {
        const bar = document.getElementById(barId);
        if (!bar) return;
        if (pct > 90) bar.style.background = 'linear-gradient(90deg, #f44336, #e53935)';
        else if (pct > 70) bar.style.background = 'linear-gradient(90deg, #ff9800, #f57c00)';
        else bar.style.background = '';
    }

    function drawGraph(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // Background grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let y = 0; y <= h; y += h/4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        if (data.length < 2) return;
        
        // Fill area
        const step = w / (HISTORY_LEN - 1);
        const offset = (HISTORY_LEN - data.length) * step;
        
        ctx.beginPath();
        ctx.moveTo(offset, h);
        data.forEach((val, i) => {
            const x = offset + i * step;
            const y = h - (val / 100) * h;
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(offset + (data.length - 1) * step, h);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '40');
        grad.addColorStop(1, color + '08');
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Line
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = offset + i * step;
            const y = h - (val / 100) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Always pre-fetch once on script load so data is ready instantly
    fetchMetrics();

    // Auto-start polling if pcMetrics feature is enabled in vo-config
    fetch('/vo-config').then(function(r) { return r.json(); }).then(function(cfg) {
        if (cfg && cfg.features && cfg.features.pcMetrics === true) {
            const body = document.getElementById('pc-monitor-body');
            if (body && body.style.display !== 'none') {
                startPolling();
            }
        }
    }).catch(function() {});
})();

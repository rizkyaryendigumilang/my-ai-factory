// API Usage Monitor — shows real quota data from API/OAuth providers
(function() {
    const POLL_INTERVAL = 30000;

    const PROVIDER_COLORS = {
        anthropic: '#d4a0ff',
        openai: '#74d680',
        'openai-codex': '#74d680',
        google: '#4fc3f7',
        'github-copilot': '#f0f0f0',
        deepseek: '#80deea',
        groq: '#ef9a9a',
        minimax: '#ffab91',
        'z.ai': '#ce93d8',
        antigravity: '#a5d6a7',
    };
    const DEFAULT_COLOR = '#aaa';

    let _open = false;
    let _pollTimer = null;

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

    let _activeUsageUrl = null;

    function getCandidateUrls() {
        const list = [];
        if (_activeUsageUrl) list.push(_activeUsageUrl);
        const isAiFactory = window.location.pathname.indexOf('/ai-factory') !== -1 ||
            (document.referrer && document.referrer.indexOf('/ai-factory') !== -1);
        if (isAiFactory) {
            list.push('/ai-factory/api-usage');
            list.push('/api-usage');
        } else {
            list.push('/api-usage');
            list.push('/ai-factory/api-usage');
        }
        return Array.from(new Set(list));
    }

    window.toggleApiUsage = function() {
        const body = document.getElementById('api-usage-body');
        const arrow = document.getElementById('api-toggle-arrow');
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
        fetchUsage();
        if (!_pollTimer) {
            _pollTimer = setInterval(fetchUsage, POLL_INTERVAL);
        }
    }

    function stopPolling() {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = null;
    }

    window.startApiUsagePolling = startPolling;
    window.stopApiUsagePolling = stopPolling;

    async function fetchUsage() {
        const candidates = getCandidateUrls();
        let success = false;

        for (const url of candidates) {
            try {
                const signal = safeTimeoutSignal(6000);
                const opts = signal ? { signal: signal } : {};
                const res = await fetch(url, opts);
                if (!res.ok) continue;
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) continue; // Skip HTML responses
                const data = await res.json();
                if (data && (data.providers || data.error)) {
                    _activeUsageUrl = url;
                    if (data.error && !data.providers?.length) {
                        setDot(false);
                        renderEmpty(data.error);
                        success = true;
                        break;
                    }
                    setDot(true);
                    render(data);
                    success = true;
                    break;
                }
            } catch (err) {
                // Try next candidate
            }
        }

        if (!success) {
            setDot(false);
            renderEmpty('Connection error');
        }
    }

    function setDot(ok) {
        const d = document.getElementById('api-status-dot');
        if (d) {
            d.className = 'pc-dot ' + (ok ? 'online' : 'offline');
            d.title = ok ? 'Active' : 'Offline / Error';
        }
    }

    function renderEmpty(msg) {
        const c = document.getElementById('api-usage-cards');
        if (c) c.innerHTML = `<div class="pc-detail" style="text-align:center;padding:10px;opacity:0.5">${msg || 'No providers'}</div>`;
    }

    function render(data) {
        const c = document.getElementById('api-usage-cards');
        if (!c) return;

        const providers = data.providers || [];
        if (!providers.length) {
            renderEmpty('No API providers found');
            return;
        }

        let html = '';
        for (const p of providers) {
            const provName = p.provider || p.name || 'unknown';
            const displayName = (p.displayName || provName).toUpperCase();
            const color = PROVIDER_COLORS[provName] || DEFAULT_COLOR;
            const hasUsage = p.usage != null && typeof p.usage === 'object';
            const hasError = !!p.error;

            let authLabel = p.plan || p.authType || p.type || '';
            if (authLabel === 'oauth') authLabel = 'OAuth';
            else if (authLabel === 'api_key') authLabel = 'API Key';
            else if (authLabel === 'token') authLabel = 'Token';
            let authColor = color;

            html += `<div class="pc-metric-row">`;

            html += `<div class="pc-metric-header">
                <span class="pc-label" style="color:${color}">${displayName}</span>`;
            if (authLabel) {
                html += `<span class="api-auth-tag" style="border-color:${authColor}60; color:${authColor};font-size:8px">${authLabel}</span>`;
            }
            html += `</div>`;

            if (hasError) {
                html += `<div class="api-warning error" style="font-size:8px;margin:2px 0">${p.error}</div>`;
            }
            if (p.message) {
                html += `<div class="pc-detail" style="margin-top:4px;opacity:0.7">${escapeHtml(p.message)}</div>`;
            }

            if (hasUsage) {
                const u = p.usage;

                if (u.dailyPctLeft != null) {
                    const used = 100 - u.dailyPctLeft;
                    html += buildBar(u.dailyWindow || 'DAY', u.dailyPctLeft, used, color);
                    if (u.dailyTimeLeft) html += `<div class="pc-detail">${u.dailyTimeLeft} until reset</div>`;
                }

                if (u.weeklyPctLeft != null) {
                    const used = 100 - u.weeklyPctLeft;
                    html += buildBar('WEEK', u.weeklyPctLeft, used, color);
                    if (u.weeklyTimeLeft) html += `<div class="pc-detail">${u.weeklyTimeLeft} until reset</div>`;
                }

                if (u.monthlyPctLeft != null) {
                    const used = 100 - u.monthlyPctLeft;
                    html += buildBar('MONTH', u.monthlyPctLeft, used, color);
                    if (u.monthlyTimeLeft) html += `<div class="pc-detail">${u.monthlyTimeLeft} until reset</div>`;
                }

                for (const key of Object.keys(u)) {
                    if (key.endsWith('PctLeft') && !['dailyPctLeft','weeklyPctLeft','monthlyPctLeft'].includes(key)) {
                        const label = key.replace('PctLeft','').toUpperCase();
                        const left = u[key];
                        const used = 100 - left;
                        const timeKey = key.replace('PctLeft','TimeLeft');
                        html += buildBar(label, left, used, color);
                        if (u[timeKey]) html += `<div class="pc-detail">${u[timeKey]} until reset</div>`;
                    }
                }

                if (u.dailyPctLeft === 0) html += `<div class="api-warning exhausted">DAILY LIMIT REACHED</div>`;
                if (u.weeklyPctLeft === 0) html += `<div class="api-warning exhausted">WEEKLY LIMIT REACHED</div>`;
            } else if (!hasError) {
                const fallback = p.status === 'configured'
                    ? 'Configured - no quota windows available'
                    : 'No quota windows available';
                html += `<div class="pc-detail" style="margin-top:4px;opacity:0.55">${fallback}</div>`;
            }

            html += `</div>`;
        }

        const age = data.ageSeconds;
        let freshLabel = '';
        if (age != null) {
            if (age < 60) freshLabel = 'just now';
            else if (age < 3600) freshLabel = Math.round(age / 60) + 'm ago';
            else freshLabel = Math.round(age / 3600) + 'h ago';
        }
        if (freshLabel) {
            html += `<div class="pc-detail" style="text-align:right;opacity:0.3;margin-top:6px;font-size:7px">Updated ${freshLabel}</div>`;
        }

        c.innerHTML = html || '<div class="pc-detail" style="text-align:center;padding:10px">No providers</div>';
    }

    function buildBar(label, pctLeft, usedPct, color) {
        let html = `<div class="pc-metric-header" style="margin-top:4px">
            <span class="pc-label">${label}</span>
            <span class="pc-value" style="color:${getValColor(usedPct)}">${Math.round(pctLeft)}% left</span>
        </div>`;
        html += `<div class="pc-bar-track"><div class="pc-bar" style="width:${usedPct}%;background:${getBarGrad(usedPct, color)}"></div></div>`;
        return html;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function(ch) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
        });
    }

    function getValColor(usedPct) {
        if (usedPct > 90) return '#f44336';
        if (usedPct > 70) return '#ff9800';
        return '#fff';
    }
    function getBarGrad(usedPct, baseColor) {
        if (usedPct > 90) return 'linear-gradient(90deg, #f44336, #e53935)';
        if (usedPct > 70) return 'linear-gradient(90deg, #ff9800, #f57c00)';
        return `linear-gradient(90deg, ${baseColor}, ${baseColor}cc)`;
    }

    // Pre-fetch in background so data is ready when opened
    fetchUsage();
})();

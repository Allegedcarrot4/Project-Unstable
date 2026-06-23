export function errorTemplate(trace: string, fetchedURL: string) {
	const script = `
        window.errorDetails = {
            trace: ${JSON.stringify(trace)},
            url: ${JSON.stringify(fetchedURL)},
            proxy: 'Scramjet',
            hostname: ${JSON.stringify(location.hostname)},
            version: ${JSON.stringify((globalThis as any).$scramjetVersion?.version || "2.0.2-alpha")},
            build: ${JSON.stringify((globalThis as any).$scramjetVersion?.build || "unknown")}
        };
    `;

	return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Something went wrong</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg: #0d0d0d;
                    --card-bg: rgba(17, 17, 17, 0.5);
                    --border: #1e1e1e;
                    --text: #e0e0e0;
                    --text-muted: rgba(255, 255, 255, 0.3);
                    --red: #ef4444;
                    --green: #10b981;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    background-color: var(--bg);
                    color: var(--text);
                    font-family: 'Space Grotesk', sans-serif;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 3rem 0;
                    overflow-y: auto;
                }
                .header {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 2.5rem;
                }
                .header-title {
                    font-size: 1.75rem;
                    font-weight: 500;
                    letter-spacing: -0.02em;
                    color: var(--text);
                }
                .container {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 1.5rem;
                    max-width: 1100px;
                    width: 100%;
                    margin: 0 auto;
                    padding: 0 1.5rem;
                    flex: 1;
                }
                @media (max-width: 768px) {
                    .container {
                        grid-template-columns: 1fr;
                    }
                }
                .card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 2px;
                    padding: 1.5rem;
                }
                .left-card {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    margin-bottom: 1.5rem;
                }
                .left-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .badge {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--border);
                    border-radius: 2px;
                    padding: 0.35rem 0.75rem;
                    font-size: 0.7rem;
                    color: var(--text);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 500;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                .btn-group {
                    display: flex;
                    gap: 0.5rem;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.55rem 1rem;
                    border-radius: 2px;
                    font-size: 0.65rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                    border: 1px solid var(--border);
                    background: none;
                    color: var(--text-muted);
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }
                .btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: var(--text);
                }
                .btn-primary {
                    border-color: rgba(255,255,255,0.15);
                    color: rgba(255,255,255,0.6);
                }
                .btn-primary:hover {
                    border-color: rgba(255,255,255,0.25);
                    color: var(--text);
                }
                .description {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    line-height: 1.5;
                }
                .details-box {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border);
                    border-radius: 2px;
                    padding: 1rem;
                }
                .details-box-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .details-content {
                    font-family: ui-monospace, monospace;
                    font-size: 0.75rem;
                    color: #cbd5e1;
                    white-space: pre-wrap;
                    word-break: break-all;
                    line-height: 1.5;
                    background: transparent;
                    border: none;
                    outline: none;
                    width: 100%;
                    resize: none;
                    height: 80px;
                }
                .btn-row-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                }
                .btn-row-3 .btn {
                    font-size: 0.75rem;
                    font-weight: 500;
                    padding: 0.75rem;
                    text-transform: none;
                    letter-spacing: 0;
                    color: var(--text);
                }
                .sidebar-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .sidebar-title {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: var(--text-muted);
                    margin-bottom: 0.75rem;
                    font-weight: 600;
                }
                .action-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .action-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    padding: 0.65rem 0.75rem;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    font-family: inherit;
                    color: var(--text);
                    font-size: 0.75rem;
                    transition: all 0.2s;
                }
                .action-item:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.12);
                }
                .action-item-left {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: rgba(255,255,255,0.7);
                }
                .shortcut-label {
                    font-size: 0.6rem;
                    color: var(--text-muted);
                    background: rgba(255, 255, 255, 0.03);
                    padding: 0.15rem 0.35rem;
                    border-radius: 2px;
                    border: 1px solid var(--border);
                    font-family: inherit;
                }
                .status-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .status-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--red);
                }
                .status-dot.online {
                    background: var(--green);
                }
                .status-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }
                .status-block {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border);
                    border-radius: 2px;
                    padding: 0.75rem;
                }
                .status-block-title {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.25rem;
                }
                .status-block-value {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text);
                }
                .tech-details {
                    grid-column: 1;
                    margin-top: 0.5rem;
                }
                .accordion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 500;
                    transition: all 0.2s;
                    user-select: none;
                }
                .accordion-header:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.12);
                }
                .accordion-header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: rgba(255, 255, 255, 0.7);
                }
                .accordion-content {
                    display: none;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid var(--border);
                    border-top: none;
                    border-bottom-left-radius: 2px;
                    border-bottom-right-radius: 2px;
                    overflow-x: auto;
                    max-height: 250px;
                }
                .accordion-content.open {
                    display: block;
                }
                .accordion-content pre {
                    font-family: ui-monospace, monospace;
                    font-size: 0.7rem;
                    color: #cbd5e1;
                    white-space: pre-wrap;
                    word-break: break-all;
                    line-height: 1.4;
                }
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    max-width: 1100px;
                    width: 100%;
                    margin: 2.5rem auto 0;
                    padding: 0 1.5rem;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    border-top: 1px solid rgba(255,255,255,0.03);
                    padding-top: 1rem;
                }
                .footer a {
                    color: var(--text-muted);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .footer a:hover {
                    color: var(--text);
                }
                .footer-sep {
                    margin: 0 0.4rem;
                    color: rgba(255,255,255,0.15);
                }
            </style>
        </head>
        <body>
            <div>
                <div class="header">
                    <h1 class="header-title">Something went wrong</h1>
                </div>

                <div class="container">
                    <div>
                        <div class="card left-card">
                            <div class="left-card-header">
                                <div class="badge">
                                    <span id="proxyBadgeText">Unexpected error</span>
                                </div>
                                <div class="btn-group">
                                    <button class="btn btn-retry">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                        Retry
                                    </button>
                                    <button class="btn btn-primary btn-report">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                        Report issue
                                    </button>
                                </div>
                            </div>

                            <p class="description">We hit a snag while loading this page. You can retry, go back, or explore other sections below.</p>

                            <div class="details-box">
                                <div class="details-box-header">
                                    <span>Error Details</span>
                                    <button class="btn btn-copy" style="padding: 0.25rem 0.5rem; font-size: 0.6rem; border-radius: 2px;">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        Copy
                                    </button>
                                </div>
                                <textarea class="details-content" id="errorDetailsArea" readonly></textarea>
                            </div>

                            <div class="btn-row-3">
                                <button class="btn btn-newtab">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                    New Tab
                                </button>
                                <button class="btn btn-settings">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                    Settings
                                </button>
                                <button class="btn btn-games">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="3"/></svg>
                                    Games
                                </button>
                            </div>
                        </div>

                        <div class="tech-details">
                            <div class="accordion-header" id="accordionHeader">
                                <div class="accordion-header-left">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    <span>Technical details</span>
                                </div>
                                <svg id="techChevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <div class="accordion-content open" id="accordionContent" style="display: block;">
                                <pre id="techDetailsPre"></pre>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar-cards">
                        <div>
                            <h3 class="sidebar-title">Quick actions</h3>
                            <div class="action-list">
                                <button class="action-item btn-back">
                                    <div class="action-item-left">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                                        Go back
                                    </div>
                                    <span class="shortcut-label">Alt + &larr;</span>
                                </button>
                                <button class="action-item btn-home">
                                    <div class="action-item-left">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                        Home
                                    </div>
                                    <span class="shortcut-label">Alt + T</span>
                                </button>
                                <button class="action-item btn-clear">
                                    <div class="action-item-left">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                                        Clear cache
                                    </div>
                                    <span class="shortcut-label">Alt + K</span>
                                </button>
                            </div>
                        </div>

                        <div class="card" style="padding: 1.25rem;">
                            <h3 class="sidebar-title" style="margin-bottom: 0.75rem;">Status</h3>
                            <div class="status-row">
                                <div class="status-badge">
                                    <div class="status-dot" id="clientStatusDot"></div>
                                    <span id="clientStatusText">Checking...</span>
                                </div>
                                <button class="btn btn-status-refresh" style="padding: 0.3rem 0.5rem; font-size: 0.65rem; border-radius: 4px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                    Refresh
                                </button>
                            </div>

                            <div class="status-grid">
                                <div class="status-block">
                                    <div class="status-block-title">Latency</div>
                                    <div class="status-block-value" id="statusLatency">--</div>
                                </div>
                                <div class="status-block">
                                    <div class="status-block-title">Backend</div>
                                    <div class="status-block-value" id="statusBackend">--</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div>
                    Need help? <a href="https://github.com/Allegedcarrot4/Project-Unstable/issues" target="_blank">Submit an issue</a>
                </div>
                <div>
                    <a href="#" class="btn-newtab-footer">New Tab</a>
                    <span class="footer-sep">\\</span>
                    <a href="#" class="btn-settings-footer">Settings</a>
                </div>
            </div>

            <script src="data:application/javascript,${encodeURIComponent(script)}"></script>
            <script>
                (function() {
                    const data = window.errorDetails || {
                        trace: 'Unknown error occurred',
                        url: location.href,
                        proxy: 'Unknown',
                        hostname: location.hostname,
                        version: 'unknown',
                        build: 'unknown'
                    };

                    const proxyBadgeText = document.getElementById('proxyBadgeText');
                    proxyBadgeText.textContent = data.proxy + ' Error';

                    const timestampStr = new Date().toISOString();
                    const detailsArea = document.getElementById('errorDetailsArea');
                    detailsArea.value = 'Error: ' + data.trace + '\\nTimestamp: ' + timestampStr;

                    const techPre = document.getElementById('techDetailsPre');
                    techPre.textContent = 'Error Report - ' + timestampStr + '\\n\\n' +
                        'Message: ' + data.trace + '\\n' +
                        'Proxy: ' + data.proxy + '\\n' +
                        'URL: ' + data.url + '\\n' +
                        'Hostname: ' + data.hostname + '\\n' +
                        'Version: ' + data.version + ' (build ' + data.build + ')\\n' +
                        'User Agent: ' + navigator.userAgent;

                    async function copyToClipboard(text, btn) {
                        try {
                            await navigator.clipboard.writeText(text);
                            const originalHTML = btn.innerHTML;
                            btn.textContent = '✓ Copied';
                            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                        } catch(e) {
                            console.error('Copy failed', e);
                        }
                    }

                    document.querySelectorAll('.btn-copy').forEach(btn => {
                        btn.addEventListener('click', () => copyToClipboard(detailsArea.value, btn));
                    });

                    document.querySelectorAll('.btn-report').forEach(btn => {
                        btn.addEventListener('click', () => {
                            window.open('https://github.com/Allegedcarrot4/Project-Unstable/issues', '_blank');
                        });
                    });

                    document.querySelectorAll('.btn-retry').forEach(btn => {
                        btn.addEventListener('click', () => {
                            location.reload();
                        });
                    });

                    const accordionHeader = document.getElementById('accordionHeader');
                    const accordionContent = document.getElementById('accordionContent');
                    const techChevron = document.getElementById('techChevron');
                    accordionHeader.addEventListener('click', () => {
                        const isOpen = accordionContent.classList.toggle('open');
                        techChevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                    });

                    const navTo = (path) => {
                        try {
                            if (window.parent && window.parent !== window) {
                                window.parent.location.href = path;
                            } else {
                                window.location.href = path;
                            }
                        } catch(e) {
                            window.location.href = path;
                        }
                    };

                    document.querySelectorAll('.btn-newtab, .btn-newtab-footer').forEach(btn => {
                        btn.addEventListener('click', (e) => { e.preventDefault(); window.parent.postMessage({ type: "unstable-navigate", action: "newtab" }, "*"); });
                    });
                    document.querySelectorAll('.btn-settings, .btn-settings-footer').forEach(btn => {
                        btn.addEventListener('click', (e) => { e.preventDefault(); window.parent.postMessage({ type: "unstable-navigate", action: "navigate", page: "settings" }, "*"); });
                    });
                    document.querySelectorAll('.btn-games').forEach(btn => {
                        btn.addEventListener('click', () => { window.parent.postMessage({ type: "unstable-navigate", action: "navigate", page: "games" }, "*"); });
                    });
                    document.querySelectorAll('.btn-home').forEach(btn => {
                        btn.addEventListener('click', () => { window.parent.location.href = '/'; });
                    });
                    document.querySelectorAll('.btn-back').forEach(btn => {
                        btn.addEventListener('click', () => {
                            try {
                                if (window.parent && window.parent.history) {
                                    window.parent.history.back();
                                } else {
                                    window.history.back();
                                }
                            } catch(e) {
                                window.history.back();
                            }
                        });
                    });

                    document.querySelectorAll('.btn-clear').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            try {
                                if ('caches' in window) {
                                    const keys = await caches.keys();
                                    await Promise.all(keys.map(k => caches.delete(k)));
                                }
                                localStorage.clear();
                                sessionStorage.clear();
                                try {
                                    if (window.parent && window.parent !== window) {
                                        window.parent.location.reload();
                                    } else {
                                        window.location.reload();
                                    }
                                } catch(e) {
                                    window.location.reload();
                                }
                            } catch(e) {
                                console.error('Clear cache failed', e);
                            }
                        });
                    });

                    const clientStatusDot = document.getElementById('clientStatusDot');
                    const clientStatusText = document.getElementById('clientStatusText');
                    const statusLatency = document.getElementById('statusLatency');
                    const statusBackend = document.getElementById('statusBackend');

                    function updateClientStatus() {
                        const online = navigator.onLine;
                        clientStatusText.textContent = online ? 'Client online' : 'Client offline';
                        clientStatusDot.className = 'status-dot ' + (online ? 'online' : '');
                    }

                    async function checkBackend() {
                        const start = performance.now();
                        try {
                            const res = await fetch('/api/healthz', { method: 'GET', signal: AbortSignal.timeout(5000) });
                            const latency = Math.round(performance.now() - start);
                            statusLatency.textContent = latency + 'ms';
                            statusBackend.textContent = res.ok ? 'Online' : 'Offline';
                        } catch(e) {
                            statusLatency.textContent = '--';
                            statusBackend.textContent = 'Offline';
                        }
                    }

                    async function runChecks() {
                        updateClientStatus();
                        await checkBackend();
                    }

                    window.addEventListener('online', updateClientStatus);
                    window.addEventListener('offline', updateClientStatus);
                    document.querySelectorAll('.btn-status-refresh').forEach(btn => {
                        btn.addEventListener('click', () => runChecks());
                    });

                    runChecks();

                    window.addEventListener('keydown', (e) => {
                        const ae = document.activeElement;
                        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
                        
                        if (e.altKey && e.key === 'ArrowLeft') {
                            e.preventDefault();
                            document.querySelector('.btn-back')?.click();
                        }
                        if (e.altKey && (e.key === 't' || e.key === 'T')) {
                            e.preventDefault();
                            document.querySelector('.btn-home')?.click();
                        }
                        if (e.altKey && (e.key === 'k' || e.key === 'K')) {
                            e.preventDefault();
                            document.querySelector('.btn-clear')?.click();
                        }
                        if (e.altKey && (e.key === 'g' || e.key === 'G')) {
                            e.preventDefault();
                            document.querySelector('.btn-games')?.click();
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
}

export function renderError(err: unknown, fetchedURL: string) {
	const headers: Record<string, string> = {
		"content-type": "text/html",
	};
	if (crossOriginIsolated) {
		headers["Cross-Origin-Embedder-Policy"] = "require-corp";
	}

	return new Response(errorTemplate(String(err), fetchedURL), {
		status: 500,
		headers: headers,
	});
}

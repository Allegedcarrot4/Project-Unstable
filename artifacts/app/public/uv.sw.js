"use strict";(()=>{var h=self.Ultraviolet,O=["cross-origin-embedder-policy","cross-origin-opener-policy","cross-origin-resource-policy","content-security-policy","content-security-policy-report-only","expect-ct","feature-policy","origin-isolation","strict-transport-security","upgrade-insecure-requests","x-content-type-options","x-download-options","x-frame-options","x-permitted-cross-domain-policies","x-powered-by","x-xss-protection","service-worker","service-worker-allowed"],C=["GET","HEAD"],g=class extends h.EventEmitter{constructor(e=__uv$config){super(),e.prefix||(e.prefix="/service/"),this.config=e,this.bareClient=new h.BareClient}route({request:e}){return!!e.url.startsWith(location.origin+this.config.prefix)}async fetch({request:e}){let s;try{if(!e.url.startsWith(location.origin+this.config.prefix))return await fetch(e);let t=new h(this.config);typeof this.config.construct=="function"&&this.config.construct(t,"service");let w=await t.cookie.db();t.meta.origin=location.origin,t.meta.base=t.meta.url=new URL(t.sourceUrl(e.url));let o=new v(e,t,C.includes(e.method.toUpperCase())?null:await e.blob());if(t.meta.url.protocol==="blob:"&&(o.blob=!0,o.base=o.url=new URL(o.url.pathname)),e.referrer&&e.referrer.startsWith(location.origin)){let i=new URL(t.sourceUrl(e.referrer));(o.headers.origin||t.meta.url.origin!==i.origin&&e.mode==="cors")&&(o.headers.origin=i.origin),o.headers.referer=i.href}let f=await t.cookie.getCookies(w)||[],x=t.cookie.serialize(f,t.meta,!1);o.headers["user-agent"]=navigator.userAgent,x&&(o.headers.cookie=x);let p=new u(o,null,null);if(this.emit("request",p),p.intercepted)return p.returnValue;s=o.blob?"blob:"+location.origin+o.url.pathname:o.url;let c=await this.bareClient.fetch(s,{headers:o.headers,method:o.method,body:o.body,credentials:o.credentials,mode:o.mode,cache:o.cache,redirect:o.redirect}),r=new y(o,c),l=new u(r,null,null);if(this.emit("beforemod",l),l.intercepted)return l.returnValue;for(let i of O)r.headers[i]&&delete r.headers[i];if(r.headers.location&&(r.headers.location=t.rewriteUrl(r.headers.location)),["document","iframe"].includes(e.destination)){let i=r.getHeader("content-disposition");if(!/\s*?((inline|attachment);\s*?)filename=/i.test(i)){let n=/^\s*?attachment/i.test(i)?"attachment":"inline",[m]=new URL(c.finalURL).pathname.split("/").slice(-1);r.headers["content-disposition"]=`${n}; filename=${JSON.stringify(m)}`}}if(r.headers["set-cookie"]&&(Promise.resolve(t.cookie.setCookies(r.headers["set-cookie"],w,t.meta)).then(()=>{self.clients.matchAll().then(function(i){i.forEach(function(n){n.postMessage({msg:"updateCookies",url:t.meta.url.href})})})}),delete r.headers["set-cookie"]),r.body)switch(e.destination){case"script":r.body=t.js.rewrite(await c.text());break;case"worker":{let i=[t.bundleScript,t.clientScript,t.configScript,t.handlerScript].map(n=>JSON.stringify(n)).join(",");r.body=`if (!self.__uv) {
                                ${t.createJsInject(t.cookie.serialize(f,t.meta,!0),e.referrer)}
                            importScripts(${i});
                            }
`,r.body+=t.js.rewrite(await c.text())}break;case"style":r.body=t.rewriteCSS(await c.text());break;case"iframe":case"document":if(r.getHeader("content-type")&&r.getHeader("content-type").startsWith("text/html")){let i=await c.text();if(Array.isArray(this.config.inject)){let n=i.indexOf("<head>"),m=i.indexOf("<HEAD>"),b=i.indexOf("<body>"),k=i.indexOf("<BODY>"),S=new URL(s),U=this.config.inject;for(let d of U)new RegExp(d.host).test(S.host)&&(d.injectTo==="head"?(n!==-1||m!==-1)&&(i=i.slice(0,n)+`${d.html}`+i.slice(n)):d.injectTo==="body"&&(b!==-1||k!==-1)&&(i=i.slice(0,b)+`${d.html}`+i.slice(b)))}r.body=t.rewriteHtml(i,{document:!0,injectHead:t.createHtmlInject(t.handlerScript,t.bundleScript,t.clientScript,t.configScript,t.cookie.serialize(f,t.meta,!0),e.referrer)})}break;default:break}return o.headers.accept==="text/event-stream"&&(r.headers["content-type"]="text/event-stream"),crossOriginIsolated&&(r.headers["Cross-Origin-Embedder-Policy"]="require-corp"),this.emit("response",l),l.intercepted?l.returnValue:new Response(r.body,{headers:r.headers,status:r.status,statusText:r.statusText})}catch(t){return["document","iframe"].includes(e.destination)?(console.error(t),T(t,s)):new Response(void 0,{status:500})}}static Ultraviolet=h};self.UVServiceWorker=g;var y=class{constructor(e,s){this.request=e,this.raw=s,this.ultraviolet=e.ultraviolet,this.headers={};for(let t in s.rawHeaders)this.headers[t.toLowerCase()]=s.rawHeaders[t];this.status=s.status,this.statusText=s.statusText,this.body=s.body}get url(){return this.request.url}get base(){return this.request.base}set base(e){this.request.base=e}getHeader(e){return Array.isArray(this.headers[e])?this.headers[e][0]:this.headers[e]}},v=class{constructor(e,s,t=null){this.ultraviolet=s,this.request=e,this.headers=Object.fromEntries(e.headers.entries()),this.method=e.method,this.body=t||null,this.cache=e.cache,this.redirect=e.redirect,this.credentials="omit",this.mode=e.mode==="cors"?e.mode:"same-origin",this.blob=!1}get url(){return this.ultraviolet.meta.url}set url(e){this.ultraviolet.meta.url=e}get base(){return this.ultraviolet.meta.base}set base(e){this.ultraviolet.meta.base=e}},u=class{#e;#t;constructor(e={},s=null,t=null){this.#e=!1,this.#t=null,this.data=e,this.target=s,this.that=t}get intercepted(){return this.#e}get returnValue(){return this.#t}respondWith(e){this.#t=e,this.#e=!0}};function E(a,e){let s=`
        window.errorDetails = {
            trace: ${JSON.stringify(a)},
            url: ${JSON.stringify(e)},
            proxy: 'Ultraviolet',
            hostname: ${JSON.stringify(location.hostname)},
            version: '3.2.10',
            build: 'a2d1e61'
        };
    `;return`<!DOCTYPE html>
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
                    background: rgba(255, 255, 255, 0.04);
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
                                    <button class="btn btn-copy" style="padding: 0.25rem 0.5rem; font-size: 0.6rem; border-radius: 3px;">
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

            <script src="data:application/javascript,${encodeURIComponent(s)}"></script>
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
                    if (data.proxy === 'Ultraviolet') {
                        proxyBadgeText.textContent = 'Ultraviolet Error';
                    } else if (data.proxy === 'Scramjet') {
                        proxyBadgeText.textContent = 'Scramjet Error';
                    } else {
                        proxyBadgeText.textContent = 'Unexpected error';
                    }

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
                        btn.addEventListener('click', (e) => { e.preventDefault(); window.open('/', '_blank'); });
                    });
                    document.querySelectorAll('.btn-settings, .btn-settings-footer').forEach(btn => {
                        btn.addEventListener('click', (e) => { e.preventDefault(); window.parent.location.href = '/settings'; });
                    });
                    document.querySelectorAll('.btn-games').forEach(btn => {
                        btn.addEventListener('click', () => { window.parent.location.href = '/games'; });
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
                            const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(5000) });
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
        </html>`}function T(a,e){let s={"content-type":"text/html"};return crossOriginIsolated&&(s["Cross-Origin-Embedder-Policy"]="require-corp"),new Response(E(String(a),e),{status:500,headers:s})}})();
//# sourceMappingURL=uv.sw.js.map

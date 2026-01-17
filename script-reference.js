/**
 * ================================================================================
 * SCRIPT ÚNICO REFERENCE - krpano Downloader v1.0 (Monolítico)
 * ================================================================================
 * 
 * DESCRIPCIÓN:
 * Este es el script ORIGINAL monolítico (versión antigua antes de modularización).
 * Se incluye como REFERENCIA para quienes prefieren una versión de un solo archivo.
 * 
 * ⚠️ RECOMENDACIÓN: Usa la VERSIÓN MODULAR (index.js + config.yaml)
 * Este script es más difícil de mantener y no es GitHub-ready.
 * 
 * ================================================================================
 * CÓMO USAR ESTE SCRIPT:
 * ================================================================================
 * 
 * 1. EDITA LA CONFIGURACIÓN (línea 77-78 abajo):
 * 
 *    Busca:    const TOUR_URL = '...YOUR_URL_HERE...';
 *    Cambia a: const TOUR_URL = 'https://tu-tour.com/recorridos/tour/';
 * 
 * 2. INSTALA DEPENDENCIAS (primera vez):
 * 
 *    npm install
 * 
 * 3. EJECUTA:
 * 
 *    node SCRIPT_ÚNICO_REFERENCE.js                    # Descarga básica
 *    node SCRIPT_ÚNICO_REFERENCE.js --puppeteer        # Con navegador
 *    node SCRIPT_ÚNICO_REFERENCE.js --puppeteer --screenshots  # Con screenshots
 * 
 * ================================================================================
 */

const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');
let PQueue;
const puppeteer = require('puppeteer');

/* ================== FIX ESM node-fetch (Node 18+) ================== */
let fetchFn;
(async () => {
    const mod = await import('node-fetch');
    fetchFn = mod.default;
})();
const fetchSafe = async (...args) => {
    while (!fetchFn) {
        await new Promise(r => setTimeout(r, 10));
    }
    return fetchFn(...args);
};
/* ================================================================== */

/* ================== CONFIGURACIÓN ANTI‑WAF ================== */
const BASE_DELAY_MS = 300;           // delay base entre requests
const JITTER_MS = 400;               // variación aleatoria
const RETRY_BACKOFF_BASE = 800;      // backoff inicial
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = () => Math.floor(Math.random() * JITTER_MS);

const fetchWithHeaders = async (url, options = {}) => {
    const ua = getRandomUserAgent();
    const opts = {
        ...options,
        headers: {
            'User-Agent': ua,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': TOUR_URL + 'tour.html',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
            ...options.headers
        }
    };
    try {
        const res = await fetchSafe(url, opts);
        const retryOnBlock = options.retryOnBlock !== false; // default true
        if ((res.status === 403 || res.status === 429)) {
            await logFileStatus(url, { status: 'blocked', code: res.status });
            if (!retryOnBlock) {
                // return the response so caller can decide to skip
                return res;
            }
            const wait = 5000 + Math.random() * 5000;
            console.log(`⚠️ Bloqueo detectado (${res.status}) en ${url}, esperando ${Math.round(wait)}ms antes de reintentar`);
            await sleep(wait);
            return fetchWithHeaders(url, options);
        }
        return res;
    } catch (err) {
        const wait = 3000 + Math.random() * 3000;
        await logFileStatus(url, { status: 'error', error: err.message });
        console.log(`⚠️ Error fetch (${err.message}) en ${url}, esperando ${Math.round(wait)}ms antes de reintentar`);
        await sleep(wait);
        return fetchWithHeaders(url, options);
    }
};
/* =============================================================== */

/**
 * ================================================================================
 * ❌ REEMPLAZA ESTO CON TU TOUR URL:
 * ================================================================================
 * 
 * Cambiar:
 *   const TOUR_URL = '...TU_URL_AQUI...';
 * 
 * Por ejemplo:
 *   const TOUR_URL = 'https://mipropiedades.com/recorridos/apto-101/';
 *   const TOUR_URL = 'https://inmobiliaria.com/tours/casa-lujo/';
 *   const TOUR_URL = 'https://tudominio.com/recorridos/tu-tour/';
 * 
 * IMPORTANTE:
 *   - Debe terminar con "/"
 *   - Debe ser una URL válida (existe y es accesible)
 *   - Debe tener un tour krpano funcionando
 * 
 * ================================================================================
 */
const TOUR_URL = 'https://...TU_URL_AQUI.../recorridos/...tour.../';

const XML_URL = TOUR_URL + 'tour.xml';
const DOWNLOAD_DIR = path.join(__dirname, 'tour_offline');
const LOG_FILE = path.join(DOWNLOAD_DIR, 'download_log.json');
const MAX_PARALLEL = 5;      // reducido suavemente (antes 10)
const MAX_RETRIES = 5;

// persistent log for resuming
let downloadLog = { startedAt: new Date().toISOString(), files: {} };

const logWrite = async () => {
    try { await fs.outputJson(LOG_FILE, downloadLog, { spaces: 2 }); } catch (e) {}
};

const logFileStatus = async (url, data) => {
    try {
        downloadLog.files[url] = {
            ...(downloadLog.files[url] || {}),
            ...data,
            updatedAt: new Date().toISOString()
        };
        await logWrite();
    } catch (e) {}
};

(async () => {
    // Validar que TOUR_URL fue reemplazado
    if (TOUR_URL.includes('...TU_URL_AQUI...')) {
        console.error('❌ ERROR: TOUR_URL no ha sido configurado');
        console.error('Por favor edita este archivo y reemplaza TOUR_URL con tu URL real');
        console.error('Línea aproximada 113-114');
        process.exit(1);
    }

    await fs.ensureDir(DOWNLOAD_DIR);
    // load existing log to resume
    try {
        if (await fs.pathExists(LOG_FILE)) {
            const j = await fs.readJson(LOG_FILE);
            if (j && j.files) downloadLog = j;
        }
    } catch (e) {}

    console.log('📄 Descargando archivos base del tour...');
    const baseFiles = ['index.html', 'tour.js', 'krpano.js'];
    for (let file of baseFiles) {
        try {
            const url = TOUR_URL + file;
            const targetPath = path.join(DOWNLOAD_DIR, file);
            if (!await fs.pathExists(targetPath)) {
                await sleep(BASE_DELAY_MS + jitter());
                // don't retry aggressively for krpano.js or other base files — skip on 403/429
                const res = await fetchWithHeaders(url, { retryOnBlock: false });
                if (!res.ok) continue;
                const ab = await res.arrayBuffer();
                const buffer = Buffer.from(ab);
                await fs.outputFile(targetPath, buffer);
                await logFileStatus(url, { status: 'downloaded', size: buffer.length });
                console.log('✅ Descargado:', file);
            }
        } catch {}
    }

    console.log('📄 Descargando XML principal del tour...');
    const xmlPath = path.join(DOWNLOAD_DIR, 'tour.xml');
    if (!await fs.pathExists(xmlPath)) {
        await sleep(BASE_DELAY_MS + jitter());
        const resXml = await fetchWithHeaders(XML_URL);
        const xmlText = await resXml.text();
        await fs.outputFile(xmlPath, xmlText);
    }

    console.log('🔍 Parseando XML para encontrar todos los tiles...');
    const parser = new xml2js.Parser();
    const xmlText = await fs.readFile(xmlPath, 'utf-8');
    const xmlData = await parser.parseStringPromise(xmlText);

    const tiles = [];
    // parse scenes from tour.xml robustly using <scene> tags
    const scenes = (xmlData && xmlData.krpano && Array.isArray(xmlData.krpano.scene)) ? xmlData.krpano.scene : [];
    for (let scene of scenes) {
        const sceneName = scene.$?.name || 'scene';
        if (scene.cube) {
            for (let cube of scene.cube) {
                for (let face of cube.face || []) {
                    for (let level of face.level || []) {
                        for (let tile of level.tile || []) {
                            if (tile.$?.url) {
                                const tileUrl = tile.$.url.startsWith('http')
                                    ? tile.$.url
                                    : TOUR_URL + tile.$.url;

                                if (downloadLog.files[tileUrl]?.status === 'downloaded') continue;

                                tiles.push({
                                    url: tileUrl,
                                    path: path.join(
                                        DOWNLOAD_DIR,
                                        sceneName,
                                        'cube',
                                        face.$?.name || 'face',
                                        level.$?.name || 'level',
                                        path.basename(tile.$.url)
                                    ),
                                    relativePath: tile.$.url
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    console.log(`🖼️ Se encontraron ${tiles.length} tiles.`);

    let totalBytes = 0;
    for (let tile of tiles) {
        try {
            await sleep(BASE_DELAY_MS + jitter());
            const head = await fetchWithHeaders(tile.url, { method: 'HEAD' });
            const len = head.headers.get('content-length');
            if (len) totalBytes += parseInt(len);
        } catch {}
    }

    console.log('📊 Tamaño estimado:', (totalBytes / 1024 / 1024).toFixed(2), 'MB');

    if (!PQueue) {
        const pmod = await import('p-queue');
        PQueue = pmod && pmod.default ? pmod.default : pmod;
    }

    const queue = new PQueue({ concurrency: MAX_PARALLEL });

    // Helper: map a URL to a local path under DOWNLOAD_DIR
    const urlToLocalPath = (u) => {
        try {
            const nu = new URL(u, TOUR_URL);
            // remove leading '/'
            let rel = nu.pathname.replace(/^\//, '');
            if (!rel || rel.endsWith('/')) {
                // directory-like URL -> save as index.html
                rel = path.join(rel, 'index.html');
            }
            // if URL has a trailing filename but no extension, keep as-is
            return path.join(DOWNLOAD_DIR, rel);
        } catch (e) {
            return null;
        }
    };

    // Extract URLs from HTML/CSS/JS text
    const extractUrls = (text, base) => {
        const urls = new Set();
        const attrRegex = /(?:href|src)=["']([^"']+)["']/gi;
        let m;
        while ((m = attrRegex.exec(text))) urls.add(m[1]);

        const urlFunc = /url\((?:"|')?([^"')]+)(?:"|'|)\)/gi;
        while ((m = urlFunc.exec(text))) urls.add(m[1]);

        const absRegex = /https?:\/\/[^\s"'()<>]+/gi;
        while ((m = absRegex.exec(text))) urls.add(m[0]);

        // JS-embedded relative paths starting with /recorridos
        const recRegex = /["'](\/recorridos\/[^"]+)["']/gi;
        while ((m = recRegex.exec(text))) urls.add(m[1]);

        const resolved = [];
        for (let u of urls) {
            try { resolved.push(new URL(u, base).toString()); } catch (e) {}
        }
        return resolved;
    };

    // Crawl starting from some seed files to discover all resources under the tour path
    const visited = new Set();
    const discovered = new Set();

    const addToDownload = (u) => {
        if (!u) return;
        // only same-origin or tour path
        try {
            const nu = new URL(u);
            if (nu.hostname !== new URL(TOUR_URL).hostname) {
                // allow root favicon
                if (nu.pathname === '/favicon.ico') {
                    discovered.add(nu.toString());
                }
                return;
            }
            if (nu.pathname.startsWith(new URL(TOUR_URL).pathname) || nu.pathname === '/favicon.ico') {
                discovered.add(nu.toString());
            }
        } catch (e) {}
    };

    // seed
    addToDownload(TOUR_URL + 'tour.html');
    addToDownload(TOUR_URL + 'tour.js');
    addToDownload(TOUR_URL + 'tour.xml');
    addToDownload(TOUR_URL);

    // also add tiles discovered from XML
    for (let t of tiles) addToDownload(t.url);

    // BFS-style crawl using the queue (limited concurrency)
    const crawl = async () => {
        const toProcess = Array.from(discovered);
        while (toProcess.length) {
            const u = toProcess.shift();
            if (visited.has(u)) continue;
            visited.add(u);

            queue.add(async () => {
                try {
                    await sleep(BASE_DELAY_MS + jitter());
                            const res = await fetchWithHeaders(u, { retryOnBlock: false });
                            if (res.status === 403 || res.status === 429) {
                                await logFileStatus(u, { status: 'skipped', code: res.status });
                                console.log(`⏭️ Skipped blocked resource ${u} (${res.status})`);
                                return;
                            }
                            if (!res.ok) return;

                    const contentType = (res.headers.get('content-type') || '').toLowerCase();
                    const localPath = urlToLocalPath(u) || path.join(DOWNLOAD_DIR, 'other', encodeURIComponent(u));
                    await fs.ensureDir(path.dirname(localPath));

                    if (/application\/xml|text\/xml|text\/html|application\/javascript|text\/javascript|application\/json|text\/css/.test(contentType) || u.endsWith('.js') || u.endsWith('.html') || u.endsWith('.css') || u.endsWith('.xml')) {
                        const text = await res.text();
                        await fs.outputFile(localPath, text, 'utf8');
                        await logFileStatus(u, { status: 'downloaded', size: Buffer.byteLength(text, 'utf8') });

                        // discover more URLs from this content
                        const found = extractUrls(text, u);
                        for (let f of found) {
                            try {
                                if (!visited.has(f) && !discovered.has(f)) {
                                    // only add if under tour path or favicon
                                    const nu = new URL(f);
                                    if (nu.hostname === new URL(TOUR_URL).hostname && (nu.pathname.startsWith(new URL(TOUR_URL).pathname) || nu.pathname === '/favicon.ico')) {
                                        discovered.add(f);
                                        toProcess.push(f);
                                    }
                                }
                            } catch (e) {}
                        }
                    } else {
                        const ab = await res.arrayBuffer();
                        const buffer = Buffer.from(ab);
                        await fs.outputFile(localPath, buffer);
                        await logFileStatus(u, { status: 'downloaded', size: buffer.length });
                    }
                    console.log('✅ Crawled:', u);
                } catch (err) {
                    console.log('⚠️ Error crawling', u, err.message || err);
                }
            });
        }
    };

    // If user requested puppeteer mode, run a headful crawl that mimics browser network
    const usePuppeteer = process.argv.includes('--puppeteer') || process.env.USE_PUPPETEER;
    const TAKE_SCREENSHOTS = process.argv.includes('--screenshots');
    const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
    const layerNames = (xmlData && xmlData.krpano && xmlData.krpano.layer) ? (xmlData.krpano.layer.map(l => l.$ && l.$.name).filter(Boolean)) : [];
    if (TAKE_SCREENSHOTS) await fs.ensureDir(SCREENSHOT_DIR);
    if (usePuppeteer) {
        const headful = process.argv.includes('--show');
        const browser = await puppeteer.launch({ headless: !headful, devtools: headful, args: ['--no-sandbox','--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent(getRandomUserAgent());
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Referer': TOUR_URL + 'tour.html' });

        // helper: wait until krpano finished loading the best-resolution tiles for current view
        const waitForViewLoaded = async (timeout = 8000) => {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                try {
                    const state = await page.evaluate(() => {
                        try {
                            if (window.krpano && typeof window.krpano.get === 'function') return window.krpano.get('image.loadstate');
                        } catch (e) {}
                        return null;
                    });
                    if (state === 3) return true;
                } catch (e) {}
                await new Promise(r => setTimeout(r, 250));
            }
            return false;
        };

        page.on('response', async (res) => {
            try {
                const url = res.url();
                if (!url || !url.startsWith('http')) return;
                const nu = new URL(url);
                if (nu.hostname !== new URL(TOUR_URL).hostname) return;
                if (!nu.pathname.startsWith(new URL(TOUR_URL).pathname) && nu.pathname !== '/favicon.ico') return;

                const status = res.status();
                if (status === 403 || status === 429) {
                    await logFileStatus(url, { status: 'skipped', code: status });
                    console.log(`⏭️ Skipped blocked resource ${url} (${status})`);
                    return;
                }

                const headers = res.headers();
                const contentType = (headers['content-type'] || '').toLowerCase();
                const localPath = urlToLocalPath(url) || path.join(DOWNLOAD_DIR, 'other', encodeURIComponent(url));
                await fs.ensureDir(path.dirname(localPath));

                if (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('xml') || contentType.includes('json') || contentType.includes('css')) {
                    const text = await res.text();
                    await fs.outputFile(localPath, text, 'utf8');
                    await logFileStatus(url, { status: 'downloaded', size: Buffer.byteLength(text, 'utf8') });
                    console.log('✅ Saved (text):', url);
                } else {
                    const buf = await res.buffer();
                    await fs.outputFile(localPath, buf);
                    await logFileStatus(url, { status: 'downloaded', size: buf.length });
                    console.log('✅ Saved (binary):', url);
                }
            } catch (e) {
                console.log('⚠️ Puppeteer save error:', e.message);
            }
        });

        console.log('🚀 Puppeteer crawl: opening tour');
        try {
            await page.setViewport({ width: 1280, height: 800 });
            
            // Disable skin by commenting out the skin include in tour.xml BEFORE page loads
            console.log('🔧 Disabling skin by removing include...');
            const xmlPath = path.join(DOWNLOAD_DIR, 'tour.xml');
            if (await fs.pathExists(xmlPath)) {
                try {
                    let xmlContent = await fs.readFile(xmlPath, 'utf-8');
                    
                    // Comment out the skin include line using simple string replacement
                    // Only do it once to avoid double replacements
                    if (xmlContent.includes('<include url="skin/vtourskin.xml"')) {
                        xmlContent = xmlContent.replace(
                            /<include\s+url="skin\/vtourskin\.xml"\/>/,
                            '<!-- <include url="skin/vtourskin.xml"/> - DISABLED FOR CLEAN SCREENSHOTS -->'
                        );
                    }
                    
                    await fs.outputFile(xmlPath, xmlContent, 'utf-8');
                    console.log('✓ Skin include commented out in tour.xml');
                } catch (err) {
                    console.log('⚠️ XML modification failed:', err.message);
                }
            }
            
            await page.goto(TOUR_URL, { waitUntil: 'networkidle2', timeout: 60000 });

            // small wait for scripts to initialize
            await new Promise(r => setTimeout(r, 3000));

            // simulate user interaction (drags) to force krpano to load tiles
            const rect = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
            const cx = Math.floor(rect.w / 2);
            const cy = Math.floor(rect.h / 2);

            const drag = async (dx, dy, steps = 10) => {
                const startX = cx;
                const startY = cy;
                await page.mouse.move(startX, startY);
                await page.mouse.down();
                for (let i = 1; i <= steps; i++) {
                    const nx = startX + Math.floor((dx * i) / steps);
                    const ny = startY + Math.floor((dy * i) / steps);
                    await page.mouse.move(nx, ny, { steps: 2 });
                    await new Promise(r => setTimeout(r, 80));
                }
                await page.mouse.up();
            };

            // perform several drags in different directions and wait between them
            await drag(300, 0); await new Promise(r => setTimeout(r, 800));
            await drag(-300, 0); await new Promise(r => setTimeout(r, 800));
            await drag(0, 200); await new Promise(r => setTimeout(r, 800));
            await drag(0, -200); await new Promise(r => setTimeout(r, 800));
            await drag(200, 200); await new Promise(r => setTimeout(r, 1200));

            // extra wait for network requests triggered by interactions
            await new Promise(r => setTimeout(r, 3000));

            // If scenes were parsed server-side, load each scene via krpano API to force all tiles
            try {
                // Build scene info list: name + tileFolder + default heading
                const sceneInfos = [];
                if (Array.isArray(scenes)) {
                    for (const s of scenes) {
                        try {
                            const name = (s.$ && s.$.name) || (s.title && s.title[0]) || null;
                            if (!name) continue;
                            let tileFolder = null;
                            let defaultHeading = 0;
                            
                            // extract default hlookat from view tag
                            try {
                                if (s.view && s.view[0] && s.view[0].$ && s.view[0].$.hlookat) {
                                    defaultHeading = parseFloat(s.view[0].$.hlookat) || 0;
                                }
                            } catch (e) {}
                            
                            try {
                                // preview url often contains the panos folder
                                if (s.preview && s.preview[0] && s.preview[0].$.url) {
                                    const m = /panos\/([^\/]+\.tiles)/.exec(s.preview[0].$.url);
                                    if (m) tileFolder = m[1];
                                }
                            } catch (e) {}
                            try {
                                // or the image.cube url attribute
                                if (!tileFolder && s.image && s.image[0] && s.image[0].cube && s.image[0].cube[0] && s.image[0].cube[0].$ && s.image[0].cube[0].$.url) {
                                    const u = s.image[0].cube[0].$.url;
                                    const m2 = /panos\/([^\/]+\.tiles)/.exec(u);
                                    if (m2) tileFolder = m2[1];
                                }
                            } catch (e) {}
                            sceneInfos.push({ name, tileFolder, defaultHeading });
                        } catch (e) {}
                    }
                }

                // ensure krpano object exists in page before attempting loadscene
                const waitForKrpano = async (timeout = 10000) => {
                    const start = Date.now();
                    while (Date.now() - start < timeout) {
                        try {
                            const ready = await page.evaluate(() => {
                                try {
                                    return !!(window.krpano || document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject'));
                                } catch (e) { return false; }
                            });
                            if (ready) return true;
                        } catch (e) {}
                        await new Promise(r => setTimeout(r, 200));
                    }
                    return false;
                };

                if (sceneInfos.length) {
                    await waitForKrpano(12000);
                    for (const scInfo of sceneInfos) {
                        const sc = scInfo.name;
                        try {
                            if (!sc) continue;
                            // load the scene in the viewer
                            await page.evaluate((scene) => {
                                try {
                                    const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null);
                                    if (kr && typeof kr.call === 'function') {
                                        kr.call('loadscene(' + JSON.stringify(scene) + ', null, MERGE);');
                                        try { kr.call('set(view.fov,120);'); } catch (e) {}
                                    }
                                } catch (e) {}
                            }, sc);

                            // give the scene a moment to load tiles
                            await new Promise(r => setTimeout(r, 800));
                            await page.evaluate(() => { if (window.krpano && typeof window.krpano.call === 'function') window.krpano.call('set(view.fov,90);'); }).catch(()=>{});
                            await new Promise(r => setTimeout(r, 600));
                            await drag(200, 0); await new Promise(r => setTimeout(r, 600));
                            await drag(-200, 0); await new Promise(r => setTimeout(r, 600));
                            await page.evaluate(() => { if (window.krpano && typeof window.krpano.call === 'function') window.krpano.call('set(view.fov,70);'); }).catch(()=>{});

                            if (TAKE_SCREENSHOTS) {
                                const bestFov = 90;
                                // Calculate 6 rotations from the scene's default heading, each 90° apart
                                const baseHeading = scInfo.defaultHeading || 0;
                                const orientations = [
                                    { name: 'axis0', h: baseHeading, v: 0 },
                                    { name: 'axis1', h: baseHeading + 90, v: 0 },
                                    { name: 'axis2', h: baseHeading + 180, v: 0 },
                                    { name: 'axis3', h: baseHeading + 270, v: 0 },
                                    { name: 'top', h: baseHeading, v: -90 },
                                    { name: 'bottom', h: baseHeading, v: 90 }
                                ];

                                for (const ori of orientations) {
                                    try {
                                        // disable interactive plugins
                                        await page.evaluate(() => { try { if (window.krpano && typeof window.krpano.call === 'function') window.krpano.call("set(plugin[radar].enabled,false);set(plugin[scrollarea].enabled,false);set(plugin[webvr].enabled,false);"); } catch(e){} }).catch(()=>{});
                                        await new Promise(r => setTimeout(r, 300));

                                        // set view synchronously (no animation) and use krpano wait() to ensure rendering
                                        await page.evaluate((hh, vv, ff) => {
                                            try {
                                                const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null);
                                                if (kr && typeof kr.call === 'function') {
                                                    // set values directly without animation
                                                    kr.call('set(view.hlookat,' + hh + ');');
                                                    kr.call('set(view.vlookat,' + vv + ');');
                                                    kr.call('set(view.fov,' + ff + ');');
                                                    // wait for image loading to complete
                                                    kr.call('wait(1);');
                                                }
                                            } catch (e) {}
                                        }, ori.h, ori.v, bestFov).catch(()=>{});

                                        // extra wait for rendering to settle
                                        await new Promise(r => setTimeout(r, 1500));
                                        await waitForViewLoaded(5000);
                                        await new Promise(r => setTimeout(r, 800));

                                        // Skin is already disabled at XML load time via request interceptor
                                        // modes: all (normal FOV) and no_spots (zoomed out, max FOV to see more)
                                        const modes = [
                                            { mode: 'all', fov: bestFov },
                                            { mode: 'no_spots', fov: 120 }  // zoom out (higher FOV = wider view)
                                        ];
                                        for (const modeInfo of modes) {
                                            const mode = modeInfo.mode;
                                            const modeFov = modeInfo.fov;

                                            if (mode === 'no_spots' && layerNames && layerNames.length) {
                                                // hide spot/hotspot layers
                                                for (const ln of layerNames) {
                                                    if (/spot|hotspot/i.test(ln)) {
                                                        await page.evaluate((n) => { try { const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null); if (kr && typeof kr.call === 'function') kr.call('set(layer['+JSON.stringify(n)+'].visible,false);'); } catch(e){} }, ln).catch(()=>{});
                                                    }
                                                }
                                                await new Promise(r => setTimeout(r, 300));
                                                
                                                // zoom out for no_spots mode
                                                await page.evaluate((ff) => {
                                                    try {
                                                        const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null);
                                                        if (kr && typeof kr.call === 'function') {
                                                            kr.call('set(view.fov,' + ff + ');');
                                                            kr.call('wait(1);');
                                                        }
                                                    } catch (e) {}
                                                }, modeFov).catch(()=>{});
                                                
                                                await new Promise(r => setTimeout(r, 1000));
                                            }

                                            try {
                                                const sceneFolderName = scInfo.tileFolder || ((sc && sc.toString().endsWith('.tiles')) ? sc.toString() : (sc ? sc.toString() + '.tiles' : 'scene.tiles'));
                                                const sceneDirName = sceneFolderName.replace(/[<>:\"/\\|?*]+/g, '').replace(/\s+/g, '_');
                                                const outDir = path.join(SCREENSHOT_DIR, sceneDirName);
                                                await fs.ensureDir(outDir);
                                                const safeName = (sc + '_' + ori.name + '_' + mode + '_fov' + modeFov).replace(/[\\/:*?"<>| ]+/g, '_');
                                                const outPath = path.join(outDir, safeName + '.png');
                                                await page.screenshot({ path: outPath });
                                                console.log('📸 Screenshot saved:', outPath);
                                            } catch (e) {
                                                console.log('⚠️ Screenshot error:', e.message || e);
                                            }

                                            if (mode === 'no_spots' && layerNames && layerNames.length) {
                                                // restore spot/hotspot layers and zoom back in
                                                for (const ln of layerNames) {
                                                    if (/spot|hotspot/i.test(ln)) {
                                                        await page.evaluate((n) => { try { const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null); if (kr && typeof kr.call === 'function') kr.call('set(layer['+JSON.stringify(n)+'].visible,true);'); } catch(e){} }, ln).catch(()=>{});
                                                    }
                                                }
                                                // restore original FOV
                                                await page.evaluate((ff) => {
                                                    try {
                                                        const kr = (typeof window.krpano !== 'undefined') ? window.krpano : (document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject') || null);
                                                        if (kr && typeof kr.call === 'function') {
                                                            kr.call('set(view.fov,' + ff + ');');
                                                        }
                                                    } catch (e) {}
                                                }, bestFov).catch(()=>{});
                                                await new Promise(r => setTimeout(r, 200));
                                            }
                                        }

                                        // re-enable plugins
                                        await page.evaluate(() => { try { if (window.krpano && typeof window.krpano.call === 'function') window.krpano.call("set(plugin[radar].enabled,true);set(plugin[scrollarea].enabled,true);set(plugin[webvr].enabled,true);"); } catch(e){} }).catch(()=>{});
                                        await new Promise(r => setTimeout(r, 120));

                                    } catch (e) {
                                        console.log('⚠️ Orientation error:', e && e.message ? e.message : e);
                                    }
                                }
                            }

                        } catch (e) {
                            console.log('⚠️ Scene handling error for', sc, e && e.message ? e.message : e);
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Puppeteer scene loop error:', e && e.message ? e.message : e);
            }
        } catch (e) {
            console.log('⚠️ Puppeteer navigation/error:', e.message);
        }
        // after capture, close browser then generate a small report of screenshots
        await browser.close();

        // REPORT: scenes with fewer than 12 unique screenshots and optional thumbnails
        try {
            const crypto = require('crypto');
            const report = { generatedAt: new Date().toISOString(), scenes: [] };
            const sceneDirs = await fs.readdir(SCREENSHOT_DIR);
            for (const sd of sceneDirs) {
                const dirPath = path.join(SCREENSHOT_DIR, sd);
                const stat = await fs.stat(dirPath).catch(() => null);
                if (!stat || !stat.isDirectory()) continue;
                const files = (await fs.readdir(dirPath)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
                const hashes = {};
                for (const f of files) {
                    const fp = path.join(dirPath, f);
                    const buf = await fs.readFile(fp);
                    const h = crypto.createHash('sha256').update(buf).digest('hex');
                    hashes[h] = hashes[h] || [];
                    hashes[h].push(f);
                }
                const unique = Object.keys(hashes).length;
                const entry = { scene: sd, files: files.length, unique };
                if (unique < 12) {
                    entry.problem = true;
                    entry.duplicates = Object.entries(hashes).filter(([k, v]) => v.length > 1).map(([k, v]) => ({ hash: k, files: v }));
                    // try to generate thumbnails using jimp if available
                    try {
                        const Jimp = require('jimp');
                        const thumbDir = path.join(dirPath, 'thumbs');
                        await fs.ensureDir(thumbDir);
                        entry.thumbs = [];
                        for (const f of files) {
                            try {
                                const img = await Jimp.read(path.join(dirPath, f));
                                img.cover(320, 180); // crop/cover
                                const out = path.join(thumbDir, f.replace(/\.(png|jpg|jpeg)$/i, '') + '.thumb.jpg');
                                await img.quality(80).writeAsync(out);
                                entry.thumbs.push(path.relative(SCREENSHOT_DIR, out));
                            } catch (e) {}
                        }
                    } catch (e) {
                        entry.thumbs = null;
                        entry.thumbMessage = 'jimp not installed — run `npm install jimp` to create thumbnails';
                    }
                }
                report.scenes.push(entry);
            }
            await fs.outputJson(path.join(SCREENSHOT_DIR, 'report.json'), report, { spaces: 2 });
            console.log('📋 Screenshot report saved:', path.join(SCREENSHOT_DIR, 'report.json'));
        } catch (e) {
            console.log('⚠️ Report generation failed:', e.message || e);
        }
    } else {
        await crawl();
    }

    const downloadTile = async (tile, attempt = 1) => {
        try {
            if (await fs.pathExists(tile.path)) return;

            await sleep(BASE_DELAY_MS + jitter());
            const res = await fetchWithHeaders(tile.url, { retryOnBlock: false });
            if (res.status === 403 || res.status === 429) {
                await logFileStatus(tile.url, { status: 'skipped', code: res.status });
                console.log(`⏭️ Skipped blocked tile ${tile.relativePath || tile.url} (${res.status})`);
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const ab = await res.arrayBuffer();
            const buffer = Buffer.from(ab);
            await fs.ensureDir(path.dirname(tile.path));
            await fs.outputFile(tile.path, buffer);
            await logFileStatus(tile.url, { status: 'downloaded', size: buffer.length, attempts: attempt });
            console.log('✅', tile.relativePath || tile.url);

        } catch (err) {
            if (attempt <= MAX_RETRIES) {
                const backoff =
                    RETRY_BACKOFF_BASE * Math.pow(2, attempt) + jitter();
                console.log(`🔁 Reintento ${attempt} en ${backoff}ms`);
                await sleep(backoff);
                await downloadTile(tile, attempt + 1);
            } else {
                await logFileStatus(tile.url, {
                    status: 'failed',
                    error: err.message
                });
                console.error('❌ Falló:', tile.relativePath || tile.url);
            }
        }
    };

    for (let tile of tiles) {
        queue.add(() => downloadTile(tile));
    }

    await queue.onIdle();
    console.log('🎉 Descarga completa sin bloqueo WAF.');
})();

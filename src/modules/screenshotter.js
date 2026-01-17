/**
 * Puppeteer Screenshot Module
 * =============================================================================
 * Módulo para capturas de pantalla con Puppeteer
 * 
 * Responsabilidades:
 * - Iniciar navegador Puppeteer
 * - Cargar tour en navegador
 * - Capturar pantallas en múltiples orientaciones
 * - Interceptar y guardar recursos descargados
 * - Generar reportes de screenshots
 * 
 * Uso:
 *   const screenshotter = new Screenshotter(config, logger, xmlData);
 *   await screenshotter.captureScreenshots();
 * =============================================================================
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class Screenshotter {
  constructor(config, logger, xmlData) {
    this.config = config;
    this.logger = logger;
    this.xmlData = xmlData;
    this.tourUrl = config.get('tour.baseUrl');
    this.screenshotDir = config.get('screenshots.outputDir') || './screenshots';
    this.headless = config.get('puppeteer.headless') !== false;
    this.showDevtools = config.get('puppeteer.showDevtools') === true;
    this.viewportWidth = config.get('puppeteer.viewport.width') || 1280;
    this.viewportHeight = config.get('puppeteer.viewport.height') || 800;
    this.navigationTimeout = config.get('puppeteer.navigationTimeout') || 60000;
    this.viewLoadTimeout = config.get('puppeteer.viewLoadTimeout') || 8000;
    this.orientations = config.get('screenshots.orientations') || [];
    this.modes = config.get('screenshots.modes') || [];
  }

  /**
   * Espera a que la vista de krpano cargue completamente
   */
  async waitForViewLoaded(page, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const state = await page.evaluate(() => {
          try {
            if (window.krpano && typeof window.krpano.get === 'function') {
              return window.krpano.get('image.loadstate');
            }
          } catch (e) {}
          return null;
        });
        if (state === 3) return true;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    return false;
  }

  /**
   * Realiza drag de ratón para simular interacción
   */
  async drag(page, dx, dy, steps = 10) {
    const rect = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    const cx = Math.floor(rect.w / 2);
    const cy = Math.floor(rect.h / 2);

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
  }

  /**
   * Desabilita skin de krpano comentando include en XML
   */
  async disableSkinInXml(downloadDir) {
    try {
      const xmlPath = path.join(downloadDir, 'tour.xml');
      if (await fs.pathExists(xmlPath)) {
        let xmlContent = await fs.readFile(xmlPath, 'utf-8');
        if (xmlContent.includes('<include url="skin/vtourskin.xml"')) {
          xmlContent = xmlContent.replace(
            /<include\s+url="skin\/vtourskin\.xml"\/>/,
            '<!-- <include url="skin/vtourskin.xml"/> - DISABLED FOR SCREENSHOTS -->'
          );
          await fs.outputFile(xmlPath, xmlContent, 'utf-8');
          console.log('✓ Skin deshabilitado en tour.xml');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error deshabilitando skin:', error.message);
    }
  }

  /**
   * Carga el tour en el navegador y captura screenshots
   */
  async captureScreenshots() {
    console.log('🚀 Iniciando captura de screenshots con Puppeteer');
    
    const launchArgs = this.config.get('puppeteer.launchArgs') || ['--no-sandbox'];
    const browser = await puppeteer.launch({
      headless: this.headless,
      devtools: this.showDevtools,
      args: launchArgs
    });

    try {
      const page = await browser.newPage();
      const antiWaf = require('../utils/antiWaf');
      
      const ua = antiWaf && antiWaf.prototype && antiWaf.prototype.getRandomUserAgent
        ? new antiWaf(this.config).getRandomUserAgent()
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      await page.setUserAgent(ua);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': this.tourUrl + 'tour.html'
      });

      // Interceptar respuestas para guardar recursos
      page.on('response', async (res) => {
        await this.interceptAndSaveResponse(res);
      });

      await page.setViewport({ width: this.viewportWidth, height: this.viewportHeight });
      
      // Desabilitar skin antes de cargar
      const downloadDir = this.config.get('download.outputDir');
      await this.disableSkinInXml(downloadDir);

      console.log(`🌐 Navegando a tour`);
      await page.goto(this.tourUrl, { waitUntil: 'networkidle2', timeout: this.navigationTimeout });

      // Esperar a que scripts inicialicen
      await new Promise(r => setTimeout(r, 3000));

      // Simular interacción para cargar tiles
      await this.drag(page, 300, 0);
      await new Promise(r => setTimeout(r, 800));
      await this.drag(page, -300, 0);
      await new Promise(r => setTimeout(r, 800));
      await this.drag(page, 0, 200);
      await new Promise(r => setTimeout(r, 800));
      await this.drag(page, 0, -200);
      await new Promise(r => setTimeout(r, 800));
      await this.drag(page, 200, 200);
      await new Promise(r => setTimeout(r, 1200));

      // Procesar cada escena
      await this.captureScenes(page);

      // Generar reporte
      await this.generateScreenshotReport();

    } finally {
      await browser.close();
    }
  }

  /**
   * Captura screenshots de todas las escenas
   */
  async captureScenes(page) {
    try {
      const scenes = (this.xmlData && this.xmlData.krpano && Array.isArray(this.xmlData.krpano.scene))
        ? this.xmlData.krpano.scene
        : [];

      const sceneInfos = [];
      for (const s of scenes) {
        try {
          const name = (s.$ && s.$.name) || (s.title && s.title[0]) || null;
          if (!name) continue;

          let tileFolder = null;
          let defaultHeading = 0;

          try {
            if (s.view && s.view[0] && s.view[0].$ && s.view[0].$.hlookat) {
              defaultHeading = parseFloat(s.view[0].$.hlookat) || 0;
            }
          } catch (e) {}

          try {
            if (s.preview && s.preview[0] && s.preview[0].$.url) {
              const m = /panos\/([^\/]+\.tiles)/.exec(s.preview[0].$.url);
              if (m) tileFolder = m[1];
            }
          } catch (e) {}

          try {
            if (!tileFolder && s.image && s.image[0] && s.image[0].cube && s.image[0].cube[0] && s.image[0].cube[0].$ && s.image[0].cube[0].$.url) {
              const u = s.image[0].cube[0].$.url;
              const m2 = /panos\/([^\/]+\.tiles)/.exec(u);
              if (m2) tileFolder = m2[1];
            }
          } catch (e) {}

          sceneInfos.push({ name, tileFolder, defaultHeading });
        } catch (e) {}
      }

      if (sceneInfos.length === 0) {
        console.log('⚠️ No se encontraron escenas para capturar');
        return;
      }

      await this.captureOrientations(page, sceneInfos);
    } catch (error) {
      console.error('⚠️ Error en captura de escenas:', error.message);
    }
  }

  /**
   * Captura orientaciones de escenas
   */
  async captureOrientations(page, sceneInfos) {
    for (const scInfo of sceneInfos) {
      try {
        const sc = scInfo.name;
        
        // Cargar escena
        await page.evaluate((scene) => {
          try {
            const kr = window.krpano || document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject');
            if (kr && typeof kr.call === 'function') {
              kr.call('loadscene(' + JSON.stringify(scene) + ', null, MERGE);');
              try { kr.call('set(view.fov,120);'); } catch (e) {}
            }
          } catch (e) {}
        }, sc);

        await new Promise(r => setTimeout(r, 800));

        for (const ori of this.orientations) {
          await this.captureOrientation(page, scInfo, ori);
        }
      } catch (error) {
        console.warn(`⚠️ Error en escena ${scInfo.name}:`, error.message);
      }
    }
  }

  /**
   * Captura una orientación específica
   */
  async captureOrientation(page, scInfo, ori) {
    try {
      const bestFov = 90;
      const baseHeading = scInfo.defaultHeading || 0;
      const hlookat = baseHeading + (ori.heading || 0);
      const vlookat = ori.vlookat || 0;

      // Configurar vista
      await page.evaluate((hh, vv, ff) => {
        try {
          const kr = window.krpano || document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject');
          if (kr && typeof kr.call === 'function') {
            kr.call('set(view.hlookat,' + hh + ');');
            kr.call('set(view.vlookat,' + vv + ');');
            kr.call('set(view.fov,' + ff + ');');
            kr.call('wait(1);');
          }
        } catch (e) {}
      }, hlookat, vlookat, bestFov);

      await new Promise(r => setTimeout(r, 1500));
      await this.waitForViewLoaded(page, 5000);
      await new Promise(r => setTimeout(r, 800));

      // Capturar cada modo
      for (const mode of this.modes) {
        await this.captureModeScreenshot(page, scInfo, ori, mode, bestFov);
      }
    } catch (error) {
      console.warn('⚠️ Error en orientación:', error.message);
    }
  }

  /**
   * Captura screenshot de un modo específico
   */
  async captureModeScreenshot(page, scInfo, ori, mode, bestFov) {
    try {
      if (mode.name === 'no_spots') {
        await page.evaluate((ff) => {
          try {
            const kr = window.krpano || document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject');
            if (kr && typeof kr.call === 'function') {
              kr.call('set(view.fov,' + ff + ');');
              kr.call('wait(1);');
            }
          } catch (e) {}
        }, mode.fov);
        
        await new Promise(r => setTimeout(r, 1000));
      }

      const sceneFolderName = scInfo.tileFolder || ((scInfo.name && scInfo.name.toString().endsWith('.tiles')) 
        ? scInfo.name.toString() 
        : (scInfo.name ? scInfo.name.toString() + '.tiles' : 'scene.tiles'));
      
      const sceneDirName = sceneFolderName.replace(/[<>:"\\/|?*]+/g, '').replace(/\s+/g, '_');
      const outDir = path.join(this.screenshotDir, sceneDirName);
      await fs.ensureDir(outDir);

      const safeName = (scInfo.name + '_' + ori.name + '_' + mode.name + '_fov' + mode.fov).replace(/[\\/:*?"<>| ]+/g, '_');
      const outPath = path.join(outDir, safeName + '.png');

      await page.screenshot({ path: outPath });
      console.log('📸 Screenshot guardado:', outPath);

      if (mode.name === 'no_spots') {
        await page.evaluate((ff) => {
          try {
            const kr = window.krpano || document.getElementById('krpanoSWFObject') || document.getElementById('krpanoObject');
            if (kr && typeof kr.call === 'function') {
              kr.call('set(view.fov,' + ff + ');');
            }
          } catch (e) {}
        }, bestFov);
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error) {
      console.warn('⚠️ Error capturando screenshot:', error.message);
    }
  }

  /**
   * Intercepta y guarda recursos descargados
   */
  async interceptAndSaveResponse(res) {
    try {
      const url = res.url();
      if (!url || !url.startsWith('http')) return;

      const nu = new URL(url);
      const tourHost = new URL(this.tourUrl).hostname;

      if (nu.hostname !== tourHost) return;
      if (!nu.pathname.startsWith(new URL(this.tourUrl).pathname) && nu.pathname !== '/favicon.ico') return;

      const status = res.status();
      if (status === 403 || status === 429) {
        await this.logger.logFileStatus(url, { status: 'skipped', code: status });
        return;
      }

      const headers = res.headers();
      const contentType = (headers['content-type'] || '').toLowerCase();
      const localPath = this.urlToLocalPath(url);

      if (!localPath) return;

      await fs.ensureDir(path.dirname(localPath));

      if (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('xml') || contentType.includes('json') || contentType.includes('css')) {
        const text = await res.text();
        await fs.outputFile(localPath, text, 'utf8');
        await this.logger.logFileStatus(url, { status: 'downloaded', size: Buffer.byteLength(text, 'utf8') });
      } else {
        const buf = await res.buffer();
        await fs.outputFile(localPath, buf);
        await this.logger.logFileStatus(url, { status: 'downloaded', size: buf.length });
      }

      console.log('✅ Recurso guardado:', url);
    } catch (error) {
      console.warn('⚠️ Error interceptando respuesta:', error.message);
    }
  }

  /**
   * Convierte URL a ruta local
   */
  urlToLocalPath(url) {
    try {
      const nu = new URL(url, this.tourUrl);
      let rel = nu.pathname.replace(/^\//, '');
      if (!rel || rel.endsWith('/')) {
        rel = path.join(rel, 'index.html');
      }
      const downloadDir = this.config.get('download.outputDir');
      return path.join(downloadDir, rel);
    } catch (e) {
      return null;
    }
  }

  /**
   * Genera reporte de screenshots
   */
  async generateScreenshotReport() {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        scenes: []
      };

      const sceneDirs = await fs.readdir(this.screenshotDir);
      for (const sd of sceneDirs) {
        const dirPath = path.join(this.screenshotDir, sd);
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
          entry.duplicates = Object.entries(hashes)
            .filter(([k, v]) => v.length > 1)
            .map(([k, v]) => ({ hash: k, files: v }));
        }

        report.scenes.push(entry);
      }

      await fs.outputJson(path.join(this.screenshotDir, 'report.json'), report, { spaces: 2 });
      console.log('📋 Reporte de screenshots guardado');
    } catch (error) {
      console.error('⚠️ Error generando reporte:', error.message);
    }
  }
}

module.exports = Screenshotter;


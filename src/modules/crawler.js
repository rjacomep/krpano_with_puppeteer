/**
 * Crawler Module
 * =============================================================================
 * Módulo para crawlear recursos del sitio de forma recursiva
 * 
 * Responsabilidades:
 * - Descubrir URLs mediante análisis de contenido
 * - Crawl recursivo de recursos
 * - Filtrar URLs por dominio y path
 * - Usar queue para controlar concurrencia
 * 
 * Uso:
 *   const crawler = new Crawler(config, logger, antiWaf, queue);
 *   await crawler.crawl(discoveredUrls);
 * =============================================================================
 */

const fs = require('fs-extra');
const path = require('path');

class Crawler {
  constructor(config, logger, antiWaf, queue, xmlParser) {
    this.config = config;
    this.logger = logger;
    this.antiWaf = antiWaf;
    this.queue = queue;
    this.xmlParser = xmlParser;
    this.tourUrl = config.get('tour.baseUrl');
    this.downloadDir = config.get('download.outputDir');
    this.visited = new Set();
    this.discovered = new Set();
  }

  /**
   * Inicia crawl desde URLs semilla
   */
  async crawl(seedUrls = []) {
    console.log('🕷️ Iniciando crawl de recursos...');

    // Agregar URLs semilla
    for (const url of seedUrls) {
      this.addToDownload(url);
    }

    // Semillas por defecto
    this.addToDownload(this.tourUrl + 'tour.html');
    this.addToDownload(this.tourUrl + 'tour.js');
    this.addToDownload(this.tourUrl + this.config.get('tour.xmlFile'));
    this.addToDownload(this.tourUrl);

    await this.processCrawlQueue();
    console.log('✅ Crawl completado');
  }

  /**
   * Agrega URL a descubrir
   */
  addToDownload(url) {
    if (!url) return;
    try {
      const nu = new URL(url);
      const tourHost = new URL(this.tourUrl).hostname;

      if (nu.hostname !== tourHost) {
        if (nu.pathname === '/favicon.ico') {
          this.discovered.add(nu.toString());
        }
        return;
      }

      if (nu.pathname.startsWith(new URL(this.tourUrl).pathname) || nu.pathname === '/favicon.ico') {
        this.discovered.add(nu.toString());
      }
    } catch (e) {}
  }

  /**
   * Procesa queue de crawl
   */
  async processCrawlQueue() {
    const toProcess = Array.from(this.discovered);

    while (toProcess.length > 0) {
      const url = toProcess.shift();

      if (this.visited.has(url)) continue;
      this.visited.add(url);

      this.queue.add(async () => {
        await this.processUrl(url, toProcess);
      });
    }

    await this.queue.onIdle();
  }

  /**
   * Procesa una URL individual
   */
  async processUrl(url, toProcess) {
    try {
      await this.antiWaf.sleep(this.antiWaf.baseDelayMs + this.antiWaf.getJitter());
      const res = await this.antiWaf.fetchWithHeaders(url, { retryOnBlock: false });

      if (res.status === 403 || res.status === 429) {
        await this.logger.logFileStatus(url, { status: 'skipped', code: res.status });
        console.log(`⏭️ Recurso bloqueado ${url} (${res.status})`);
        return;
      }

      if (!res.ok) return;

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const localPath = this.urlToLocalPath(url) || path.join(this.downloadDir, 'other', encodeURIComponent(url));

      await fs.ensureDir(path.dirname(localPath));

      // Determinar si es texto o binario
      const isText = /application\/xml|text\/xml|text\/html|application\/javascript|text\/javascript|application\/json|text\/css/.test(contentType) 
        || url.endsWith('.js') 
        || url.endsWith('.html') 
        || url.endsWith('.css') 
        || url.endsWith('.xml');

      if (isText) {
        const text = await res.text();
        await fs.outputFile(localPath, text, 'utf8');
        await this.logger.logFileStatus(url, { status: 'downloaded', size: Buffer.byteLength(text, 'utf8') });

        // Descubrir más URLs en el contenido
        const found = this.xmlParser.extractUrls(text, url);
        for (const f of found) {
          if (!this.visited.has(f) && !this.discovered.has(f)) {
            this.addToDownload(f);
            toProcess.push(f);
          }
        }
      } else {
        const ab = await res.arrayBuffer();
        const buffer = Buffer.from(ab);
        await fs.outputFile(localPath, buffer);
        await this.logger.logFileStatus(url, { status: 'downloaded', size: buffer.length });
      }

      console.log('✅ Crawled:', url);
    } catch (error) {
      console.warn('⚠️ Error en crawl:', url, error.message);
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
      return path.join(this.downloadDir, rel);
    } catch (e) {
      return null;
    }
  }

  /**
   * Retorna estadísticas del crawl
   */
  getStats() {
    return {
      visited: this.visited.size,
      discovered: this.discovered.size
    };
  }
}

module.exports = Crawler;


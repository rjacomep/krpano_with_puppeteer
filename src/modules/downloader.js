/**
 * Downloader Module
 * =============================================================================
 * Módulo para gestionar la descarga de archivos
 * 
 * Responsabilidades:
 * - Descargar archivos base del tour
 * - Descargar tiles
 * - Descargar recursos secundarios
 * - Manejar reintentos
 * - Respetar límites de concurrencia
 * 
 * Uso:
 *   const downloader = new Downloader(config, logger, antiWaf, queue);
 *   await downloader.downloadBaseFiles();
 * =============================================================================
 */

const fs = require('fs-extra');
const path = require('path');

class Downloader {
  constructor(config, logger, antiWaf, queue) {
    this.config = config;
    this.logger = logger;
    this.antiWaf = antiWaf;
    this.queue = queue;
    this.tourUrl = config.get('tour.baseUrl');
    this.downloadDir = config.get('download.outputDir');
    this.maxRetries = config.get('download.maxRetries') || 5;
  }

  /**
   * Descarga archivos base del tour
   */
  async downloadBaseFiles() {
    console.log('📄 Descargando archivos base del tour...');
    const baseFiles = this.config.get('tour.baseFiles') || ['index.html', 'tour.js', 'krpano.js'];

    for (const file of baseFiles) {
      try {
        const url = this.tourUrl + file;
        const targetPath = path.join(this.downloadDir, file);

        if (await fs.pathExists(targetPath)) {
          console.log(`⏭️ ${file} ya existe, saltando`);
          continue;
        }

        await this.antiWaf.sleep(this.antiWaf.baseDelayMs + this.antiWaf.getJitter());
        const res = await this.antiWaf.fetchWithHeaders(url, { retryOnBlock: false });

        if (!res.ok) {
          console.log(`⚠️ Error descargando ${file}: HTTP ${res.status}`);
          continue;
        }

        const ab = await res.arrayBuffer();
        const buffer = Buffer.from(ab);
        await fs.outputFile(targetPath, buffer);
        await this.logger.logFileStatus(url, { status: 'downloaded', size: buffer.length });
        console.log('✅ Descargado:', file);
      } catch (error) {
        console.error(`❌ Error con ${file}:`, error.message);
      }
    }
  }

  /**
   * Descarga XML principal
   */
  async downloadMainXml() {
    console.log('📄 Descargando XML principal del tour...');
    const xmlUrl = this.tourUrl + this.config.get('tour.xmlFile');
    const xmlPath = path.join(this.downloadDir, this.config.get('tour.xmlFile'));

    if (await fs.pathExists(xmlPath)) {
      console.log('⏭️ XML ya existe, saltando');
      return xmlPath;
    }

    try {
      await this.antiWaf.sleep(this.antiWaf.baseDelayMs + this.antiWaf.getJitter());
      const res = await this.antiWaf.fetchWithHeaders(xmlUrl);
      const xmlText = await res.text();
      await fs.outputFile(xmlPath, xmlText);
      await this.logger.logFileStatus(xmlUrl, { status: 'downloaded', size: Buffer.byteLength(xmlText, 'utf8') });
      console.log('✅ XML descargado');
      return xmlPath;
    } catch (error) {
      console.error('❌ Error descargando XML:', error.message);
      throw error;
    }
  }

  /**
   * Descarga un tile con reintentos
   */
  async downloadTile(tile, attempt = 1) {
    try {
      if (await fs.pathExists(tile.path)) {
        await this.logger.logFileStatus(tile.url, { status: 'already_exists' });
        return;
      }

      await this.antiWaf.sleep(this.antiWaf.baseDelayMs + this.antiWaf.getJitter());
      const res = await this.antiWaf.fetchWithHeaders(tile.url, { retryOnBlock: false });

      if (res.status === 403 || res.status === 429) {
        await this.logger.logFileStatus(tile.url, { status: 'skipped', code: res.status });
        console.log(`⏭️ Tile bloqueado ${tile.relativePath || tile.url} (${res.status})`);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const ab = await res.arrayBuffer();
      const buffer = Buffer.from(ab);
      await fs.ensureDir(path.dirname(tile.path));
      await fs.outputFile(tile.path, buffer);
      await this.logger.logFileStatus(tile.url, { 
        status: 'downloaded', 
        size: buffer.length, 
        attempts: attempt 
      });
      console.log('✅', tile.relativePath || tile.url);

    } catch (error) {
      if (attempt <= this.maxRetries) {
        const backoff = this.antiWaf.retryBackoffBase * Math.pow(2, attempt) + this.antiWaf.getJitter();
        console.log(`🔁 Reintento ${attempt}/${this.maxRetries} en ${backoff}ms`);
        await this.antiWaf.sleep(backoff);
        return this.downloadTile(tile, attempt + 1);
      } else {
        await this.logger.logFileStatus(tile.url, {
          status: 'failed',
          error: error.message
        });
        console.error('❌ Falló:', tile.relativePath || tile.url);
      }
    }
  }

  /**
   * Descarga conjunto de tiles
   */
  async downloadTiles(tiles) {
    console.log(`🖼️ Descargando ${tiles.length} tiles...`);
    
    for (const tile of tiles) {
      this.queue.add(() => this.downloadTile(tile));
    }

    await this.queue.onIdle();
    console.log('🎉 Descarga de tiles completada');
  }

  /**
   * Descarga recurso genérico (HTML, CSS, JS)
   */
  async downloadResource(url, localPath, contentType = 'text') {
    try {
      await this.antiWaf.sleep(this.antiWaf.baseDelayMs + this.antiWaf.getJitter());
      const res = await this.antiWaf.fetchWithHeaders(url, { retryOnBlock: false });

      if (res.status === 403 || res.status === 429) {
        await this.logger.logFileStatus(url, { status: 'skipped', code: res.status });
        return;
      }

      if (!res.ok) return;

      await fs.ensureDir(path.dirname(localPath));

      if (contentType === 'text' || /application\/xml|text\/xml|text\/html|application\/javascript|text\/javascript|application\/json|text\/css/.test(contentType)) {
        const text = await res.text();
        await fs.outputFile(localPath, text, 'utf8');
        await this.logger.logFileStatus(url, { status: 'downloaded', size: Buffer.byteLength(text, 'utf8') });
      } else {
        const ab = await res.arrayBuffer();
        const buffer = Buffer.from(ab);
        await fs.outputFile(localPath, buffer);
        await this.logger.logFileStatus(url, { status: 'downloaded', size: buffer.length });
      }

      console.log('✅ Recurso descargado:', url);
    } catch (error) {
      console.warn('⚠️ Error descargando recurso:', url, error.message);
    }
  }
}

module.exports = Downloader;


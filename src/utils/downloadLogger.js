/**
 * Download Logger
 * =============================================================================
 * Módulo para logging centralizado de descargas y eventos
 * 
 * Responsabilidades:
 * - Mantener log de descargas
 * - Registrar errores y bloqueos
 * - Persistir estado para reanudación
 * - Generar reportes de descarga
 * 
 * Uso:
 *   const logger = new DownloadLogger(config);
 *   await logger.logFileStatus(url, { status: 'downloaded', size: 1024 });
 * =============================================================================
 */

const fs = require('fs-extra');
const path = require('path');

class DownloadLogger {
  constructor(config) {
    this.config = config;
    this.logDir = config.get('download.logDir') || './tour_offline';
    this.logFile = path.join(this.logDir, config.get('download.logFile') || 'download_log.json');
    this.downloadLog = {
      startedAt: new Date().toISOString(),
      files: {}
    };
    this.init();
  }

  /**
   * Inicializa el logger
   */
  async init() {
    try {
      await fs.ensureDir(this.logDir);
      
      // Cargar log existente si existe
      if (await fs.pathExists(this.logFile)) {
        const existing = await fs.readJson(this.logFile);
        if (existing && existing.files) {
          this.downloadLog = existing;
        }
      }
    } catch (error) {
      console.error('❌ Error inicializando logger:', error.message);
    }
  }

  /**
   * Registra estado de un archivo
   */
  async logFileStatus(url, data) {
    try {
      this.downloadLog.files[url] = {
        ...(this.downloadLog.files[url] || {}),
        ...data,
        updatedAt: new Date().toISOString()
      };
      await this.write();
    } catch (error) {
      console.error('⚠️ Error escribiendo log:', error.message);
    }
  }

  /**
   * Escribe log a disco
   */
  async write() {
    try {
      await fs.outputJson(this.logFile, this.downloadLog, { spaces: 2 });
    } catch (error) {
      console.error('⚠️ Error escribiendo archivo de log:', error.message);
    }
  }

  /**
   * Obtiene estadísticas de descarga
   */
  getStats() {
    const files = Object.values(this.downloadLog.files || {});
    const stats = {
      total: files.length,
      downloaded: files.filter(f => f.status === 'downloaded').length,
      failed: files.filter(f => f.status === 'failed').length,
      skipped: files.filter(f => f.status === 'skipped').length,
      blocked: files.filter(f => f.status === 'blocked').length,
      totalBytes: files.reduce((sum, f) => sum + (f.size || 0), 0)
    };
    return stats;
  }

  /**
   * Obtiene archivo de descarga de URL
   */
  getFileStatus(url) {
    return this.downloadLog.files[url] || null;
  }

  /**
   * Verifica si un archivo ya fue descargado
   */
  isDownloaded(url) {
    const status = this.getFileStatus(url);
    return status && status.status === 'downloaded';
  }

  /**
   * Genera reporte de descarga
   */
  generateReport() {
    const stats = this.getStats();
    return {
      generatedAt: new Date().toISOString(),
      startedAt: this.downloadLog.startedAt,
      statistics: stats,
      downloadLog: this.downloadLog
    };
  }
}

module.exports = DownloadLogger;


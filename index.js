#!/usr/bin/env node
/**
 * KRPANO Downloader - Main Entry Point
 * =============================================================================
 * Aplicación modular para descargar tours panorámicos krpano offline con
 * soporte para capturas de pantalla mediante Puppeteer
 * 
 * Funcionalidades:
 * - Descarga offline completa de tours krpano
 * - Scraping de recursos con protección anti-WAF
 * - Capturas de pantalla automáticas en múltiples orientaciones
 * - Logging persistente para reanudación de descargas
 * - Configuración flexible via YAML
 * 
 * Uso:
 *   node index.js                           # Crawl normal
 *   node index.js --puppeteer               # Con Puppeteer
 *   node index.js --puppeteer --screenshots # Capturar screenshots
 *   node index.js --puppeteer --show        # Mostrar navegador
 * 
 * =============================================================================
 */

const fs = require('fs-extra');
const path = require('path');
const PQueue = require('p-queue').default;

// Importar módulos
const ConfigLoader = require('./src/lib/configLoader');
const AntiWafManager = require('./src/utils/antiWaf');
const DownloadLogger = require('./src/utils/downloadLogger');
const XmlParser = require('./src/lib/xmlParser');
const Downloader = require('./src/modules/downloader');
const Crawler = require('./src/modules/crawler');
const Screenshotter = require('./src/modules/screenshotter');

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando KRPANO Downloader\n');

    // 1. Cargar configuración
    console.log('⚙️  Cargando configuración...');
    const config = new ConfigLoader(path.join(__dirname, 'config.yaml'));
    config.validate();

    // 2. Crear directorio de descarga
    const downloadDir = config.get('download.outputDir');
    await fs.ensureDir(downloadDir);

    // 3. Inicializar componentes
    const logger = new DownloadLogger(config);
    const antiWaf = new AntiWafManager(config);
    const xmlParser = new XmlParser(config);
    const queue = new PQueue({ concurrency: config.get('download.maxParallel') || 5 });

    // 4. Crear instancias de módulos
    const downloader = new Downloader(config, logger, antiWaf, queue);
    const crawler = new Crawler(config, logger, antiWaf, queue, xmlParser);

    // 5. Descargar archivos base
    await downloader.downloadBaseFiles();

    // 6. Descargar XML principal
    const xmlPath = await downloader.downloadMainXml();

    // 7. Parsear XML
    console.log('🔍 Parseando XML...');
    const xmlData = await xmlParser.parseXmlFile(xmlPath);

    // 8. Extraer tiles del XML
    const tiles = xmlParser.extractTiles(xmlData, config.get('tour.baseUrl'), downloadDir);

    // 9. Decidir flujo: Puppeteer o Crawl normal
    const usePuppeteer = process.argv.includes('--puppeteer') || process.env.USE_PUPPETEER;
    const takeScreenshots = process.argv.includes('--screenshots');

    if (usePuppeteer) {
      console.log('\n📸 Modo Puppeteer activado\n');
      const screenshotter = new Screenshotter(config, logger, xmlData);
      await screenshotter.captureScreenshots();
    } else {
      console.log('\n🕷️ Modo Crawl normal\n');
      // Crawl de recursos
      const seedUrls = tiles.map(t => t.url);
      await crawler.crawl(seedUrls);
    }

    // 10. Descargar tiles
    console.log('\n📥 Descargando tiles...');
    await downloader.downloadTiles(tiles);

    // 11. Generar reporte final
    console.log('\n📊 Generando reporte...');
    const stats = logger.getStats();
    console.log('\n✅ DESCARGA COMPLETADA');
    console.log('════════════════════════════════════════');
    console.log(`📊 Estadísticas Finales:`);
    console.log(`   Total de archivos: ${stats.total}`);
    console.log(`   Descargados: ${stats.downloaded}`);
    console.log(`   Fallidos: ${stats.failed}`);
    console.log(`   Saltados (bloqueados): ${stats.skipped}`);
    console.log(`   Bloqueados (403/429): ${stats.blocked}`);
    console.log(`   Tamaño total: ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log('════════════════════════════════════════\n');

    console.log(`📁 Recursos guardados en: ${downloadDir}`);
    console.log(`📋 Log de descarga: ${logger.logFile}`);

    if (takeScreenshots) {
      const screenshotDir = config.get('screenshots.outputDir');
      console.log(`📸 Screenshots guardados en: ${screenshotDir}`);
    }

    console.log('\n🎉 ¡Proceso completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();


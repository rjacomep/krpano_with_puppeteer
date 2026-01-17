/**
 * ConfigLoader
 * =============================================================================
 * Módulo para cargar la configuración desde archivo YAML o JSON
 * 
 * Responsabilidades:
 * - Cargar configuración desde config.yaml
 * - Validar configuración requerida
 * - Proporcionar acceso centralizado a todas las variables
 * - Permitir sobrescribir configuración con variables de entorno
 * 
 * Uso:
 *   const config = require('./src/lib/configLoader');
 *   console.log(config.tour.baseUrl);
 * =============================================================================
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class ConfigLoader {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../../config.yaml');
    this.config = null;
    this.load();
  }

  /**
   * Carga la configuración desde archivo YAML
   */
  load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found: ${this.configPath}`);
      }
      
      const fileContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = yaml.load(fileContent);
      
      // Aplicar variables de entorno (override)
      this.applyEnvironmentOverrides();
      
      console.log('✅ Configuración cargada desde:', this.configPath);
    } catch (error) {
      console.error('❌ Error cargando configuración:', error.message);
      throw error;
    }
  }

  /**
   * Aplica valores de variables de entorno sobre la configuración
   */
  applyEnvironmentOverrides() {
    const envMap = {
      'KRPANO_TOUR_URL': 'tour.baseUrl',
      'KRPANO_OUTPUT_DIR': 'download.outputDir',
      'KRPANO_MAX_PARALLEL': 'download.maxParallel',
      'KRPANO_MAX_RETRIES': 'download.maxRetries',
      'KRPANO_PUPPETEER_HEADLESS': 'puppeteer.headless',
      'KRPANO_SCREENSHOTS_ENABLED': 'screenshots.enabled',
      'KRPANO_LOG_LEVEL': 'logging.level'
    };

    for (const [envKey, configPath] of Object.entries(envMap)) {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        this.setNested(this.config, configPath, envValue);
      }
    }
  }

  /**
   * Establece valor en objeto anidado usando path (ej: "tour.baseUrl")
   */
  setNested(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Obtiene valor del config (ej: config.get('tour.baseUrl'))
   */
  get(path) {
    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Retorna la configuración completa
   */
  getAll() {
    return this.config;
  }

  /**
   * Valida que todos los valores requeridos estén presentes
   */
  validate() {
    const required = [
      'tour.baseUrl',
      'download.outputDir',
      'download.maxParallel',
      'request.baseDelayMs'
    ];

    const missing = [];
    for (const key of required) {
      if (!this.get(key)) missing.push(key);
    }

    if (missing.length > 0) {
      throw new Error(`Missing required config: ${missing.join(', ')}`);
    }

    return true;
  }
}

module.exports = ConfigLoader;


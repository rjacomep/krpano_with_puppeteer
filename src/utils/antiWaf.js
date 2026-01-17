/**
 * Anti-WAF Utilities
 * =============================================================================
 * Módulo con utilidades anti-WAF para evitar bloqueos durante descargas
 * 
 * Responsabilidades:
 * - Gestionar delays y jitter
 * - Rotación de User-Agents
 * - Fetch con headers anti-WAF
 * - Reintentos con backoff exponencial
 * - Logging de bloqueos
 * 
 * Uso:
 *   const { fetchWithHeaders, sleep } = require('./src/utils/antiWaf');
 * =============================================================================
 */

const fetchMod = require('node-fetch');

class AntiWafManager {
  constructor(config) {
    this.config = config;
    this.baseDelayMs = config.get('request.baseDelayMs') || 300;
    this.jitterMs = config.get('request.jitterMs') || 400;
    this.retryBackoffBase = config.get('request.retryBackoffBase') || 800;
    this.userAgents = config.get('request.userAgents') || [];
  }

  /**
   * Sleep con Promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera jitter aleatorio
   */
  getJitter() {
    return Math.floor(Math.random() * this.jitterMs);
  }

  /**
   * Selecciona User-Agent aleatorio
   */
  getRandomUserAgent() {
    if (this.userAgents.length === 0) {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Fetch con headers anti-WAF
   */
  async fetchWithHeaders(url, options = {}) {
    const userAgent = this.getRandomUserAgent();
    const tourUrl = this.config.get('tour.baseUrl');
    
    const opts = {
      ...options,
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': tourUrl + 'tour.html',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
        ...options.headers
      }
    };

    try {
      const res = await fetchMod.default(url, opts);
      const retryOnBlock = options.retryOnBlock !== false;
      
      if (res.status === 403 || res.status === 429) {
        if (!retryOnBlock) return res;
        
        const wait = 5000 + Math.random() * 5000;
        console.log(`⚠️ Bloqueo detectado (${res.status}) en ${url}, esperando ${Math.round(wait)}ms`);
        await this.sleep(wait);
        return this.fetchWithHeaders(url, options);
      }
      
      return res;
    } catch (err) {
      const wait = 3000 + Math.random() * 3000;
      console.log(`⚠️ Error fetch (${err.message}) en ${url}, esperando ${Math.round(wait)}ms`);
      await this.sleep(wait);
      return this.fetchWithHeaders(url, options);
    }
  }

  /**
   * Fetch con reintentos y backoff
   */
  async fetchWithRetry(url, options = {}, attempt = 1, maxRetries = 5) {
    try {
      await this.sleep(this.baseDelayMs + this.getJitter());
      const res = await this.fetchWithHeaders(url, options);
      return res;
    } catch (err) {
      if (attempt <= maxRetries) {
        const backoff = this.retryBackoffBase * Math.pow(2, attempt) + this.getJitter();
        console.log(`🔁 Reintento ${attempt}/${maxRetries} en ${backoff}ms`);
        await this.sleep(backoff);
        return this.fetchWithRetry(url, options, attempt + 1, maxRetries);
      }
      throw err;
    }
  }
}

module.exports = AntiWafManager;


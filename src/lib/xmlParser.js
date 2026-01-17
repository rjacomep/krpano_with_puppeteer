/**
 * XML Parser Module
 * =============================================================================
 * Módulo para parsear y extraer información de archivos XML de krpano
 * 
 * Responsabilidades:
 * - Parsear XML de tour
 * - Extraer información de escenas
 * - Extraer información de tiles
 * - Extraer URLs de recursos
 * - Validar estructura XML
 * 
 * Uso:
 *   const xmlParser = new XmlParser(config);
 *   const scenes = await xmlParser.parseXml(xmlPath);
 * =============================================================================
 */

const fs = require('fs-extra');
const xml2js = require('xml2js');

class XmlParser {
  constructor(config) {
    this.config = config;
    this.parser = new xml2js.Parser();
  }

  /**
   * Parsea archivo XML y retorna objeto XML parseado
   */
  async parseXmlFile(xmlPath) {
    try {
      const xmlContent = await fs.readFile(xmlPath, 'utf-8');
      const xmlData = await this.parser.parseStringPromise(xmlContent);
      console.log('✅ XML parseado exitosamente');
      return xmlData;
    } catch (error) {
      throw new Error(`Error parseando XML: ${error.message}`);
    }
  }

  /**
   * Extrae todas las escenas del XML
   */
  extractScenes(xmlData) {
    const scenes = [];
    try {
      const sceneList = (xmlData && xmlData.krpano && Array.isArray(xmlData.krpano.scene))
        ? xmlData.krpano.scene
        : [];

      for (const scene of sceneList) {
        const sceneInfo = {
          name: scene.$ && scene.$.name ? scene.$.name : 'unnamed',
          title: scene.title && scene.title[0] ? scene.title[0] : null,
          preview: null,
          tileFolder: null,
          defaultHeading: 0,
          layers: [],
          tiles: []
        };

        // Extraer heading por defecto
        try {
          if (scene.view && scene.view[0] && scene.view[0].$ && scene.view[0].$.hlookat) {
            sceneInfo.defaultHeading = parseFloat(scene.view[0].$.hlookat) || 0;
          }
        } catch (e) {}

        // Extraer preview URL
        try {
          if (scene.preview && scene.preview[0] && scene.preview[0].$.url) {
            sceneInfo.preview = scene.preview[0].$.url;
            const m = /panos\/([^\/]+\.tiles)/.exec(scene.preview[0].$.url);
            if (m) sceneInfo.tileFolder = m[1];
          }
        } catch (e) {}

        // Extraer carpeta de tiles del image.cube
        try {
          if (!sceneInfo.tileFolder && scene.image && scene.image[0] && scene.image[0].cube) {
            const cubeUrl = scene.image[0].cube[0].$ && scene.image[0].cube[0].$.url;
            if (cubeUrl) {
              const m2 = /panos\/([^\/]+\.tiles)/.exec(cubeUrl);
              if (m2) sceneInfo.tileFolder = m2[1];
            }
          }
        } catch (e) {}

        scenes.push(sceneInfo);
      }
    } catch (error) {
      console.warn('⚠️ Error extrayendo escenas:', error.message);
    }

    return scenes;
  }

  /**
   * Extrae todas las capas del XML
   */
  extractLayers(xmlData) {
    const layers = [];
    try {
      const layerList = (xmlData && xmlData.krpano && Array.isArray(xmlData.krpano.layer))
        ? xmlData.krpano.layer
        : [];

      for (const layer of layerList) {
        if (layer.$ && layer.$.name) {
          layers.push({
            name: layer.$.name,
            type: layer.$.type || 'image',
            isSpot: /spot|hotspot/i.test(layer.$.name)
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Error extrayendo capas:', error.message);
    }

    return layers;
  }

  /**
   * Extrae todos los tiles del XML
   */
  extractTiles(xmlData, tourUrl, baseDir) {
    const tiles = [];
    const path = require('path');

    try {
      const sceneList = (xmlData && xmlData.krpano && Array.isArray(xmlData.krpano.scene))
        ? xmlData.krpano.scene
        : [];

      for (const scene of sceneList) {
        const sceneName = scene.$ && scene.$.name ? scene.$.name : 'scene';

        if (scene.cube) {
          for (const cube of scene.cube) {
            for (const face of cube.face || []) {
              for (const level of face.level || []) {
                for (const tile of level.tile || []) {
                  if (tile.$ && tile.$.url) {
                    const tileUrl = tile.$.url.startsWith('http')
                      ? tile.$.url
                      : tourUrl + tile.$.url;

                    tiles.push({
                      url: tileUrl,
                      path: path.join(
                        baseDir,
                        sceneName,
                        'cube',
                        face.$ && face.$.name ? face.$.name : 'face',
                        level.$ && level.$.name ? level.$.name : 'level',
                        require('path').basename(tile.$.url)
                      ),
                      relativePath: tile.$.url,
                      sceneName: sceneName
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error extrayendo tiles:', error.message);
    }

    console.log(`🖼️ Se encontraron ${tiles.length} tiles`);
    return tiles;
  }

  /**
   * Extrae URLs de atributos HTML/CSS/JS
   */
  extractUrls(text, baseUrl) {
    const urls = new Set();

    // Atributos href/src
    const attrRegex = /(?:href|src)=["']([^"']+)["']/gi;
    let m;
    while ((m = attrRegex.exec(text))) urls.add(m[1]);

    // URLs en CSS
    const urlFunc = /url\((?:"|')?([^"')]+)(?:"|'|)\)/gi;
    while ((m = urlFunc.exec(text))) urls.add(m[1]);

    // URLs absolutas
    const absRegex = /https?:\/\/[^\s"'()<>]+/gi;
    while ((m = absRegex.exec(text))) urls.add(m[0]);

    // Paths relativos a /recorridos
    const recRegex = /["'](\/recorridos\/[^"]+)["']/gi;
    while ((m = recRegex.exec(text))) urls.add(m[1]);

    // Resolver URLs
    const resolved = [];
    for (const u of urls) {
      try {
        resolved.push(new URL(u, baseUrl).toString());
      } catch (e) {}
    }

    return resolved;
  }
}

module.exports = XmlParser;


# Krpano QA Tester - Documentación en Español (Latinoamérica)

**Marco de Automatización QA Basado en Puppeteer para Pruebas de Tours Panorámicos Krpano 360°**

[Volver a Selección de Idioma](../../README_MAIN.md)

---

## 🎯 Propósito

Este proyecto es un **marco de automatización de pruebas QA** para probar tours panorámicos basados en krpano y experiencias 3D. Proporciona herramientas para:

- **Pruebas Automatizadas**: Prueba programáticamente la funcionalidad, navegación e interactividad del tour
- **Pruebas de Regresión Visual**: Captura capturas de pantalla en múltiples orientaciones y estados para comparación visual
- **Documentación QA**: Genera reportes visuales integrales del contenido del tour para propósitos de prueba
- **Creación de Espejo Offline**: Crea ambientes de prueba locales que reflejan tours de producción para pipelines CI/CD
- **Pruebas de Compatibilidad**: Prueba tours en diferentes tamaños de viewport y patrones de interacción
- **Análisis de Rendimiento**: Monitorea tiempos de carga de activos y métricas de rendimiento durante tours automatizados

---

## ✅ Declaración de Uso Legal

**Esta herramienta está diseñada para equipos de aseguramiento de calidad y desarrolladores que prueben tours krpano que posean o tengan autorización explícita para probar.**

### Usos Autorizados:
✅ Prueba de tours en tu infraestructura  
✅ Automatización QA para equipos de desarrollo  
✅ Integración con pipeline CI/CD  
✅ Pruebas de rendimiento y compatibilidad  
✅ Reportes internos y documentación visual  

### No para:
❌ Pruebas no autorizadas  
❌ Redistribución de contenido  
❌ Eludir controles de acceso  

**Siempre asegúrate de tener autorización antes de probar cualquier tour.**

---

## ✨ Características Principales

### Pruebas QA Automatizadas
- Automatización de navegador headless para pruebas consistentes
- Navegación programática de escenas e interacción
- Verificación de estado y manejo de timeouts
- Logging y reportes detallados de ejecución de pruebas

### Reportes de QA Visual
- Generación de capturas en múltiples ángulos (8 orientaciones por escena)
- Capturas en modo limpio (sin elementos interactivos)
- Generación automática de miniaturas para revisión rápida
- Reportes integrales con metadatos

### Ambiente de Prueba
- Crea espejo offline del tour para pruebas aisladas
- Valida todos los activos del tour durante la creación del espejo
- Logging persistente para debugging de pruebas
- Rastreo y reportaje de activos fallidos

### Arquitectura Profesional
- Diseño modular (7 componentes independientes)
- Configuración YAML centralizada
- Inyección de dependencias para testabilidad
- Separación clara de responsabilidades

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar asistente de configuración
npm run config

# Probar con tour de ejemplo (desde config.yaml)
npm test

# Generar capturas QA
npm run test-show

# Ver reportes detallados
npm run reports
```

---

## 📁 Estructura del Proyecto

```
krpano-qa-tester/
├── config.yaml                    # Configuración de pruebas
├── index.js                       # Punto de entrada principal
├── package.json                   # Metadatos del proyecto
├── README.md                      # Documentación
│
├── src/                           # Código fuente
│   ├── lib/                       # Librerías principales
│   │   ├── configLoader.js        # Carga y validación YAML
│   │   └── xmlParser.js           # Análisis de XML krpano
│   │
│   ├── utils/                     # Utilidades
│   │   ├── antiWaf.js             # Throttling respetuoso
│   │   └── downloadLogger.js      # Logging de pruebas
│   │
│   └── modules/                   # Módulos de prueba
│       ├── downloader.js          # Descubrimiento de activos
│       ├── crawler.js             # Análisis de estructura
│       └── screenshotter.js       # Captura QA visual
│
├── tour_offline/                  # Ambiente de prueba
│   ├── index.html
│   ├── tour.xml
│   ├── download_log.json
│   └── recorridos/
│
└── screenshots/                   # Salida QA
    ├── report.json
    └── [nombre-escena].tiles/
```

---

## 🔧 Instalación

### Requisitos Previos

- **Node.js** v16+ (recomendado v18+)
- **npm** o **yarn**
- Conexión a internet
- Para capturas: **Chromium** (se instala automáticamente con Puppeteer)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/rjacomep/krpano_with_puppeteer.git
   cd krpano_with_puppeteer
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Verificar instalación**
   ```bash
   node index.js --help
   ```

### Dependencias Principales

| Paquete | Propósito |
|---------|-----------|
| `puppeteer@24.35` | Automatización de navegador headless |
| `xml2js@0.6` | Parsing de XML krpano |
| `node-fetch@3.3` | Solicitudes HTTP para descubrimiento |
| `p-queue@8.1` | Gestión de concurrencia |
| `js-yaml@4.1` | Configuración YAML |

---

## ⚙️ Configuración

### config.yaml - Parámetros de Prueba

Todos los parámetros de prueba están centralizados en `config.yaml`:

```yaml
# Tour objetivo de prueba
tour:
  baseUrl: "https://ejemplo.com/tours/mi-tour/"
  xmlFile: "tour.xml"
  baseFiles:
    - "index.html"
    - "tour.js"
    - "krpano.js"

# Ambiente y salida de pruebas
download:
  outputDir: "./tour_offline"
  logDir: "./tour_offline"
  logFile: "download_log.json"
  maxParallel: 5
  maxRetries: 5

# Comportamiento de pruebas HTTP
request:
  baseDelayMs: 300
  jitterMs: 400
  retryBackoffBase: 800
  userAgents:
    - "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
    - "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6)..."

# Configuración de automatización del navegador
puppeteer:
  headless: true
  viewport:
    width: 1280
    height: 800
  navigationTimeout: 60000
  viewLoadTimeout: 8000

# Pruebas de regresión visual
screenshots:
  enabled: true
  outputDir: "./screenshots"
  orientations:
    - name: "axis0"
      heading: 0
      vlookat: 0
  modes:
    - name: "full"
      fov: 90
    - name: "clean"
      fov: 120
```

---

## 🧪 Ejemplos de Uso

### Prueba Básica

```bash
# Ejecutar prueba QA completa
npm test
```

Salida esperada:
```
🔍 Descubriendo estructura del tour...
✅ Analizadas 16 escenas
📸 Capturando 8 orientaciones por escena...
✅ Escena 1: 16/16 capturas realizadas
...
📊 Resumen de Prueba QA:
   Total de escenas: 16
   Capturas realizadas: 256
   Duración: 8m 23s
   Estado: ✅ APROBADO
```

### Con Navegador Visible

```bash
# Ejecutar con ventana visible
npm run test -- --show
```

### Reporte Solo

```bash
# Ejecutar en tour pre-espejeado
npm run test-show
```

---

## 🎯 Casos de Uso

### Integración CI/CD

```bash
#!/bin/bash
npm install
npm test
if [ $? -eq 0 ]; then
  echo "✅ Prueba QA aprobada"
  npm run deploy
fi
```

### Pruebas de Regresión Visual

```bash
npm test -- --label "v1.0"
npm test -- --label "v2.0"
npm run compare-report
```

---

## 📊 Referencia de API de Módulos

### ConfigLoader

```javascript
const ConfigLoader = require('./src/lib/configLoader');
const config = new ConfigLoader('./config.yaml');
const tourUrl = config.get('tour.baseUrl');
```

### XmlParser

```javascript
const XmlParser = require('./src/lib/xmlParser');
const parser = new XmlParser('./tour_offline/tour.xml');
const scenes = parser.getScenesFromTour();
```

---

## 📈 Archivos y Reportes de Salida

### Espejo del Ambiente de Prueba

```
tour_offline/
├── index.html
├── tour.xml
├── download_log.json
└── recorridos/
```

### Reporte de Capturas QA

```
screenshots/
├── report.json
└── [nombre-escena].tiles/
```

---

## 🐛 Solución de Problemas

### Timeout de Puppeteer

**Problema:** `navigationTimeout exceeded`

**Solución:** Aumentar timeout en config.yaml

### Falla en Descarga de Activos

**Problema:** Algunos activos retornan 403/429

**Soluciones:** Aumentar delay, agregar más reintentos

### Problemas de Memoria

**Problema:** Heap de Node.js agotado

**Solución:**
```bash
node --max-old-space-size=4096 index.js
```

---

## 🔗 Versiones Krpano Soportadas

- krpano 1.x, 2.x, 3.x
- Todos los formatos panorámicos (cubemap, esférico)
- Renderizadores HTML5 & WebGL

---

## 📝 Licencia

Licencia MIT - Ver archivo LICENSE para detalles.

---

**Versión:** 2.0.0 | **Estado:** ✅ Listo para Producción  
[Selección de Idioma](../../README_MAIN.md)

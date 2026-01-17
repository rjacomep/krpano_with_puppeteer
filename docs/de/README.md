# Krpano QA Tester - Deutsche Dokumentation (Schweiz)

**Puppeteer-Automatisierungsframework für Krpano-QA-Tests**

[Zur Sprachauswahl zurück](../../README_MAIN.md)

---

## 🎯 Zweck

Dieses Projekt ist ein **QA-Automatisierungsframework** zum Testen von krpano-basierten Panoramatouren und 3D-Erlebnissen. Es bietet Werkzeuge für:

- **Automatisierte Tests**: Programmatisches Testen von Tour-Funktionalität, Navigation und Interaktivität
- **Visuelles Regressionstesting**: Screenshots in mehreren Ausrichtungen und Zuständen für visuellen Vergleich
- **QA-Dokumentation**: Umfassende visuelle Berichte des Tour-Inhalts für Testzwecke
- **Offline-Spiegelbildung**: Erstelle lokale Testumgebungen, die Produktionstouren für CI/CD-Pipelines widerspiegeln
- **Kompatibilitätstests**: Teste Touren in verschiedenen Viewport-Grössen und Interaktionsmustern
- **Leistungsanalyse**: Überwache Asset-Ladezeiten und Leistungsmesswerte während automatisierter Touren

---

## ✅ Rechtliche Nutzungserklärung

**Dieses Werkzeug ist für QA-Teams und Entwickler konzipiert, um krpano-Touren zu testen, die sie besitzen oder eine explizite Genehmigung zum Testen haben.**

### Genehmigte Verwendungen:
✅ Testen von Touren in deiner Infrastruktur  
✅ QA-Automatisierung für Entwicklungsteams  
✅ CI/CD-Pipeline-Integration  
✅ Leistungs- und Kompatibilitätstests  
✅ Interne Dokumentation und visuelle Berichte  

### Nicht für:
❌ Nicht autorisierte Tests  
❌ Umverteilung von Inhalten  
❌ Umgehen von Zugriffskontrollmassnahmen  

**Stelle immer sicher, dass du eine Genehmigung hast, bevor du einen Tour testest.**

---

## ✨ Hauptmerkmale

### Automatisierte QA-Tests
- Headless-Browser-Automatisierung für konsistente Tests
- Programmgesteuerte Szenenschifffahrt und Interaktion
- Zustandsprüfung und Timeout-Handling
- Detailliertes Test-Logging und Reporting

### Visuelle QA-Berichterstattung
- Multi-Winkel-Screenshot-Generierung (8 Ausrichtungen pro Szene)
- Bereinigter Modus-Screenshots (ohne interaktive Elemente)
- Automatische Thumbnail-Generierung für schnelle Überprüfung
- Umfassende Berichte mit Metadaten

### Test-Umgebung
- Erstellt Offline-Spiegel der Tour für isolierte Tests
- Validiert alle Tour-Assets während der Spiegelbildung
- Persistentes Logging zum Debuggen von Tests
- Nachverfolgung und Reporting fehlgeschlagener Assets

### Professionelle Architektur
- Modulare Gestaltung (7 unabhängige Komponenten)
- Zentralisierte YAML-Konfiguration
- Dependency Injection für Testbarkeit
- Saubere Trennung der Verantwortlichkeiten

---

## 🚀 Schnellstart

```bash
# Abhängigkeiten installieren
npm install

# Konfigurationsassistent ausführen
npm run config

# Mit Beispiel-Tour testen (aus config.yaml)
npm test

# QA-Screenshots generieren
npm run test-show

# Detaillierte Berichte anzeigen
npm run reports
```

---

## 📁 Projektstruktur

```
krpano-qa-tester/
├── config.yaml                    # Test-Konfiguration
├── index.js                       # Haupteinstiegspunkt
├── package.json                   # Projektmetadaten
├── README.md                      # Dokumentation
│
├── src/                           # Quellcode
│   ├── lib/                       # Kernbibliotheken
│   │   ├── configLoader.js        # YAML-Laden und -Validierung
│   │   └── xmlParser.js           # krpano-XML-Analyse
│   │
│   ├── utils/                     # Utilities
│   │   ├── antiWaf.js             # Respektvolles Drosseln
│   │   └── downloadLogger.js      # Test-Logging
│   │
│   └── modules/                   # Test-Module
│       ├── downloader.js          # Asset-Ermittlung
│       ├── crawler.js             # Strukturanalyse
│       └── screenshotter.js       # Visuelle QA
│
├── tour_offline/                  # Test-Umgebung
│   ├── index.html
│   ├── tour.xml
│   ├── download_log.json
│   └── recorridos/
│
└── screenshots/                   # QA-Ausgabe
    ├── report.json
    └── [scene-name].tiles/
```

---

## 🔧 Installation

### Voraussetzungen

- **Node.js** v16+ (v18+ empfohlen)
- **npm** oder **yarn**
- Internetverbindung
- Für Screenshots: **Chromium** (wird automatisch mit Puppeteer installiert)

### Installationsschritte

1. **Repository klonen**
   ```bash
   git clone https://github.com/rjacomep/krpano_with_puppeteer.git
   cd krpano_with_puppeteer
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Installation überprüfen**
   ```bash
   node index.js --help
   ```

### Kernabhängigkeiten

| Paket | Zweck |
|-------|-------|
| `puppeteer@24.35` | Headless-Browser-Automatisierung |
| `xml2js@0.6` | krpano-XML-Parsing |
| `node-fetch@3.3` | HTTP-Anfragen für Asset-Ermittlung |
| `p-queue@8.1` | Concurrency-Management |
| `js-yaml@4.1` | YAML-Konfiguration |

---

## ⚙️ Konfiguration

### config.yaml - Test-Parameter

Alle Test-Parameter sind in `config.yaml` zentralisiert:

```yaml
# Test-Ziel-Tour
tour:
  baseUrl: "https://beispiel.com/touren/meine-tour/"
  xmlFile: "tour.xml"
  baseFiles:
    - "index.html"
    - "tour.js"
    - "krpano.js"

# Test-Umgebung und -Ausgabe
download:
  outputDir: "./tour_offline"
  logDir: "./tour_offline"
  logFile: "download_log.json"
  maxParallel: 5
  maxRetries: 5

# HTTP-Test-Verhalten
request:
  baseDelayMs: 300
  jitterMs: 400
  retryBackoffBase: 800
  userAgents:
    - "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
    - "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6)..."

# Browser-Automatisierungs-Einstellungen
puppeteer:
  headless: true
  viewport:
    width: 1280
    height: 800
  navigationTimeout: 60000
  viewLoadTimeout: 8000

# Visuelles Regressionstesting
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

## 🧪 Verwendungsbeispiele

### Grundlegender Test

```bash
# Vollständigen QA-Test ausführen
npm test
```

Erwartete Ausgabe:
```
🔍 Tour-Struktur wird ermittelt...
✅ 16 Szenen analysiert
📸 Erfasse 8 Ausrichtungen pro Szene...
✅ Szene 1: 16/16 Screenshots erfasst
...
📊 QA-Test-Zusammenfassung:
   Gesamtszenen: 16
   Screenshots erfasst: 256
   Testdauer: 8m 23s
   Teststatus: ✅ BESTANDEN
```

### Mit sichtbarem Browser

```bash
# Mit sichtbarem Browser-Fenster ausführen
npm run test -- --show
```

### Nur Bericht

```bash
# Auf vorgespiegelter Tour ausführen
npm run test-show
```

---

## 🎯 Anwendungsfälle

### CI/CD-Integration

```bash
#!/bin/bash
npm install
npm test
if [ $? -eq 0 ]; then
  echo "✅ QA-Test bestanden"
  npm run deploy
fi
```

### Visuelles Regressionstesting

```bash
npm test -- --label "v1.0"
npm test -- --label "v2.0"
npm run compare-report
```

---

## 📊 Modul-API-Referenz

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

## 📈 Ausgabedateien und Berichte

### Test-Umgebungs-Spiegel

```
tour_offline/
├── index.html
├── tour.xml
├── download_log.json
└── recorridos/
```

### QA-Screenshot-Bericht

```
screenshots/
├── report.json
└── [scene-name].tiles/
```

---

## 🐛 Fehlerbehebung

### Puppeteer-Timeout

**Problem:** `navigationTimeout exceeded`

**Lösung:** Timeout in config.yaml erhöhen

### Asset-Download schlägt fehl

**Problem:** Einige Assets geben 403/429 zurück

**Lösungen:** Delay erhöhen, mehr Wiederholungen hinzufügen

### Speicherprobleme

**Problem:** Node.js-Heap erschöpft

**Lösung:**
```bash
node --max-old-space-size=4096 index.js
```

---

## 🔗 Unterstützte Krpano-Versionen

- krpano 1.x, 2.x, 3.x
- Alle Panorama-Formate (Cubemap, sphärisch)
- HTML5- und WebGL-Renderer

---

## 📝 Lizenz

MIT-Lizenz - Siehe LICENSE-Datei für Details.

---

**Version:** 2.0.0 | **Status:** ✅ Produktionsreif  
[Zur Sprachauswahl](../../README_MAIN.md)

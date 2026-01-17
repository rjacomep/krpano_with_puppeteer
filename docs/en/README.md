# Krpano QA Tester - English (UK) Documentation

**Puppeteer-Based Automated QA Testing Framework for Krpano 360° Panoramic Tours**

[Back to Language Selection](../../README_MAIN.md)

---

## 🎯 Purpose

This project is a **quality assurance automation framework** for testing krpano-based panoramic tours and 3D experiences. It provides tools for:

- **Automated Testing**: Programmatically test tour functionality, navigation, and interactivity
- **Visual Regression Testing**: Capture screenshots across multiple orientations and states for visual comparison
- **QA Documentation**: Generate comprehensive visual reports of tour content for testing purposes
- **Offline Mirror Creation**: Create local testing environments that mirror production tours for CI/CD pipelines
- **Compatibility Testing**: Test tours across different viewport sizes and interaction patterns
- **Performance Analysis**: Monitor asset loading and performance metrics during automated tours

---

## ✅ Legal Use Statement

**This tool is designed for quality assurance teams and developers to test krpano tours they own or have explicit authorisation to test.**

### Authorised Uses:
✅ Testing tours in your infrastructure  
✅ QA automation for development teams  
✅ CI/CD pipeline integration  
✅ Performance and compatibility testing  
✅ Internal documentation and visual reports  

### Not for:
❌ Unauthorised testing  
❌ Content redistribution  
❌ Circumventing access controls  

**Always ensure you have authorisation before testing any tour.**

---

## ✨ Core Features

### Automated QA Testing
- Headless browser automation for consistent testing
- Programmatic scene navigation and interaction
- State verification and timeout handling
- Detailed test run logging and reporting

### Visual QA Reporting
- Multi-angle screenshot generation (8 orientations per scene)
- Clean mode screenshots (without interactive elements)
- Automatic thumbnail generation for quick review
- Comprehensive test reports with metadata

### Testing Environment
- Creates offline mirror of tour for isolated testing
- Validates all tour assets during mirror creation
- Persistent logging for test debugging
- Failed asset tracking and reporting

### Professional Architecture
- Modular design (7 independent components)
- Centralised YAML configuration
- Dependency injection for testability
- Clean separation of concerns

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run configuration wizard
npm run config

# Test with example tour (from config.yaml)
npm test

# Generate QA screenshots
npm run test-show

# View detailed reports
npm run reports
```

---

## 📁 Project Structure

```
krpano-qa-tester/
├── config.yaml                    # Test configuration (tour URLs, testing parameters)
├── index.js                       # Main entry point
├── package.json                   # Project metadata & dependencies
├── README.md                      # Documentation
│
├── src/                           # Source code
│   ├── lib/                       # Core libraries
│   │   ├── configLoader.js        # YAML config loading & validation
│   │   └── xmlParser.js           # krpano XML structure analysis
│   │
│   ├── utils/                     # Utilities
│   │   ├── antiWaf.js             # Respectful throttling (delay jitter, backoff)
│   │   └── downloadLogger.js      # Test run logging
│   │
│   └── modules/                   # Main testing modules
│       ├── downloader.js          # Asset discovery & mirror creation
│       ├── crawler.js             # Tour structure analysis
│       └── screenshotter.js       # Visual QA screenshot generation
│
├── tour_offline/                  # Test environment (generated)
│   ├── index.html
│   ├── tour.xml                   # Tour configuration
│   ├── download_log.json          # Test run log
│   └── recorridos/                # Mirror structure
│
└── screenshots/                   # QA Output (generated)
    ├── report.json
    └── [scene-name].tiles/        # Screenshots per scene
```

---

## 🔧 Installation

### Prerequisites

- **Node.js** v16+ (v18+ recommended)
- **npm** or **yarn**
- Internet connection
- For screenshots: **Chromium** (auto-installed with Puppeteer)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/rjacomep/krpano_with_puppeteer.git
   cd krpano_with_puppeteer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   node index.js --help
   ```

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `puppeteer@24.35` | Headless browser automation |
| `xml2js@0.6` | krpano XML parsing |
| `node-fetch@3.3` | HTTP requests for asset discovery |
| `p-queue@8.1` | Concurrency management |
| `js-yaml@4.1` | YAML configuration |

---

## ⚙️ Configuration

### config.yaml - Test Parameters

All testing parameters are centralised in `config.yaml`:

```yaml
# Test target tour
tour:
  baseUrl: "https://example.com/tours/my-tour/"  # Tour URL to test
  xmlFile: "tour.xml"
  baseFiles:
    - "index.html"
    - "tour.js"
    - "krpano.js"

# Test environment & output
download:
  outputDir: "./tour_offline"         # Local test mirror
  logDir: "./tour_offline"
  logFile: "download_log.json"
  maxParallel: 5                      # Concurrent test requests
  maxRetries: 5                       # Retry count for reliability testing

# HTTP testing behaviour
request:
  baseDelayMs: 300                    # Respectful throttling
  jitterMs: 400                       # Realistic timing variation
  retryBackoffBase: 800               # Exponential backoff for reliability
  userAgents:                         # Test with different user agents
    - "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
    - "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6)..."

# Browser automation settings
puppeteer:
  headless: true                      # Automated testing mode
  viewport:
    width: 1280
    height: 800
  navigationTimeout: 60000            # Page load timeout
  viewLoadTimeout: 8000               # View/tile load timeout

# Visual regression testing
screenshots:
  enabled: true
  outputDir: "./screenshots"
  orientations:
    - name: "axis0"
      heading: 0
      vlookat: 0
    # ... (8 orientations for comprehensive coverage)
  modes:
    - name: "full"        # Full interface
      fov: 90
    - name: "clean"       # UI hidden for clean screenshots
      fov: 120
```

### Environment Variables

Override config parameters via environment:

```bash
# Example
export KRPANO_TOUR_URL="https://tour-to-test.com/"
export KRPANO_MAX_PARALLEL=10
export KRPANO_PUPPETEER_HEADLESS=false
node index.js
```

---

## 🧪 Usage Examples

### Basic Test Run

```bash
# Run complete QA test (discovery + screenshots)
npm test
```

Expected output:
```
🔍 Discovering tour structure...
✅ Parsed 16 scenes
📸 Capturing 8 orientations per scene...
✅ Scene 1: 16/16 screenshots captured
...
📊 QA Test Summary:
   Total scenes: 16
   Screenshots captured: 256
   Test duration: 8m 23s
   Test status: ✅ PASSED
```

### With Browser Visible (Development/Debugging)

```bash
# Run with visible browser window
npm run test -- --show
```

### Generate QA Report Only

```bash
# Run on pre-mirrored tour
npm run test-show
```

### Custom Configuration

```bash
# Test different tour
node index.js \
  --tour-url "https://example.com/tours/another/" \
  --output-dir "./test_results/another_tour"
```

---

## 🎯 Use Cases

### QA Testing - CI/CD Integration

Automate tour QA in your deployment pipeline:

```bash
#!/bin/bash
# deploy-with-qa.sh
npm install
npm run config -- --tour-url "$TOUR_URL"
npm test
if [ $? -eq 0 ]; then
  echo "✅ Tour QA passed, deploying..."
  npm run deploy
else
  echo "❌ Tour QA failed, rollback..."
  exit 1
fi
```

### Visual Regression Testing

Compare screenshots across versions:

```bash
# Test version A
npm test -- --label "version-1.0"

# Test version B
npm test -- --label "version-2.0"

# Generate comparison report
npm run compare-report
```

### Performance Monitoring

Track asset loading times from test logs.

### Accessibility Testing

Verify tour navigation with simulated interactions across different viewport sizes.

---

## 📊 Module API Reference

### ConfigLoader - Configuration Management

```javascript
const ConfigLoader = require('./src/lib/configLoader');
const config = new ConfigLoader('./config.yaml');
config.validate();
const tourUrl = config.get('tour.baseUrl');
```

### XmlParser - Tour Structure Analysis

```javascript
const XmlParser = require('./src/lib/xmlParser');
const parser = new XmlParser('./tour_offline/tour.xml');
const scenes = parser.getScenesFromTour();
```

### AntiWafManager - Respectful HTTP Testing

```javascript
const AntiWafManager = require('./src/utils/antiWaf');
const antiWaf = new AntiWafManager(config);
await antiWaf.fetchWithRetry(url, {}, 1, 5);
```

---

## 📈 Output Files & Reports

### Test Environment Mirror

```
tour_offline/
├── index.html
├── tour.xml
├── download_log.json
└── recorridos/
```

### QA Screenshots Report

```
screenshots/
├── report.json
└── [scene-name].tiles/
    └── [orientations]/
```

---

## 🐛 Troubleshooting

### Puppeteer Timeout

**Problem:** `navigationTimeout exceeded`

**Solution:** Increase timeout in config.yaml

### Asset Download Fails

**Problem:** Some assets return 403/429

**Solutions:** Increase delay, add more retries

### Memory Issues

**Problem:** Node.js heap out of memory

**Solution:**
```bash
node --max-old-space-size=4096 index.js
```

---

## 🔗 Supported Krpano Versions

- krpano 1.x, 2.x, 3.x
- All panoramic formats (cubemap, spherical)
- HTML5 & WebGL renderers

---

## 📝 License

MIT License - See LICENSE file for details.

---

**Version:** 2.0.0 | **Status:** ✅ Production Ready  
[Language Selection](../../README_MAIN.md)

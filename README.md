# Krpano QA Tester

Puppeteer-based automated QA testing framework for krpano 360° panoramic tours.

## Language

| English | Español | Deutsch |
|---------|---------|---------|
| **[English (UK)](./docs/en/README.md)** | **[Latinoamérica](./docs/es/README.md)** | **[Schweiz](./docs/de/README.md)** |

---

## Overview

Krpano QA Tester is a professional automation framework for comprehensive testing of krpano-based panoramic tours. It provides automated QA capabilities, visual regression testing, and accessibility validation.

### What you can do

- Test krpano panoramic tours with automated QA frameworks
- Perform visual regression testing across multiple orientations
- Generate quality assurance reports and screenshots
- Integrate testing into CI/CD pipelines
- Validate accessibility and performance metrics

---

## Requirements

| Item | Version |
|------|---------|
| Node.js | >= 16.0.0 |
| npm | >= 8.0.0 |
| Chromium | Auto-installed with Puppeteer |

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/rjacomep/krpano_with_puppeteer.git
cd krpano_with_puppeteer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run tests

```bash
# Run basic test
npm test

# Generate screenshots
npm run test-show

# Debug mode
npm run debug
```

---

## Legal use

**Authorised uses:**

- Testing tours you own
- Testing tours with explicit authorisation
- Internal QA and CI/CD integration
- Visual regression testing
- Performance and compatibility analysis

**Not authorised:**

- Testing without explicit permission
- Circumventing access controls
- Unauthorised content redistribution

See [legal guidelines](./docs/en/legal-use-guidelines.md) for complete details in your language:

- **[English guidelines](./docs/en/legal-use-guidelines.md)**
- **[Directrices en español](./docs/es/legal-use-guidelines.md)**
- **[Deutsche Richtlinien](./docs/de/legal-use-guidelines.md)**

---

## Documentation

Complete documentation is available in three languages:

### English (UK)
- **[Main documentation](./docs/en/README.md)** - Full setup and usage guide
- **[Keywords & SEO](./docs/en/keywords.md)** - Search and metadata information

### Español (Latinoamérica)
- **[Documentación principal](./docs/es/README.md)** - Guía completa de instalación y uso
- **[Palabras clave & SEO](./docs/es/keywords.md)** - Información de búsqueda y metadatos

### Deutsch (Schweiz)
- **[Hauptdokumentation](./docs/de/README.md)** - Vollständige Setup- und Verwendungsanleitung
- **[Schlüsselwörter & SEO](./docs/de/keywords.md)** - Such- und Metadateninformationen

---

## Project structure

```
krpano_with_puppeteer/
├── index.js                       # Main entry point
├── config.yaml                    # Configuration file
├── package.json                   # Dependencies
├── src/
│   ├── lib/                       # Core modules
│   │   ├── config-loader.js
│   │   ├── krpano-tester.js
│   │   ├── screenshot-handler.js
│   │   └── xml-parser.js
│   └── utils/                     # Utilities
├── docs/
│   ├── en/                        # English documentation
│   ├── es/                        # Spanish documentation
│   └── de/                        # German documentation
└── tour_offline_example/          # Example resources
```

---

## Technologies

- **Node.js** - JavaScript runtime environment
- **Puppeteer** - Headless Chromium browser automation
- **Krpano** - Panoramic tour framework

---

## Troubleshooting

For common issues and solutions, refer to the documentation in your preferred language:

- **[English troubleshooting](./docs/en/README.md#troubleshooting)**
- **[Solución de problemas en español](./docs/es/README.md#solución-de-problemas)**
- **[Deutsche Fehlerbehebung](./docs/de/README.md#fehlerbehebung)**

---

## Support

- 📖 Check the [documentation](./docs/) in your language
- ⚖️ Review [legal guidelines](./docs/en/legal-use-guidelines.md)
- 🔍 See [keywords reference](./docs/en/keywords.md)
- 💬 Open an issue on [GitHub](https://github.com/rjacomep/krpano_with_puppeteer/issues)

---

## License

MIT License - See [LICENSE](./LICENSE) file for details

---

## Repository

https://github.com/rjacomep/krpano_with_puppeteer

Last updated: January 2026

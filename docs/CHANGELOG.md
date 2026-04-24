# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Canvas-based page rendering path in the React viewer
- Page image input support via `document.pageImages`
- Viewer viewport height control with internal scrolling behavior
- Zoom controls and drag-to-pan interaction improvements
- Open-source project policy files (`LICENSE`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`)

### Changed

- Field styling options expanded (`textSize`, `borderRadius`)
- Viewer rendering architecture updated to normalize page sources
- PDF viewer worker configuration now requires an explicit local/managed worker URL instead of a remote CDN default
- README and usage docs now state that `document.pdfData` is required for export and PDF fallback rendering

### Added

- Basic CI workflow for install, typecheck, test, and build on Windows and Ubuntu


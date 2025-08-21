# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Wingman UX Feedback Assistant
- Chrome Extension for capturing screenshots and feedback
- React SDK (`wingman-sdk`) for enhanced metadata collection
- CLI tool (`wingman-cli`) with local relay server
- Preview UI for viewing captured feedback
- Support for React component metadata extraction
- Console log and error buffering
- Network timing collection
- Centralized logging system for production

### Fixed
- Chrome extension module syntax errors
- Clipboard handling improvements
- Tab proportions and badge sizing

### Changed
- Switched from scoped npm packages (@wingman/*) to unscoped names
- Bundled dependencies for easier installation
- Improved build system with esbuild for CLI
- Self-contained packages for npm publishing

## [1.0.0] - 2024-01-XX

### Added
- First stable release
- Complete feedback capture workflow
- Local storage of annotations
- REST API for annotation retrieval

[Unreleased]: https://github.com/wingman/wingman/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wingman/wingman/releases/tag/v1.0.0
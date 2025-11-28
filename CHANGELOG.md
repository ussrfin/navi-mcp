# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-28

### Added
- Initial release of Navi MCP Server
- 3 MCP tools: `get_stock`, `get_reservation`, `get_price`
- Real-time Google Sheets integration via Apps Script
- Comprehensive documentation:
  - README.md - Full documentation
  - QUICKSTART.md - Quick setup guide
  - DEPLOYMENT.md - VPS deployment guide
  - ARCHITECTURE.md - System architecture & diagrams
  - EXAMPLES.md - Response examples & use cases
  - PROJECT_SUMMARY.md - Project overview
- Apps Script template for Google Sheets
- PM2 support for production deployment
- Error handling & logging
- .gitignore for security
- .env.example template

### Features
- **get_stock**: Check costume availability with size-specific ETA
- **get_reservation**: Query bookings by costume, size, and date
- **get_price**: Fetch rental prices and catalog details
- Full column data return for comprehensive responses
- Multiple result support for reservations
- Flexible filtering (optional parameters)

### Technical
- Node.js with ES modules
- MCP SDK v1.23.0
- stdio transport for ElevenLabs integration
- node-fetch for HTTP requests
- JSON response format

### Documentation
- 11 documentation files
- Complete API reference
- Step-by-step guides
- Troubleshooting sections
- Use case examples
- Architecture diagrams

## Future Releases

### [1.1.0] - Planned
- [ ] Add `add_reservation` tool
- [ ] Add `update_stock` tool
- [ ] Add caching layer (Redis)
- [ ] Add rate limiting
- [ ] Add request logging to file
- [ ] Add health check endpoint

### [1.2.0] - Planned
- [ ] Authentication for Apps Script URLs
- [ ] Webhook support for real-time updates
- [ ] Multi-language support
- [ ] Advanced filtering & search
- [ ] Backup automation

### [2.0.0] - Future
- [ ] Database migration option
- [ ] Admin dashboard
- [ ] Analytics & reporting
- [ ] API versioning
- [ ] GraphQL support

---

## Version Naming

- **Major**: Breaking changes, new architecture
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, documentation updates

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.0.0`
4. Push to repository
5. Deploy to production
6. Update ElevenLabs agent if needed

---

*Keep this file updated with every release*

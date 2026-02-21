<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-22 -->

# docs/ — Project Documentation

## Purpose

Comprehensive documentation covering architecture, operations, integration, development, strategy design, and flutter app guidance. Organized by user role (operators, developers, strategists, app users).

## Key Files

| File | Description |
|------|-------------|
| `README.md` | Documentation index and quick reference |
| `CHANGELOG.md` | Version history and release notes |
| `ORGANIZATION.md` | Project structure overview |
| `BITFINEX_NONCE_GUIDE.md` | Nonce handling implementation details |
| `FRR_TIMESERIES_ARCHITECTURE.md` | Flash Return Rate time-series database design |
| `ML_IMPROVEMENT_PLAN.md` | ML system enhancement roadmap |
| `ML_SYSTEM_ARCHITECTURE.md` | ML service architecture and integration |
| `ML_SYSTEM_REBUILD_PLAN.md` | ML refactoring and modernization plan |
| `RESEARCH_DYNAMIC_FRR_FLOOR.md` | Dynamic FRR floor research and analysis |
| `SYSTEM_ANALYSIS_FRR_FLOOR.md` | System-level FRR floor analysis |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `architecture/` | System design (11 files): ARCHITECTURE.md, SHARED_SERVICE_ARCHITECTURE.md, BITFINEX_API_REFERENCE.md, etc. |
| `development/` | Developer guides (9 files): BACKTEST_FRAMEWORK_DESIGN.md, SDK_IMPLEMENTATION_GUIDE.md, code review reports |
| `flutter-app/` | Mobile app docs (3 files): USER_GUIDE.md, I18N_GUIDE.md, APP_STORE_COMPLIANCE.md |
| `getting-started/` | Onboarding guides (5 files): QUICK_START.md, SETUP_GUIDE.md, CONFIG_GUIDE.md, DEPLOYMENT.md, cloud-deployment-guide.md |
| `integrations/` | Integration docs (8 files): ML_INTEGRATION_GUIDE.md, TELEGRAM_BOT_REFERENCE.md, SUBSCRIPTION_INTEGRATION_PLAN.md, etc. |
| `operations/` | Ops guides (8 files): OPERATION_GUIDE.md, DUAL_INSTANCE_SETUP.md, NOTIFICATION_SETUP.md, PRODUCTION_BOT_CHECK.md, etc. |
| `strategies/` | Strategy design (14 files): STRATEGY_GUIDE.md, TECHNICAL_INDICATORS.md, REPRICER_SAFEGUARDS.md, etc. |
| `archive/` | Historical reports (monthly folders: 2025-10/, 2025-11/, 2025-12/) |
| `incidents/` | Incident reports and postmortems |
| `plans/` | Project planning documents (roadmap, feature plans) |
| `research/` | Market research and analysis |
| `images/` | Diagrams and screenshots (embed in markdown docs) |

## For AI Agents

### Working In This Directory

1. **Start with README.md** for documentation index
   - Quick links to all major sections
   - Use this to find relevant docs

2. **Architecture documentation flow**
   ```
   README.md
   → architecture/ARCHITECTURE.md
   → architecture/SHARED_SERVICE_ARCHITECTURE.md
   → architecture/BITFINEX_API_REFERENCE.md
   ```

3. **For operational questions**
   - Check `operations/PRODUCTION_BOT_CHECK.md` for monitoring bot health
   - Check `operations/OPERATION_GUIDE.md` for daily ops procedures
   - Check `operations/NOTIFICATION_SETUP.md` for alert configuration

4. **For development questions**
   - Check `development/BACKTEST_FRAMEWORK_DESIGN.md` for testing
   - Check `development/SDK_IMPLEMENTATION_GUIDE.md` for Dart SDK
   - Check `development/FULL_AUDIT_2026_02.md` for recent code review

5. **For strategy questions**
   - Check `strategies/STRATEGY_GUIDE.md` for strategy overview
   - Check `strategies/TECHNICAL_INDICATORS.md` for indicator implementation
   - Check `strategies/STRATEGY_VERIFICATION_REPORT.md` for test results

6. **For ML integration**
   - Check `integrations/ML_INTEGRATION_GUIDE.md` for gRPC integration
   - Check `../ml/README.md` (in ml/ directory) for service details

### Documentation Standards

- **All code examples are tested** before inclusion (verify with user's testing checklist)
- **Configuration examples use actual file paths** from codebase
- **Command examples are verified executable** on macOS/Linux
- **Architecture diagrams** stored as `.md` ASCII diagrams or `.png` in `images/`
- **Links between docs** use relative paths (`../architecture/ARCHITECTURE.md`)
- **All docs are in English** (primary) or **繁體中文** (secondary) per CLAUDE.md

### Common Patterns

**Documentation organization by audience:**
- **Operators** → `operations/`, `getting-started/`, `integrations/`
- **Developers** → `architecture/`, `development/`, `strategies/`
- **Mobile app users** → `flutter-app/`, `getting-started/`
- **Strategists** → `strategies/`, `research/`, `plans/`

**Version tracking:**
- CHANGELOG.md documents all changes
- Dated files (e.g., SYSTEM_ANALYSIS_FRR_FLOOR.md) include analysis date
- Archive/ stores historical documents by month/year

## Dependencies

### Internal

- **Code examples**: Reference actual files in `cmd/`, `internal/`, `platform/`
- **Configuration examples**: Use actual config from `config/` and `deploy/`
- **Strategy documentation**: Cross-reference `internal/strategy/` source code
- **API documentation**: Reference `internal/client/` and protobuf files

### External

- **Bitfinex API**: All API docs reference official Bitfinex documentation
- **Telegram Bot**: References Telegram Bot API documentation
- **gRPC**: References official gRPC and Protocol Buffers documentation
- **Flutter**: References official Flutter documentation
- **Docker**: References Docker and Docker Compose documentation

## Writing Documentation

### Best Practices

1. **Test all code examples** before committing
2. **Use actual command output** in documentation (copy from terminal)
3. **Include prerequisites** (Go version, Flutter version, etc.)
4. **Document error cases** and troubleshooting steps
5. **Keep docs in sync with code** (document drift is costly)

### File Naming

- Markdown files: UPPER_CASE_WITH_UNDERSCORES.md
- Images: lower_case_with_underscores.png
- Archive folders: YYYY-MM/ format

### Internal Links

```markdown
[Architecture Guide](../architecture/ARCHITECTURE.md)
[Setup Instructions](../getting-started/SETUP_GUIDE.md)
```

### Code Blocks

Always specify language for syntax highlighting:
```markdown
\`\`\`bash
make build
\`\`\`

\`\`\`go
bot, err := lending.NewBot(cfg, logger)
\`\`\`
```

## Recent Updates (as of 2026-02-22)

- **FULL_AUDIT_2026_02.md**: Latest code review from Feb 1, 2026
- **WS_FUNDING_MIGRATION.md**: WebSocket funding offer migration status
- **WS_REST_VERIFICATION_REPORT.md**: Verification of WS/REST fallback
- **Architecture reviewed** for shared services and rate limiting

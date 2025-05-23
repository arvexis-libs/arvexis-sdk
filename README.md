# ⚙️ Arvexis SDK  
*Type-Safe, Production-Ready Client Libraries for Institutional Integrations*

The official Arvexis SDK provides strongly typed, battle-tested client libraries enabling seamless integration with Arvexis Core’s APIs — built for security teams, quant engineers, and infrastructure developers at funds and family offices.

## 🌐 Supported Languages & Use Cases  

| Language | Primary Use Case |
|----------|------------------|
| **TypeScript** | Frontend dashboards, internal trading UIs, risk portals (React/Vue) |
| **Python** | Quant research, strategy backtesting, OMS connectors, accounting sync scripts |
| **Go** | High-frequency execution services, custodial gateways, internal microservices |

## 🚀 Core Features  

- **Authenticated API Clients**: Auto-refreshing JWTs, rate-limit handling, retry with exponential backoff, and request tracing IDs.  
- **Wallet Lifecycle Management**: Create, configure, fund, and revoke programmable wallets — with full approval workflow support (multi-approver, hardware confirmation).  
- **DeFi Strategy Builder**: Compose, simulate, and execute atomic multi-step strategies (e.g., “Buy ETH → deposit into Aave → hedge with GMX”) with dry-run mode and gas estimation.  
- **Compliance-Aware Data Fetching**: Retrieve positions, transactions, and balances *only* for assets and chains permitted under your mandate — enforced server-side.  
- **Webhook & Event Subscriptions**: Real-time alerts for wallet events (funding, withdrawals), strategy completions, or risk threshold breaches (via SSE or webhook delivery).  

## ✅ Security & Governance  
- All SDKs are MIT-licensed, audited, and published with SBOMs & provenance attestations (Sigstore)  
- Zero telemetry; no data leaves your environment unless explicitly invoked  
- Built-in validation against OpenAPI 3.1 spec — fails fast on misconfigured requests  

📚 [Full Documentation](https://docs.arvexis.online/sdk) | 📦 [NPM](https://www.npmjs.com/package/@arvexis/sdk) | 🐍 [PyPI](https://pypi.org/project/arvexis-sdk) | 🐘 [Go pkg](https://pkg.go.dev/github.com/arvexis-labs/sdk/go)
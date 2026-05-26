# BI Monthly Report Agent

A **GitHub Copilot Extension** (agent-style) that automates the creation of the BI Team's monthly leadership report.

Invoke it directly from GitHub Copilot Chat:

```
@bi-reports generate report for May 2025
```

The extension will:
1. Fetch meeting-note pages from the configured OneNote notebook section via the Microsoft Graph API.
2. Use the Copilot LLM to summarise the notes across all team projects and efforts.
3. Stream back a ready-to-send leadership email in the established BI Team format.

---

## Architecture

```
GitHub Copilot Chat
       │  (POST /agent)
       ▼
  Express Server  (src/index.ts)
       │  verifies webhook signature
       ▼
  Agent Handler   (src/agent.ts)
       │  parses period from user message
       ├──► OneNote Client  (src/onenote.ts)  ──► Microsoft Graph API
       └──► Report Generator (src/report-generator.ts)
                │  calls Copilot LLM via SDK prompt()
                └──► Email Template  (src/email-template.ts)
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 20 | LTS recommended |
| An Azure AD app registration | Must have the `Notes.Read.All` **application** permission granted |
| Access to the target OneNote notebook | The Azure AD app must have delegated or app-level access |
| A GitHub App registered as a Copilot Extension | See the [Copilot Extensions docs](https://docs.github.com/en/copilot/building-copilot-extensions) |

---

## Setup

### 1 – Clone and install

```bash
git clone https://github.com/mplevine/monthly-reports.git
cd monthly-reports
npm install
```

### 2 – Configure environment variables

```bash
npm
# Edit .env with your credentials
```

See `.env.example` for a description of every variable.

### 3 – Build

```bash
npm run build
```

### 4 – Run

```bash
# Production
npm start

# Development (ts-node, no build step)
npm run dev
```

The server starts on the port defined by `PORT` (default `3100`).

A basic health-check is available at `GET /health`.

---

## Registering the GitHub App / Copilot Extension

1. Create a new GitHub App in your organisation's developer settings.
2. Set the **Callback URL** / **Webhook URL** to `https://<your-host>/agent`.
3. Under **Copilot**, set the **Agent URL** to `https://<your-host>/agent`.
4. Install the app and enable the extension in Copilot settings.

Full instructions: [Building a Copilot agent](https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-agent-for-your-copilot-extension).

---

## Usage

In any Copilot Chat window, type:

| Command | Effect |
|---|---|
| `@bi-reports generate report for May 2025` | Generates the report for May 2025 |
| `@bi-reports may 2025` | Same — month and year in any order |
| `@bi-reports 2025-05` | ISO format |
| `@bi-reports generate the monthly report` | Defaults to the previous calendar month |

---

## Email Format

The generated email follows the established BI Team leadership email structure:

```
Subject: BI Team Monthly Report – <Month> <Year>

────────────────────────────────────────────────────────────

Hi [Leadership Team],

Below is the BI Team's monthly update for <Month> <Year>.

────────────────────────────────────────────────────────────
PROJECT HIGHLIGHTS

**<Project Name>**
• <Update>

────────────────────────────────────────────────────────────
KEY WINS & METRICS
• <Win / metric>

────────────────────────────────────────────────────────────
UPCOMING PRIORITIES
• <Priority>

────────────────────────────────────────────────────────────

Please feel free to reach out with any questions.

Best regards,
BI Team
```

---

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Project structure

```
src/
├── index.ts             # Express server + webhook verification
├── agent.ts             # Copilot Extension agent handler
├── onenote.ts           # Microsoft Graph / OneNote client
├── period-parser.ts     # Parses month + year from user messages
├── report-generator.ts  # LLM summarisation via Copilot SDK
├── email-template.ts    # Email format + prompt builders
├── types.ts             # Shared TypeScript interfaces
└── __tests__/
    ├── period-parser.test.ts
    ├── email-template.test.ts
    └── report-generator.test.ts
```

---

## License

MIT
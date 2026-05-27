# Use a repo-local CLI workflow instead of a hosted Copilot Extension

This project will be reshaped from a hosted GitHub Copilot Extension into a repo-local Node/TypeScript CLI that can be invoked from GitHub Copilot, Codex, or Claude Code. The CLI will own note retrieval, prompt construction, GitHub Models generation, and artifact writing, with delegated user auth for local OneNote access and durable run artifacts (`Report Draft` markdown plus `Source Bundle` JSON), because the goal is a repeatable local workflow rather than a webhook-hosted integration.

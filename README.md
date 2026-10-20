# Trix

Someone was early. Here's the receipt.

A stock jumps on news. Within minutes Trix shows the options trades placed before the news broke, how unusual
they were for that ticker, and what they have made since. It delivers them as a Telegram card and a web case file.
Built on the Unusual Whales API for the 2026 Unusual Whales Hackathon.

Status: P0 (access spike) in progress; the workspace is scaffolded. Build order: [`implementation.md`](implementation.md).
Decisions: [`DECISIONS.md`](DECISIONS.md) · API findings: [`SPIKE.md`](SPIKE.md) · claims ledger: [`CLAIMS.md`](CLAIMS.md).

## Run locally
```bash
pnpm install
cp .env.example .env   # fill UW_API_KEY etc.; never commit it
pnpm test
UW_API_KEY=... pnpm spike UNH   # P0 access spike
```

Mustapha Fadhlullah — independent security researcher

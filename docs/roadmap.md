# Roadmap

Planned and deliberately deferred work. Items here are decisions worth
remembering, not a backlog of every idea.

## Distribution

### Homebrew cask

Ship a `brew install --cask cut-branches` formula.

The releases are not signed with an Apple Developer ID (see below), so a
downloaded `.dmg` is quarantined and macOS blocks the first launch until the
user visits **Privacy & Security → Open Anyway**. Homebrew removes the
quarantine attribute as part of installing a cask, so the warning never
appears — which solves the friction for free, for the audience most likely to
be installing a git tool in the first place.

Involves:

- A cask definition pointing at the GitHub release artifacts, with the SHA of
  each `.dmg`. Both architectures need an entry, since the release publishes
  separate arm64 and x64 bundles.
- A tap to host it (`EduardoLopes/homebrew-tap`) unless the project later
  qualifies for `homebrew-cask` itself, which has notability requirements.
- A release step to bump the cask version and checksums, so it does not drift
  from the GitHub release. This can hang off the existing `publish.yml`.

## Deferred

### Apple Developer ID signing and notarization

**Deferred — costs 99 USD/year, not justified yet.**

Signing with a Developer ID and notarizing would remove the first-launch
warning on macOS entirely. It requires paid Apple Developer Program
membership; the only fee waiver is for accredited educational institutions,
and open-source status does not qualify. There is no cheaper middle tier — a
self-signed certificate is rejected by Gatekeeper exactly like an unsigned
build.

The current `"signingIdentity": "-"` (ad-hoc) in `src-tauri/tauri.conf.json`
is the best free option and is not merely cosmetic: Apple Silicon requires
every binary to carry some signature to execute, so ad-hoc signing is what
keeps the arm64 build runnable. The README documents the Open Anyway steps
for users.

Revisit when either becomes true:

- The audience grows beyond developers, who tolerate the workaround.
- Auto-updates become desirable — Tauri's updater is much less useful when
  every update re-triggers the Gatekeeper prompt.

The release pipeline is already prepared for it: `publish.yml` runs its build
job in a `release` environment, which is where the signing secrets
(`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
`APPLE_ID`, `APPLE_TEAM_ID`) should live so no other workflow can read them.

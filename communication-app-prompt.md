# Build Prompt: "NexusTalk" — High-Performance Communication + Remote Control App

You are a senior full-stack and real-time systems engineer. Build **NexusTalk** (replace the name with your own), a cross-platform communication app for **Windows, macOS, Linux, Android, and iOS** that combines:

- **WhatsApp-style** private and group messaging — simple and chat-first (no servers/channels)
- **WhatsApp-style** private messaging and calls
- **AnyDesk/RustDesk-style** remote screen viewing and control
- **Live screen sharing** with ultra-low latency

**Performance is the #1 product differentiator.** Treat every latency target below as a hard requirement, not a nice-to-have.

---

## 1. Platforms & Network Reality

- Mobile: Android 8.0+ (must run smoothly on budget devices with 2GB RAM), iOS 14+
- Desktop: Windows 10/11 (primary), macOS 12+, Linux (X11 + Wayland)
- Network reality: must work on unstable 4G/3G, survive Wi-Fi ↔ mobile handover mid-call without dropping the session, and fall back to TURN over TCP/443 when UDP is blocked by the ISP

## 2. Feature Specification

### 2.1 Messaging
- 1:1 DMs and group chats (up to 1,000 members) with group names, avatars, descriptions, admin roles, and invite links/QR
- Rich messages: markdown, emoji, @mentions, replies/quote, reactions, edit/delete, read receipts, typing indicators
- Media: images/videos with auto-compression + original-quality toggle, documents up to 2GB with chunked resumable upload, voice notes (Opus)
- Search: message and media search per chat/server
- Sync: full history on new device login, offline send queue with retry, multi-device simultaneous login with live sync
- Notifications: FCM/APNs push, native desktop notifications, per-chat mute, lock-screen content hiding option

### 2.2 Voice / Video Calls & Screen Share
- 1:1 voice/video via WebRTC (P2P direct when possible, SFU relay otherwise)
- Group voice/video calls: up to 50 active video / 500 listeners via SFU with simulcast and dynamic layer selection
- Audio: Opus 16–48kHz, adaptive bitrate 6–64kbps, DTX, AEC/NS/AGC, per-user volume control
- Video: negotiate best codec (H.264/VP9/AV1), 180p→1080p steps, hardware encode/decode wherever available
- Call features: mute, camera toggle, speaker switch, in-call screen share, picture-in-picture, call history, reconnect with session resume (no full renegotiation on transient drops)
- Live screen share (standalone or in-call): full display / single window / region capture, 30fps default with 60fps option, remote viewer can request quality changes

### 2.3 Remote Screen Control (the differentiator — spec carefully)
- Two modes: **view-only** and **full control**; both require explicit on-screen consent on the host with a countdown and a persistent "being controlled" indicator
- Host platforms: Windows first, then macOS/Linux; Controller: all platforms including phones
- Capture: Windows DXGI Desktop Duplication, macOS ScreenCaptureKit, Linux PipeWire; render the cursor as a separate layer (no double cursor)
- Input relay over WebRTC DataChannels:
  - Unreliable/unordered channel for pointer moves at 120Hz+
  - Reliable ordered channel for clicks, keys, clipboard, file events
  - Controller→Host: mouse move/click/scroll/drag, full keyboard with layout mapping; on mobile map touch: tap = click, long-press = right-click, two-finger drag = scroll, pinch = zoom; include a virtual trackpad/mouse mode
  - Host→Controller: screen frames, bidirectional clipboard sync (opt-in), file transfer
- Safety: instant kill switch on both ends, input-lock button on host, auto idle timeout, session log (who/when/duration)
- Quality: auto-scale 480p→1080p+ and 15→60fps from RTT and packet loss; presets: "sharp text" (high quality, low fps) and "smooth video"

### 2.4 Presence & Social
- Online/idle/DND/invisible/in-call/sharing status, custom status, last seen with privacy toggle
- Contact sync via phone-number hashing (opt-in), friends, block/report

## 3. Performance Budget (instrument and measure all of these)

| Metric | Target |
|---|---|
| Screen share glass-to-glass latency | ≤100ms broadband, ≤250ms on 4G |
| Remote-control input round-trip (click → visible effect) | ≤60ms broadband |
| Voice mouth-to-ear latency | ≤150ms |
| Message sent → peer display | ≤100ms P50, ≤400ms P95 global |
| App cold start | <2s desktop, <3s budget Android |
| Idle RAM | <300MB desktop, <200MB mobile |
| Crash-free sessions | >99.5% |

- Reconnection: media session resumes within 1s of network recovery; chat reconnects with zero message loss (per-device delivery cursor)
- Adaptive streaming: continuous RTT/loss/jitter monitoring drives encoder bitrate, resolution, fps, and jitter buffer automatically

## 4. Tech Stack (justify any deviation in writing before implementing)

- **Client:** Flutter (single codebase for mobile + desktop) with native modules (Kotlin/Swift/C++/Rust via FFI) for screen capture, input injection, and push. Chosen for high-fps UI and code reuse. Alternative if the team is JS-heavy: React Native + Tauri/Electron — call out the trade-off explicitly.
- **Media:** WebRTC via LiveKit client SDKs + self-hosted **LiveKit** SFU (Go, open source, simulcast, selective forwarding, webhooks). Alternative: mediasoup or Pion for fully custom control.
- **Signaling + chat transport:** WebSocket (uWebSockets or Gorilla) on a **Go** backend (fast, single-binary deploys). Alternative: Rust (axum + tokio-tungstenite).
- **Remote control input:** WebRTC DataChannels per §2.3. Study **RustDesk** and **Screego** (both open source) for capture/relay patterns — do not copy GPL code into a closed-source app without license review.
- **Data:** PostgreSQL (users, messages, servers, sessions) with read replicas; Redis (presence, typing, pub/sub fan-out, rate limits); S3-compatible object storage (MinIO locally) with presigned upload URLs
- **NAT traversal:** coturn (STUN/TURN, TURN over TLS on 443); enable LiveKit's embedded TURN
- **E2EE:** libsignal (Signal protocol) for 1:1 chats and calls; group E2EE via MLS in a later phase
- **Infra:** Docker Compose for local dev, Prometheus + Grafana for the §3 metrics, Sentry for crash reporting

## 5. Architecture (monorepo, these services)

1. `gateway` — WebSocket signaling + real-time chat fan-out (Go)
2. `api` — REST/gRPC: auth, profiles, groups, storage (Go)
3. `sfu` — LiveKit cluster behind a load balancer
4. `turn` — coturn
5. `media-svc` — room orchestration + session tokens (wraps LiveKit server API)
6. `remote-svc` — remote-control session broker: consent handshake, scoped tokens, kill switch
7. `notify` — push notification service
8. `worker` — thumbnails, transcoding, search indexing

Document these flows with diagrams before coding:
- **Chat send:** client → gateway → Redis fan-out → online recipients over WS + push for offline; persist asynchronously so sending never blocks on the DB
- **Call setup:** client → media-svc token → LiveKit join → ICE (STUN, TURN fallback)
- **Remote control:** controller request → remote-svc → host consent prompt → scoped token → WebRTC video track (host→controller) + DataChannels (input/clipboard/files)

## 6. Data Model (minimum)

users, devices, sessions, contacts/blocks, dms, groups, group_members, messages (with attachments, reactions, mentions), calls, call_participants, remote_sessions, media_objects, push_tokens, per-device read cursors, audit_log

Design messages for scale: partition by channel, time-sortable IDs (ULID/snowflake), delivery state per device, no hot-row counters.

## 7. Security & Privacy

TLS 1.3 everywhere; DTLS-SRTP for media; E2EE per §4; device management with remote logout; refresh-token rotation; per-IP and per-account rate limits; invite-link abuse protection; remote-control consent mandatory and logged; data export/delete; no telemetry without opt-in.

## 8. UX Requirements

- Desktop: WhatsApp-style three-pane layout (icon nav rail, list column, conversation pane) plus a Devices pane for remote control. Mobile: bottom tabs (Chats, Calls, Devices, Settings), thumb-reachable call controls
- Premium, elegant design language: soft gradients, glassmorphism accents, spring micro-animations, smooth 120Hz transitions
- 60fps scrolling (120Hz where available), optimistic UI with pending → sent → read states, skeleton loaders, zero jank on low-end Android
- Dark/light theme, accent colors, i18n-ready strings (ship English + Bengali)
- Call UI: grid/speaker/spotlight layouts, PiP, per-participant audio-level bars, network-quality badge per participant
- Remote-control toolbar: quality preset, clipboard, file transfer, fullscreen, send Ctrl+Alt+Del (Windows), kill session; virtual trackpad on mobile
- Accessibility: screen-reader labels, full keyboard navigation on desktop

## 9. Build Order (system must run at the end of every phase)

- **Phase 0:** repo setup, docker-compose (Postgres, Redis, MinIO, LiveKit, coturn), CI, app shell with auth
- **Phase 1 (MVP):** auth (phone/email OTP), contacts, 1:1 + group chat, media upload, presence, typing, read receipts, push notifications, 1:1 voice/video calls, screen share send + view, history sync
- **Phase 2:** group admin features, invite links/QR, group video via SFU simulcast, voice notes, reactions, search, file transfer
- **Phase 3:** remote control — Windows host first (view-only → full control), controller on desktop + Android, clipboard sync, file transfer, auto quality, kill switch, session logs; then macOS/Linux hosts, iOS controller
- **Phase 4:** E2EE everywhere, MLS group encryption, bots/webhooks/API, call recording, screen-share annotations

## 10. Engineering Rules

- Every phase ends runnable: `docker compose up` + `flutter run` must work from a clean clone; README with exact steps
- Instrument the §3 metrics from day one; ship an in-app debug overlay (ping, fps, bitrate, codec, P2P vs TURN)
- Load-test before declaring a phase done: 500 simulated SFU participants, 10k concurrent WebSockets on the gateway
- Unit tests for protocol/persistence logic; integration tests for message sync and reconnect flows
- When a decision has real trade-offs, present a 3-line comparison, pick one, and move on

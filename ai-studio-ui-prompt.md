# UI Design Prompt (v3) — "NexusTalk": WhatsApp-style + Screen Control, Premium UI

You are a world-class product designer and senior front-end engineer. Design (UI only — no
backend, no real networking, no auth) a stunning cross-platform communication app called
"NexusTalk" (replace with your app name): WhatsApp-style messaging + built-in screen sharing
+ remote device control (AnyDesk-style, as a first-class tab). Output a React + TypeScript +
Tailwind CSS web app with mock data only.

## STEP 1 — Build the design system first (tokens + reusable components)

Colors (dark theme default):
- Background deep navy #0B0F1A, surface #111827, elevated surface #1A2233
- Accent gradient: indigo #6366F1 → cyan #22D3EE — for primary buttons, active tabs, links,
  avatar rings, own chat bubbles
- Text: #F8FAFC primary, #94A3B8 secondary
- Success #34D399, warning #FBBF24, danger #F87171, online dot #22C55E
- Light theme: warm white #FAFAFC background, same accent gradient
- Other people's chat bubbles: neutral surface gray

Typography: "Plus Jakarta Sans" — scale 28/22/17/15/13px, medium and semibold weights only.

Shape & depth: 16–24px radius on cards, 12px on inputs and bubbles; soft shadows
(0 8px 30px rgba(0,0,0,0.35)); glass panels = backdrop-blur + subtle white/5 border.

Motion: spring easing everywhere (150–250ms) — page transitions, message appear (slide+fade),
button press (scale 0.97), animated tab indicator, shimmer skeleton loaders. No linear
animations anywhere.

## STEP 2 — App structure

- Desktop: left icon nav rail (Chats, Calls, Devices, Settings, profile avatar at the bottom)
  → list column → content pane
- Mobile: bottom tab bar with the same 4 tabs; build EVERY screen for BOTH layouts

## STEP 3 — Screens (navigation must work between them; all data mocked)

1. **Splash / Login** — fullscreen animated gradient blob background, centered logo mark,
   phone number field → 6-digit OTP boxes with auto-advance and paste support,
   "continue with email" link
2. **Chats list** — rows: 56px avatar with online dot, name, last message preview
   (tick icon for own messages), timestamp, accent unread pill; pinned section on top;
   blurred search bar; gradient FAB bottom-right for new chat
3. **Chat view** — header: avatar, name, live status ("typing…" with animated dots);
   optional subtle gradient wallpaper; bubbles with SVG tails, max-width 70%, own bubbles
   gradient with white text; corner reaction pills; reply preview strip; date dividers;
   rounded image thumbnails; file cards with icon/size; voice note = play button + animated
   waveform + duration; input bar: rounded field, attach + emoji buttons, mic button that
   morphs into a recording state (red pulse, waveform, slide-to-cancel)
4. **Group info** — large avatar, member list with admin badges, invite link + QR code button,
   shared media grid
5. **Calls list** — history rows with call-type icons (incoming/outgoing/missed), duration,
   tap-to-callback; "new call" FAB
6. **Active voice call** — fullscreen dark with animated gradient or blurred avatar backdrop,
   big avatar + name + live timer, bottom glass control bar (mute, speaker, video, end call);
   minimize to a floating PiP pill
7. **Active video call** — adaptive participant tile grid, own tile small and draggable,
   glass controls, "more" bottom sheet
8. **Screen share viewer** — fullscreen shared screen, floating quality chip
   (ping 32ms · 60fps · 4.2 Mbps), minimized participant strip at the bottom,
   "request quality" popover; minimized state = floating PiP bubble
9. **Devices tab (the killer feature — design with extra care)**
   - "My Devices": cards with device-type icon (laptop/phone), name, OS, online status dot,
     "last active 5m ago", primary "Remote" button
   - "Connect to a device": big input for a 9-digit ID grouped 3-3-3 + "Scan QR" button
   - Session history list with mode chips (View only / Full control)
   - **Remote session screen**: fullscreen remote screen + floating glass toolbar with icon
     buttons (quality preset, clipboard, file transfer, keyboard, fullscreen, red end-session);
     mobile variant: virtual trackpad mode toggle
10. **Host consent dialog** — blurred backdrop, alert card with requester avatar + device name,
    three actions (View only / Full control / Deny), 30-second countdown ring; after accept:
    persistent red banner "Rahim is controlling your device" with an instant "Stop" button
11. **Profile & Settings** — profile header with avatar + edit; grouped list: Account, Devices,
    Notifications, Privacy, Appearance (theme picker + chat wallpaper picker), Storage,
    and an expandable Network debug overlay (ping, fps, bitrate, codec, P2P/TURN status)
12. **Status** (optional) — WhatsApp-style stories row with gradient rings

## STEP 4 — Show every state

- Empty states with cute inline SVG illustrations and friendly copy
- Skeleton shimmer loaders for all lists
- Error states and a "connection lost — reconnecting…" banner with spinner
- Offline banner on top of the app when network drops

## Rules

- Static/mock data only — buttons can be non-functional stubs, but every screen must be
  reachable by navigation
- Realistic sample data (Bengali + English mixed usernames are fine)
- Small, reusable components; identical spacing/radius/color tokens on every screen
- Priority order for polish: Chat view → Devices tab → Call screens → everything else

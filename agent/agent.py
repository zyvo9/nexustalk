"""
NexusTalk Remote Control Agent (host side)
- Logs in with the account token from agent_config.json
- Connects to the NexusTalk server via Socket.IO
- On a session request: streams this PC's screen to the controller via WebRTC
  (GPU-accelerated DXGI capture through dxcam, mss fallback)
- Receives mouse/keyboard input over the WebRTC DataChannel and injects it locally (pynput)
"""

import asyncio
import json
import time
import socketio
import requests
import websockets

from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer
from aiortc.mediastreams import MediaStreamTrack, AudioStreamTrack
from av import VideoFrame

from pynput.mouse import Controller as MouseController, Button
from pynput.keyboard import Controller as KeyboardController, Key

try:
    import dxcam
    HAS_DXCAM = True
except ImportError:
    HAS_DXCAM = False

import mss

# ---------------------------------------------------------------- config

with open("agent_config.json", "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

SERVER = CONFIG.get("server_url", "http://localhost:4000").rstrip("/")
TOKEN = CONFIG["token"]

MAX_WIDTH = int(CONFIG.get("max_width", 1600))
TARGET_FPS = int(CONFIG.get("fps", 24))

sio = socketio.AsyncClient()

mouse = MouseController()
keyboard = KeyboardController()

# Active controller sessions: controller_socket_id -> {pc, dc, track}
sessions = {}
capture = None  # shared ScreenCapture (created on first session)

# Screen dimensions (updated by the capture track) for input normalization
SCREEN_W = 1920
SCREEN_H = 1080


# ---------------------------------------------------------------- screen capture

CURSOR_ARROW = [(0, 0), (0, 17), (4, 13), (6, 18), (9, 17), (7, 11), (12, 11)]


class ScreenCapture:
    """One shared capture source (dxcam GPU or mss fallback).

    CRD-style: the OS cursor is NOT in the captured frames, so we draw it onto
    every frame ourselves — the controller then sees the pointer move live.
    Multiple sessions pull frames from this single instance.
    """

    def __init__(self):
        self._camera = None
        self._sct = None
        self._monitor = None
        self._last_pil = None
        self.phys_w, self.phys_h = 1920, 1080
        if HAS_DXCAM:
            try:
                import cv2  # noqa: F401 — dxcam needs cv2 inside its capture thread
                self._camera = dxcam.create(output_idx=0, output_color="RGB", max_buffer_len=4)
                if self._camera is not None:
                    self._camera.start(target_fps=TARGET_FPS)
                    print(f"capture: dxcam (GPU) @ {TARGET_FPS}fps")
            except Exception as e:
                print("dxcam failed, using mss:", e)
                self._camera = None
        if self._camera is None:
            self._sct = mss.MSS()
            self._monitor = self._sct.monitors[1]
            print(f"capture: mss fallback @ {TARGET_FPS}fps")

    def grab(self):
        from PIL import Image
        if self._camera is not None:
            f = self._camera.get_latest_frame()
            if f is None:
                if self._last_pil is not None:
                    return self._last_pil
                time.sleep(0.01)
                f = self._camera.get_latest_frame()
            if f is None:
                return self._last_pil
            self.phys_w, self.phys_h = f.shape[1], f.shape[0]
            img = Image.fromarray(f)
        else:
            shot = self._sct.grab(self._monitor)
            img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
            self.phys_w, self.phys_h = img.size
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        self._draw_cursor(img)
        self._last_pil = img
        return img

    def _draw_cursor(self, img):
        from PIL import ImageDraw
        try:
            sx = img.width / self.phys_w
            sy = img.height / self.phys_h
            mx, my = mouse.position
            x, y = mx * sx, my * sy
            s = max(1.2, img.height / 540)  # cursor scales with frame size
            pts = [(x + px * s, y + py * s) for (px, py) in CURSOR_ARROW]
            d = ImageDraw.Draw(img)
            d.polygon(pts, fill=(15, 15, 15), outline=(255, 255, 255))
        except Exception:
            pass

    def stop(self):
        if self._camera is not None:
            try:
                self._camera.stop()
            except Exception:
                pass
        if self._sct is not None:
            try:
                self._sct.close()
            except Exception:
                pass


class CaptureTrack(MediaStreamTrack):
    """Per-session video track reading from the shared ScreenCapture."""
    kind = "video"

    def __init__(self, cap: ScreenCapture):
        super().__init__()
        self._cap = cap

    async def next_timestamp(self):
        await asyncio.sleep(1 / TARGET_FPS)
        return time.time(), 1 / TARGET_FPS

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        img = self._cap.grab()
        global SCREEN_W, SCREEN_H
        SCREEN_W, SCREEN_H = img.width, img.height
        frame = VideoFrame.from_image(img)
        frame.pts = pts
        frame.time_base = time_base
        return frame


# ---------------------------------------------------------------- input injection

KEY_MAP = {
    "enter": Key.enter, "backspace": Key.backspace, "tab": Key.tab,
    "escape": Key.esc, "esc": Key.esc, "space": Key.space, "delete": Key.delete,
    "up": Key.up, "down": Key.down, "left": Key.left, "right": Key.right,
    "home": Key.home, "end": Key.end, "page_up": Key.page_up, "page_down": Key.page_down,
    "ctrl": Key.ctrl, "alt": Key.alt, "shift": Key.shift, "win": Key.cmd,
    "f1": Key.f1, "f2": Key.f2, "f3": Key.f3, "f4": Key.f4, "f5": Key.f5,
    "f6": Key.f6, "f7": Key.f7, "f8": Key.f8, "f9": Key.f9, "f10": Key.f10,
    "f11": Key.f11, "f12": Key.f12, "caps_lock": Key.caps_lock,
}
BUTTON_MAP = {"left": Button.left, "right": Button.right, "middle": Button.middle}


def set_mouse(x: float, y: float):
    """Move the mouse to normalized (0..1) coordinates."""
    mouse.position = (int(x * SCREEN_W), int(y * SCREEN_H))


INPUT_COUNT = {"n": 0}


def handle_input(msg: dict):
    t = msg.get("t")
    INPUT_COUNT["n"] += 1
    if t in ("mc", "md", "mu", "sc", "kd", "ku"):
        print(f"INPUT #{INPUT_COUNT['n']}: {t} {msg}")
    elif INPUT_COUNT["n"] % 30 == 0:
        print(f"INPUT x{INPUT_COUNT['n']} (mouse moves flowing)")
    try:
        if t == "mm":
            set_mouse(msg["x"], msg["y"])
        elif t == "mc":
            set_mouse(msg["x"], msg["y"])
            btn = BUTTON_MAP.get(msg.get("btn", "left"), Button.left)
            mouse.press(btn)
            mouse.release(btn)
        elif t == "md":
            set_mouse(msg["x"], msg["y"])
            mouse.press(BUTTON_MAP.get(msg.get("btn", "left"), Button.left))
        elif t == "mu":
            mouse.release(BUTTON_MAP.get(msg.get("btn", "left"), Button.left))
        elif t == "ms":
            set_mouse(msg["x"], msg["y"])
        elif t == "sc":
            mouse.scroll(0, int(msg.get("dy", 0)))
        elif t == "kd":
            k = msg.get("key", "")
            mapped = KEY_MAP.get(k)
            if mapped:
                keyboard.press(mapped)
            elif len(k) == 1:
                keyboard.press(k)
        elif t == "ku":
            k = msg.get("key", "")
            mapped = KEY_MAP.get(k)
            if mapped:
                keyboard.release(mapped)
            elif len(k) == 1:
                keyboard.release(k)
        elif t == "type":
            keyboard.type(msg.get("text", ""))
        elif t == "clip":
            import pyperclip
            pyperclip.copy(str(msg.get("text", "")))
            print("clipboard set on host PC")
    except Exception as e:
        print("input error:", e)


# ---------------------------------------------------------------- webrtc session

def build_pc():
    return RTCPeerConnection(RTCConfiguration(
        iceServers=[
            RTCIceServer(urls=["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]),
            # Free TURN relay (Open Relay Project) — behind strict NAT/firewalls
            RTCIceServer(urls=["turn:openrelay.metered.ca:80"], username="openrelayproject", credential="openrelayproject"),
            RTCIceServer(urls=["turn:openrelay.metered.ca:443"], username="openrelayproject", credential="openrelayproject"),
            RTCIceServer(urls=["turn:openrelay.metered.ca:443?transport=tcp"], username="openrelayproject", credential="openrelayproject"),
        ]
    ))


async def start_session(controller_socket_id: str, from_name: str = ""):
    global capture
    print(f"controller connected: {controller_socket_id} ({from_name})", flush=True)

    if controller_socket_id in sessions:
        await end_session_for(controller_socket_id)
    if capture is None:
        capture = ScreenCapture()

    pc = build_pc()
    track = CaptureTrack(capture)
    pc.addTrack(track)
    pc.addTrack(AudioStreamTrack())  # silent audio keeps the connection stable

    channel = pc.createDataChannel("control", ordered=True)

    def handle_dc_message(message):
        try:
            handle_input(json.loads(message))
        except Exception as e:
            print("bad input:", e)

    @channel.on("message")
    def on_message(message):
        handle_dc_message(message)

    # The controller also creates its own channel — bind it too, or input is lost
    @pc.on("datachannel")
    def on_datachannel(ch):
        print("controller data channel:", ch.label)

        @ch.on("message")
        def on_msg2(message):
            handle_dc_message(message)

    @pc.on("connectionstatechange")
    async def on_state():
        print("pc state:", pc.connectionState)
        if pc.connectionState in ("failed", "closed"):
            await end_session_for(controller_socket_id)

    sessions[controller_socket_id] = {"pc": pc, "dc": channel, "track": track}

    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sio.emit("remote:offer", {
        "to": controller_socket_id,
        "sdp": {"type": pc.localDescription.type, "sdp": pc.localDescription.sdp},
    })
    print(f"session streaming — {len(sessions)} controller(s) active")


async def end_session_for(controller_socket_id: str):
    global capture
    sess = sessions.pop(controller_socket_id, None)
    if not sess:
        return
    try:
        await sess["pc"].close()
    except Exception:
        pass
    try:
        sess["track"].stop()
    except Exception:
        pass
    print(f"session ended for {controller_socket_id} — {len(sessions)} controller(s) left")
    if not sessions and capture is not None:
        capture.stop()
        capture = None


async def end_all_sessions():
    for cid in list(sessions.keys()):
        await end_session_for(cid)


# ---------------------------------------------------------------- socket events

@sio.event
async def connect():
    print("connected to server as agent ✓")
    await sio.emit("agent:hello")


@sio.on("remote:session-request")
async def on_request(data):
    await start_session(data["from"], data.get("fromName", ""))


@sio.on("remote:answer")
async def on_answer(data):
    sess = sessions.get(data.get("from"))
    if sess:
        await sess["pc"].setRemoteDescription(RTCSessionDescription(data["sdp"]["sdp"], data["sdp"]["type"]))
        print("answer applied — STREAMING! (controller can see your screen now)")


@sio.on("remote:ice")
async def on_ice(data):
    sess = sessions.get(data.get("from"))
    if sess and data.get("candidate"):
        try:
            await sess["pc"].addIceCandidate(data["candidate"])
        except Exception:
            pass


@sio.on("remote:end")
async def on_remote_end(data):
    target = data.get("to")
    if target and target in sessions:
        await end_session_for(target)
    else:
        await end_all_sessions()


# ---------------------------------------------------------------- local input server
# The host's browser (during a "remote control" call session) forwards input
# events to this localhost server — the agent injects them into the OS.

async def input_ws_handler(ws):
    print("input client connected (host browser)")
    try:
        async for message in ws:
            try:
                handle_input(json.loads(message))
            except Exception as e:
                print("bad input:", e)
    except Exception:
        pass
    print("input client disconnected")


async def start_input_server():
    async with websockets.serve(input_ws_handler, "127.0.0.1", 9991):
        print("input server: ws://127.0.0.1:9991 ready")
        await asyncio.Future()  # run forever


# ---------------------------------------------------------------- main

async def main():
    headers = {"Authorization": f"Bearer {TOKEN}"}
    me = requests.get(f"{SERVER}/api/me", headers=headers).json()
    u = me.get("user", {})
    print(f"agent account: {u.get('name')} (@{u.get('username')})")

    await asyncio.gather(
        start_input_server(),
        sio.connect(
            SERVER,
            auth={"token": TOKEN},
            transports=["websocket"],
            socketio_path="socket.io",
        ),
        sio.wait(),
    )


if __name__ == "__main__":
    print("NexusTalk agent starting… (Ctrl+C to stop)")
    asyncio.run(main())

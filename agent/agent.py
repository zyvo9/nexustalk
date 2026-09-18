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

current_pc = None
current_dc = None
screen_track = None

# Screen dimensions (updated by the capture track) for input normalization
SCREEN_W = 1920
SCREEN_H = 1080


# ---------------------------------------------------------------- screen capture track

class DxcamTrack(MediaStreamTrack):
    """GPU-accelerated screen capture (DXGI Desktop Duplication via dxcam)."""
    kind = "video"

    def __init__(self):
        super().__init__()
        self._camera = dxcam.create(output_idx=0, output_color="RGB", max_buffer_len=4)
        if self._camera is None:
            raise RuntimeError("dxcam device busy")
        self._camera.start(target_fps=TARGET_FPS)
        self._last = None
        self._stop = False

    async def next_timestamp(self):
        await asyncio.sleep(1 / (TARGET_FPS * 2))
        return time.time(), 1 / TARGET_FPS

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        frame = self._grab()
        frame.pts = pts
        frame.time_base = time_base
        return frame

    def _grab(self):
        f = self._camera.get_latest_frame()
        if f is None and self._last is None:
            time.sleep(0.01)
            f = self._camera.get_latest_frame()
        if f is not None:
            self._last = f
        else:
            f = self._last
        h, w = f.shape[:2]
        global SCREEN_W, SCREEN_H
        SCREEN_W, SCREEN_H = w, h
        return VideoFrame.from_ndarray(f, format="rgb24")

    def stop(self):
        self._stop = True
        try:
            self._camera.stop()
        except Exception:
            pass


class MssTrack(MediaStreamTrack):
    """Fallback screen capture (GDI via mss) when dxcam is unavailable."""
    kind = "video"

    def __init__(self):
        super().__init__()
        self._sct = mss.mss()
        self._monitor = self._sct.monitors[1]
        self._stop = False

    async def next_timestamp(self):
        await asyncio.sleep(1 / TARGET_FPS)
        return time.time(), 1 / TARGET_FPS

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        shot = self._sct.grab(self._monitor)
        from PIL import Image
        img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        global SCREEN_W, SCREEN_H
        SCREEN_W, SCREEN_H = img.width, img.height
        frame = VideoFrame.from_image(img)
        frame.pts = pts
        frame.time_base = time_base
        return frame

    def stop(self):
        self._stop = True
        try:
            self._sct.close()
        except Exception:
            pass


def create_screen_track():
    if HAS_DXCAM:
        try:
            import cv2  # dxcam needs cv2 inside its capture thread — check up front
            track = DxcamTrack()
            print(f"capture: dxcam (GPU) @ {TARGET_FPS}fps")
            return track
        except Exception as e:
            print("dxcam failed, falling back to mss:", e)
    print(f"capture: mss fallback @ {TARGET_FPS}fps")
    return MssTrack()


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


async def start_session(controller_socket_id: str):
    global current_pc, current_dc, screen_track

    if current_pc:
        print("existing session found — new controller takes over", flush=True)
        await end_session()

    print("controller connected:", controller_socket_id, flush=True)
    pc = build_pc()
    current_pc = pc

    screen_track = create_screen_track()
    pc.addTrack(screen_track)
    pc.addTrack(AudioStreamTrack())  # silent audio keeps the connection stable

    channel = pc.createDataChannel("control", ordered=True)
    current_dc = channel

    @channel.on("message")
    def on_message(message):
        try:
            handle_input(json.loads(message))
        except Exception as e:
            print("bad input:", e)

    @pc.on("connectionstatechange")
    async def on_state():
        print("pc state:", pc.connectionState)
        if pc.connectionState in ("failed", "closed"):
            await end_session()

    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sio.emit("remote:offer", {
        "to": controller_socket_id,
        "sdp": {"type": pc.localDescription.type, "sdp": pc.localDescription.sdp},
    })


async def end_session():
    global current_pc, current_dc, screen_track
    if screen_track:
        screen_track.stop()
    if current_pc:
        try:
            await current_pc.close()
        except Exception:
            pass
    current_pc = None
    current_dc = None
    screen_track = None
    print("session ended")


# ---------------------------------------------------------------- socket events

@sio.event
async def connect():
    print("connected to server as agent ✓")
    await sio.emit("agent:hello")


@sio.on("remote:session-request")
async def on_request(data):
    await start_session(data["from"])


@sio.on("remote:answer")
async def on_answer(data):
    if current_pc:
        await current_pc.setRemoteDescription(RTCSessionDescription(data["sdp"]["sdp"], data["sdp"]["type"]))
        print("answer applied — STREAMING! (controller can see your screen now)")


@sio.on("remote:ice")
async def on_ice(data):
    if current_pc and data.get("candidate"):
        try:
            await current_pc.addIceCandidate(data["candidate"])
        except Exception:
            pass


@sio.on("remote:end")
async def on_remote_end(data):
    await end_session()


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

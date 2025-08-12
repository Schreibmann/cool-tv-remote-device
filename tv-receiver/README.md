# TV Receiver (Android TV)

Minimal Android TV app that listens for WebSocket commands on port 8765 and performs UI actions via AccessibilityService.

How to run:
- Open `tv-receiver/` in Android Studio.
- Let Gradle sync; build and install on Android TV device/emulator.
- Launch the app "TV Receiver" on TV.
- Press "Открыть настройки доступности" and enable the service "TV Receiver".
- Press "Запустить сервер" to start the WebSocket server.

Protocol (JSON over ws):
- {"type":"scroll","dx":0,"dy":int}
- {"type":"click","button":"left|right"}
- {"type":"text","text":"string"}
- {"type":"key","key":"enter|dpad_up|dpad_down|dpad_left|dpad_right|back|home","action":"tap"}

Notes:
- Server binds to `0.0.0.0:8765` inside the TV device. From the phone, use `ws://<TV_IP>:8765`.
- Some global keys (home/back) may be restricted via Accessibility and require alternative handling.



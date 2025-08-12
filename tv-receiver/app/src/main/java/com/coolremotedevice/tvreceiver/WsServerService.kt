package com.coolremotedevice.tvreceiver

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import org.java_websocket.server.WebSocketServer
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.WebSocket
import java.lang.Integer.max
import java.net.InetSocketAddress
import org.json.JSONObject

class WsServerService : Service() {
    private var server: SimpleWsServer? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (server == null) {
            server = SimpleWsServer(8765)
            server?.start()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        server?.stop(1000)
        server = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private class SimpleWsServer(port: Int) : WebSocketServer(InetSocketAddress(port)) {
        override fun onOpen(conn: WebSocket, handshake: ClientHandshake) {
            Log.i("WsServer", "Client connected: ${conn.remoteSocketAddress}")
        }

        override fun onClose(conn: WebSocket, code: Int, reason: String, remote: Boolean) {
            Log.i("WsServer", "Client disconnected: ${conn.remoteSocketAddress}")
        }

        override fun onMessage(conn: WebSocket, message: String) {
            try {
                val obj = JSONObject(message)
                val type = obj.optString("type")
                when (type) {
                    "scroll" -> {
                        val dy = obj.optInt("dy", 0)
                        RemoteAccessibilityService.withService { svc ->
                            svc.scroll(dy > 0)
                        }
                    }
                    "click" -> {
                        RemoteAccessibilityService.withService { svc -> svc.clickFocused() }
                    }
                    "text" -> {
                        val text = obj.optString("text", "")
                        if (text.isNotEmpty()) {
                            RemoteAccessibilityService.withService { svc -> svc.setText(text) }
                        }
                    }
                    "key" -> {
                        val key = obj.optString("key", "")
                        when (key) {
                            "enter" -> RemoteAccessibilityService.withService { svc -> svc.clickFocused() }
                            "dpad_up" -> RemoteAccessibilityService.withService { svc -> svc.scroll(false) }
                            "dpad_down" -> RemoteAccessibilityService.withService { svc -> svc.scroll(true) }
                            "back" -> RemoteAccessibilityService.withService { svc -> svc.globalBack() }
                            "home" -> RemoteAccessibilityService.withService { svc -> svc.globalHome() }
                        }
                    }
                    "move" -> {
                        val dy = obj.optInt("dy", 0)
                        if (dy != 0) {
                            RemoteAccessibilityService.withService { svc -> svc.scroll(dy > 0) }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("WsServer", "Error handling message", e)
            }
        }

        override fun onError(conn: WebSocket?, ex: Exception) {
            Log.e("WsServer", "WS error", ex)
        }

        override fun onStart() {
            Log.i("WsServer", "WebSocket server started on port ${address.port}")
        }
    }
}



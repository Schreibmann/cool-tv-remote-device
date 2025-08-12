package com.coolremotedevice.tvreceiver

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class RemoteAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile
        private var instance: RemoteAccessibilityService? = null

        fun withService(action: (RemoteAccessibilityService) -> Unit) {
            instance?.let(action)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    fun clickFocused() {
        val root = rootInActiveWindow ?: return
        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: root.focusSearch(AccessibilityNodeInfo.FOCUS_FORWARD)
        if (focused != null && focused.isClickable) {
            focused.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } else {
            // fallback: small tap center
            tapCenter()
        }
    }

    private fun tapCenter() {
        val dm = resources.displayMetrics
        val x = dm.widthPixels / 2f
        val y = dm.heightPixels / 2f
        val path = Path()
        path.moveTo(x, y)
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 50))
            .build()
        dispatchGesture(gesture, null, null)
    }

    fun scroll(forward: Boolean) {
        val root = rootInActiveWindow ?: return
        val target = root.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY) ?: root
        val action = if (forward) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        target.performAction(action)
    }

    fun setText(text: String) {
        val root = rootInActiveWindow ?: return
        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return
        val args = Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text) }
        focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun globalBack() {
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    fun globalHome() {
        performGlobalAction(GLOBAL_ACTION_HOME)
    }
}



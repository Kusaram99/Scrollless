package com.test_background;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

public class MyAccessibilityService extends AccessibilityService {
    private static String currentPackageName = null;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && event.getPackageName() != null) {
            currentPackageName = event.getPackageName().toString();
            Log.d("MyAccessibilityService", "Current package: " + currentPackageName);
        }
    }

    @Override
    public void onInterrupt() {
        // Required override
    }

    public static String getCurrentForegroundApp() {
        return currentPackageName;
    }
}

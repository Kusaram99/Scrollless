package com.test_background;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ForegroundAppAccessibilityService extends AccessibilityService {
    private static final String TAG = "ForegroundAppService";

    private static ReactApplicationContext reactContext;

    public static void setReactContext(ReactApplicationContext context) {
        reactContext = context;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String packageName = event.getPackageName().toString();

        // Send package name to React Native
        if (reactContext != null) {
            new Handler(Looper.getMainLooper()).post(() -> {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("ForegroundAppChanged", packageName);
            });
        }

        Log.d(TAG, "Foreground app: " + packageName);
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "AccessibilityService Interrupted");
    }
}

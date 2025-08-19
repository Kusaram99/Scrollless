package com.test_background;

import android.net.Uri;
import com.facebook.react.bridge.ReactContext;

import android.os.PowerManager;

import android.app.usage.UsageStats;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.app.ActivityManager;
import java.util.List;

public class ForegroundAppModule extends ReactContextBaseJavaModule {

    private static String currentForegroundApp = "unknown"; // Default value

    ForegroundAppModule(ReactApplicationContext context) {
        super(context);
        // Initialize the accessibility service context
        ForegroundAppAccessibilityService.setReactContext(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "ForegroundApp";
    }

    /**
     * Opens usage access settings screen so user can grant permission
     */
    @ReactMethod
    public void openUsageSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
        }
    }

    /**
     * Checks if usage access is granted (by checking if any usage event is
     * returned)
     */
    @ReactMethod
    public void isUsageAccessGranted(Promise promise) {
        try {
            UsageStatsManager usm = (UsageStatsManager) getReactApplicationContext()
                    .getSystemService(Context.USAGE_STATS_SERVICE);

            long currentTime = System.currentTimeMillis();
            UsageEvents events = usm.queryEvents(currentTime - 1000 * 10, currentTime);

            boolean granted = events != null && events.hasNextEvent();
            promise.resolve(granted);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // Method to update the current foreground app
    public static void updateForegroundApp(String packageName) {
        currentForegroundApp = packageName;
    }

    /**
     * Returns the currently foreground app (if any) and how long it's been in the
     * foreground
     */
    @ReactMethod
    public void getCurrentForegroundApp(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // For Android 10+
                UsageStatsManager usm = (UsageStatsManager) getReactApplicationContext()
                        .getSystemService(Context.USAGE_STATS_SERVICE);
                long time = System.currentTimeMillis();
                UsageEvents events = usm.queryEvents(time - 1000 * 10, time);

                UsageEvents.Event event = new UsageEvents.Event();
                String lastPackage = null;
                long lastTimeStamp = 0;

                while (events.hasNextEvent()) {
                    events.getNextEvent(event);
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        if (event.getTimeStamp() > lastTimeStamp) {
                            lastTimeStamp = event.getTimeStamp();
                            lastPackage = event.getPackageName();
                        }
                    }
                }

                if (lastPackage != null) {
                    promise.resolve(lastPackage);
                } else {
                    promise.reject("NO_APP", "No foreground app detected.");
                }
            } else {
                // Fallback to accessibility if needed for older devices
                String pkg = MyAccessibilityService.getCurrentForegroundApp();
                if (pkg != null) {
                    promise.resolve(pkg);
                } else {
                    promise.reject("NO_APP", "No foreground app detected.");
                }
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void showOverlay(String appName) {
        if (!Settings.canDrawOverlays(getReactApplicationContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getReactApplicationContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            return;
        }

        Intent intent = new Intent(getReactApplicationContext(), OverlayService.class);
        intent.putExtra("appName", appName);
        getReactApplicationContext().startService(intent);
    }

    // Detect screen is on / of
    @ReactMethod
    public void isScreenOn(Promise promise) {
        try {
            PowerManager powerManager = (PowerManager) getReactApplicationContext()
                    .getSystemService(Context.POWER_SERVICE);
            boolean isScreenOn;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                isScreenOn = powerManager.isInteractive();
            } else {
                isScreenOn = powerManager.isScreenOn();
            }

            promise.resolve(isScreenOn);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

}

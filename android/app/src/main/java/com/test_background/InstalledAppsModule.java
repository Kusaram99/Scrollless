package com.test_background;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.drawable.Drawable;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.util.List;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class InstalledAppsModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public InstalledAppsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "InstalledApps";
    }

    @ReactMethod
    public void getAllInstalledApps(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            WritableArray resultArray = Arguments.createArray();

            for (ApplicationInfo app : apps) {
                WritableMap appInfo = Arguments.createMap();

                appInfo.putString("appName", pm.getApplicationLabel(app).toString());
                appInfo.putString("packageName", app.packageName);
                appInfo.putBoolean("isSystemApp", (app.flags & ApplicationInfo.FLAG_SYSTEM) != 0);

                // Optional: Add app icon as base64
                try {
                    Drawable icon = pm.getApplicationIcon(app);
                    Bitmap bitmap = Bitmap.createBitmap(icon.getIntrinsicWidth(), icon.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    icon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                    icon.draw(canvas);

                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                    byte[] iconBytes = outputStream.toByteArray();
                    String iconBase64 = Base64.encodeToString(iconBytes, Base64.NO_WRAP);

                    appInfo.putString("iconBase64", iconBase64);
                } catch (Exception e) {
                    appInfo.putString("iconBase64", null); // Fallback
                }

                resultArray.pushMap(appInfo);
            }

            promise.resolve(resultArray);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get installed apps", e);
        }
    }
}

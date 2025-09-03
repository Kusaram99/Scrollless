package com.test_background;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.util.Log;

public class OverlayService extends Service {

    private WindowManager windowManager;
    private View overlayView;

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not binding
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String heading = intent.getStringExtra("heading");
        String message = intent.getStringExtra("message");

        
        Log.d("OverlayService", "Service started with heading=" + heading);
        
        showOverlay(heading, message);
        return START_NOT_STICKY;
    }

    private void showOverlay(String heading, String message) {
        if (overlayView != null) return; // Already showing

        LayoutInflater inflater = LayoutInflater.from(this);
        overlayView = inflater.inflate(R.layout.overlay_layout, null);

        TextView popupHeading = overlayView.findViewById(R.id.popupHeading);
        TextView popupMessage = overlayView.findViewById(R.id.popupMessage);
        Button closeButton = overlayView.findViewById(R.id.closeButton);

        popupHeading.setText(heading != null && !heading.isEmpty() ?"⚠️ Alert " + heading : "⚠️ Alert");

        if (message == null || message.isEmpty()) {
            popupMessage.setVisibility(View.GONE);
        } else {
            popupMessage.setText(message);
            popupMessage.setVisibility(View.VISIBLE);
        }

        closeButton.setOnClickListener(v -> stopSelf());

        // ✅ Correct Window type based on Android version
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        windowManager.addView(overlayView, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (windowManager != null && overlayView != null) {
            windowManager.removeView(overlayView);
        }
        overlayView = null;
        windowManager = null;
    }
}

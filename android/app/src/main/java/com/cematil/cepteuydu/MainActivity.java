package com.cematil.cepteuydu;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Telefonun geri tuşu: ana sayfada uygulamadan çık, diğer sayfalarda ana sayfaya dön
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                String url = webView != null ? webView.getUrl() : null;
                if (url == null) {
                    finish();
                    return;
                }
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                boolean onHome = path == null || path.isEmpty() || path.equals("/") || path.endsWith("/index.html");
                if (onHome) {
                    finish();
                } else {
                    webView.loadUrl(uri.getScheme() + "://" + uri.getAuthority() + "/index.html");
                }
            }
        });
    }
}

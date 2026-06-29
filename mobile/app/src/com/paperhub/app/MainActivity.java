package com.paperhub.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

/**
 * PaperHub Android shell: a WebView pointed at the PaperHub server. The URL is
 * configurable at runtime (menu -> "Set server URL") and stored in prefs, so the
 * same APK works against a laptop on the LAN or a hosted https URL.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "paperhub";
    private static final String KEY_URL = "server_url";
    private static final String DEFAULT_URL = "http://192.168.0.107:7000";
    private static final int FILE_CHOOSER_RC = 1001;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage holds the auth tokens
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme();
                if (scheme != null && (scheme.equals("http") || scheme.equals("https"))) {
                    return false; // keep web pages inside the WebView
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u)); // mailto:, tel:, etc.
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) {
                    Toast.makeText(
                                    MainActivity.this,
                                    "Can't reach the server. Tap the menu -> Set server URL.",
                                    Toast.LENGTH_LONG)
                            .show();
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                filePathCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_RC);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(getServerUrl());
        }
    }

    private String getServerUrl() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_URL, DEFAULT_URL);
    }

    private void setServerUrl(String url) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_URL, url).apply();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.add(0, 1, 0, "Set server URL");
        menu.add(0, 2, 1, "Reload");
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == 1) {
            promptUrl();
            return true;
        }
        if (item.getItemId() == 2) {
            web.reload();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void promptUrl() {
        final EditText input = new EditText(this);
        input.setText(getServerUrl());
        input.setHint("http://192.168.0.107:7000 or https://...onrender.com");
        new AlertDialog.Builder(this)
                .setTitle("PaperHub server URL")
                .setView(input)
                .setPositiveButton(
                        "Save & load",
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface d, int which) {
                                String url = input.getText().toString().trim();
                                if (url.length() == 0) {
                                    return;
                                }
                                if (!url.startsWith("http")) {
                                    url = "http://" + url;
                                }
                                setServerUrl(url);
                                web.loadUrl(url);
                            }
                        })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    protected void onActivityResult(int rc, int res, Intent data) {
        if (rc == FILE_CHOOSER_RC) {
            if (filePathCallback == null) {
                return;
            }
            Uri[] results = null;
            if (res == Activity.RESULT_OK && data != null) {
                if (data.getDataString() != null) {
                    results = new Uri[] {Uri.parse(data.getDataString())};
                } else if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    results = new Uri[n];
                    for (int i = 0; i < n; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(rc, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }
}

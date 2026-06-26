# PaperHub — Android app (WebView shell)

A tiny native Android app that wraps the PaperHub web app in a full-screen
`WebView`. Because PaperHub has a backend, the app loads a **server URL** (your
laptop on the LAN, or a hosted `https://…` URL) — it is not a standalone offline
app. The URL is configurable at runtime: **menu → "Set server URL"** (saved in
app prefs), defaulting to `http://192.168.0.107:7000`.

What works in the WebView: email/password login, browsing/preview/upload, all
the normal pages. **Google sign-in does _not_ work inside a WebView** (Google
blocks OAuth in embedded WebViews) — use email/password in the app, or open the
site in Chrome for Google sign-in.

## Files

```
mobile/app/
├── AndroidManifest.xml                  # minSdk 24, INTERNET, cleartext allowed
├── res/values/strings.xml               # app name
├── res/mipmap-*/ic_launcher.png         # launcher icons (all densities)
└── src/com/paperhub/app/MainActivity.java   # the WebView activity
```

No Gradle/AndroidX — it's framework-only, so it builds with just the Android
SDK command-line tools.

## Build the APK

**Easiest (no Android tooling): PWA → APK.** Host the app (see the repo README
"Free hosting"), then paste the `https://…` URL into
[PWABuilder](https://www.pwabuilder.com) → it generates a signed APK in minutes.

**From this source (Android Studio):** create an empty project with package
`com.paperhub.app`, drop in `MainActivity.java`, `AndroidManifest.xml`, and the
`res/` icons, then Build → Build APK(s).

**From this source (command line)** — with `aapt2`, `d8`, `zipalign`,
`apksigner` (Android build-tools) and a platform `android.jar` on hand:

```bash
aapt2 compile --dir res -o res.zip
aapt2 link -o base.apk -I "$ANDROID_JAR" --manifest AndroidManifest.xml \
  -R res.zip --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay
javac --release 8 -classpath "$ANDROID_JAR" -d classes src/com/paperhub/app/MainActivity.java
d8 --release --min-api 24 --lib "$ANDROID_JAR" --output dex classes/com/paperhub/app/*.class
cp base.apk app.apk && (cd dex && zip -j ../app.apk classes.dex)
zipalign -p -f 4 app.apk aligned.apk
apksigner sign --ks debug.keystore --ks-pass pass:android --out PaperHub.apk aligned.apk
```

## Install on a phone

1. Copy `PaperHub.apk` to the phone, tap it, allow "install from unknown
   sources".
2. Open the app → menu → **Set server URL**:
   - laptop on the same Wi-Fi: `http://<laptop-ip>:7000` (run `docker compose up`)
   - hosted: `https://<your-app>.onrender.com`

#!/bin/bash
# Build a signed debug APK from mobile/app/ using only the Android build-tools +
# a platform android.jar — no Gradle/AndroidX. Point it at your SDK:
#
#   BUILD_TOOLS=$ANDROID_HOME/build-tools/35.0.0 \
#   ANDROID_JAR=$ANDROID_HOME/platforms/android-34/android.jar \
#   mobile/build.sh
#
# Output: mobile/PaperHub.apk
set -euo pipefail
APP="$(cd "$(dirname "$0")" && pwd)/app"
: "${BUILD_TOOLS:?Set BUILD_TOOLS to an Android build-tools dir (aapt2, d8, zipalign, apksigner)}"
: "${ANDROID_JAR:?Set ANDROID_JAR to a platform android.jar}"
OUT="$(dirname "$APP")/out"; rm -rf "$OUT"; mkdir -p "$OUT/classes" "$OUT/dex"

AAPT2="$BUILD_TOOLS/aapt2"; D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"; APKSIGNER="$BUILD_TOOLS/apksigner"
# Use javac if present; else drive the compiler through the jdk.compiler module
# (works on a JRE that still ships the module but no javac binary).
JAVAC="$(command -v javac || echo 'java -m jdk.compiler/com.sun.tools.javac.Main')"

"$AAPT2" compile --dir "$APP/res" -o "$OUT/res.zip"
"$AAPT2" link -o "$OUT/base.apk" -I "$ANDROID_JAR" \
  --manifest "$APP/AndroidManifest.xml" -R "$OUT/res.zip" \
  --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay

# shellcheck disable=SC2086
$JAVAC -source 8 -target 8 -nowarn -classpath "$ANDROID_JAR" -d "$OUT/classes" \
  "$APP/src/com/paperhub/app/MainActivity.java"

"$D8" --release --min-api 24 --lib "$ANDROID_JAR" --output "$OUT/dex" \
  "$OUT"/classes/com/paperhub/app/*.class

cp "$OUT/base.apk" "$OUT/unsigned.apk"
( cd "$OUT/dex" && zip -q -j "$OUT/unsigned.apk" classes.dex )
"$ZIPALIGN" -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

KS="${KS:-$OUT/debug.keystore}"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -alias androiddebugkey \
  -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=PaperHub Debug,O=PaperHub,C=BD" >/dev/null 2>&1

"$APKSIGNER" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \
  --min-sdk-version 24 --out "$(dirname "$APP")/PaperHub.apk" "$OUT/aligned.apk"
"$APKSIGNER" verify "$(dirname "$APP")/PaperHub.apk" && echo "OK -> mobile/PaperHub.apk"

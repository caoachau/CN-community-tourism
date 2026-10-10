# Mobile app: Flutter toolchain blocker

The development machine was checked on 2026-09-29. Node.js 22.14.0, npm 10.9.2, Git 2.47.1, and Java 25.0.2 are present. Flutter, Dart, and `adb` are not available on PATH; `ANDROID_HOME` and `ANDROID_SDK_ROOT` are unset, and Android SDK folders were not found in the common locations checked. Therefore a debug APK cannot be built or verified yet. Do not begin customer/household feature implementation until this blocker is cleared.

Install Flutter stable and the Android SDK (Android SDK Platform, Platform-Tools, Build-Tools, and command-line tools), then configure `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) and add Flutter/Android tools to PATH. Reopen the terminal and verify with:

```powershell
flutter doctor -v
flutter doctor --android-licenses
flutter create . --platforms=android
flutter build apk --debug
```

Record `flutter doctor -v` and a successful APK build before marking mobile toolchain verification complete. Java is currently 25.0.2; if Flutter/Gradle reports an unsupported JDK, install a compatible JDK and set `JAVA_HOME` to it.

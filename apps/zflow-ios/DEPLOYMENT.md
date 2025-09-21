# ZFlow iOS Deployment Guide

## 📱 **Development Build Setup (Free Apple ID)**

### **Overview**
This guide covers setting up a standalone iOS app that works independently of your desktop dev server, using only a free Apple ID (no paid Apple Developer Program required).

---

## 🏗️ **Option 3: Expo Development Build (CHOSEN)**

### **Why This Option:**
- ✅ **Easy OTA updates** - Push new features instantly without rebuilding
- ✅ **Works offline** - App functions without dev server running
- ✅ **Free Apple ID compatible** - No paid developer account needed
- ✅ **7-day rebuild cycle** - Much better than daily dev server dependency
- ✅ **Full native features** - Custom native code when needed

### **Configuration Completed:**
- ✅ EAS CLI installed globally (`npm install -g eas-cli`)
- ✅ `eas.json` configuration file created
- ✅ `expo-dev-client` package installed
- ✅ Bundle identifier set: `com.zephyros.zflow`
- ✅ Development client plugin added to app.json
- ✅ ITSAppUsesNonExemptEncryption set to false
- ✅ EAS project ID configured

---

## 🚀 **Build & Install Process**

### **Prerequisites:**
- Xcode installed on Mac ✅
- iPhone connected via USB
- Free Apple ID signed into Xcode

### **One-Time Setup:**

#### **1. Configure Xcode:**
```bash
# Verify Xcode installation
xcode-select --print-path
```

#### **2. Setup Device in Xcode:**
- Open **Xcode**
- Go to **Xcode > Preferences > Accounts**
- Click **+** and add your **Apple ID**
- Go to **Window > Devices and Simulators**
- Select your connected iPhone and click **"Use for Development"**

#### **3. Trust Device:**
- On iPhone: **Settings > General > Device Management**
- Trust your computer if prompted

### **Build Commands:**

#### **Initial Build (Run once per 7 days):**
```bash
cd apps/zflow-ios
npx expo run:ios --device
```

This will:
- Build app with development client
- Sign with your free Apple ID
- Install directly on connected iPhone
- Create standalone app (works without dev server)

#### **Push Updates (Daily development):**
```bash
cd apps/zflow-ios
npx expo start --dev-client
```

Then open the installed ZFlow app on your phone to load latest changes.

---

## 📋 **Development Workflow**

### **Daily Development:**
1. Make code changes on desktop
2. Run `npx expo start --dev-client`
3. Open ZFlow app on iPhone
4. App automatically loads latest code
5. **No desktop server needed after loading**

### **Weekly Maintenance:**
1. Rebuild app when 7-day certificate expires
2. Run `npx expo run:ios --device` again
3. Re-install on device

---

## 🔧 **Configuration Files**

### **eas.json:**
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" }
    },
    "production": {
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": { "production": {} }
}
```

### **app.json updates:**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.zephyros.zflow",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "plugins": [
      "expo-web-browser",
      "expo-dev-client"
    ],
    "extra": {
      "eas": {
        "projectId": "d1b48d95-9b9d-4702-9b10-c6d66c03fb46"
      }
    }
  }
}
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Build Fails:**
- Ensure iPhone is connected and trusted
- Check Xcode has your Apple ID configured
- Verify bundle identifier is unique

#### **App Won't Install:**
- Check device storage space
- Ensure iOS version compatibility
- Trust the developer certificate on device

#### **Updates Not Loading:**
- Ensure both devices on same WiFi
- Check `npx expo start --dev-client` is running
- Force close and reopen app

### **Certificate Expiry:**
- Free Apple ID certificates expire every 7 days
- Symptoms: App won't open, shows "Unable to verify app"
- Solution: Rebuild with `npx expo run:ios --device`

---

## 📈 **Benefits Over Other Options**

| Feature | Expo Go | Local Build | Dev Build (Chosen) | EAS Cloud |
|---------|---------|-------------|-------------------|-----------|
| Works Offline | ❌ | ✅ | ✅ | ✅ |
| OTA Updates | ❌ | ❌ | ✅ | ✅ |
| Free Account | ✅ | ✅ | ✅ | ❌ |
| Custom Native Code | ❌ | ✅ | ✅ | ✅ |
| Build Duration | Instant | 5-10 min | 5-10 min | 15-20 min |
| Rebuild Frequency | Daily | As needed | Weekly | As needed |

---

## 🎯 **Next Steps**

1. **Complete initial build** following the process above
2. **Test OTA update workflow** with a small code change
3. **Document any device-specific issues** encountered
4. **Set weekly calendar reminder** for certificate renewal

---

*Last Updated: September 21, 2025*
*Status: Ready for initial build*
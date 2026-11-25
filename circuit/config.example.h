// ============================================================================
//  MediBridge SECRETS — copy this file to  config.h  and fill in YOUR values.
//  config.h is listed in .gitignore. NEVER commit or share config.h.
//  If config.h is missing (or the token still says PASTE_...), the firmware
//  runs in OFFLINE mode: everything works over the Serial Monitor, nothing
//  is sent to the cloud.
// ============================================================================
#pragma once

// ---- Blynk (copy these 3 values from Blynk Console -> your device -> Device Info)
#define BLYNK_TEMPLATE_ID   "PASTE_TEMPLATE_ID_HERE"     // looks like TMPL1a2b3c4d
#define BLYNK_TEMPLATE_NAME "MediBridge"
#define BLYNK_AUTH_TOKEN    "PASTE_YOUR_DEVICE_AUTH_TOKEN_HERE"   // <-- YOUR TOKEN GOES HERE

// ---- WiFi
// In the Wokwi simulator keep these three lines exactly as they are.
// On real hardware, put your own router name/password (channel 0 = auto-scan).
#define MB_WIFI_SSID    "Wokwi-GUEST"
#define MB_WIFI_PASS    ""
#define MB_WIFI_CHANNEL 6

// ---- Optional
#define MB_DEVICE_ID    "MB-ESP32-01"

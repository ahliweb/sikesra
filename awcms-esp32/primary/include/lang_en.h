/**
 * AWCMS ESP32 - English Language Strings
 * 
 * This file contains all user-facing strings in English.
 * To change the device language, modify DEVICE_LANGUAGE in config.h
 */

#ifndef LANG_EN_H
#define LANG_EN_H

// System Messages
#define STR_DEVICE_READY "Device Ready"
#define STR_DEVICE_STARTING "Starting device..."
#define STR_DEVICE_REBOOTING "Rebooting..."
#define STR_FIRMWARE_VERSION "Firmware Version"

// WiFi
#define STR_WIFI_CONNECTING "Connecting to WiFi..."
#define STR_WIFI_CONNECTED "WiFi Connected"
#define STR_WIFI_DISCONNECTED "WiFi Disconnected"
#define STR_WIFI_RECONNECTING "Reconnecting to WiFi..."
#define STR_WIFI_SSID "Network"
#define STR_WIFI_SIGNAL "Signal Strength"
#define STR_WIFI_IP "IP Address"

// Supabase / API
#define STR_API_CONNECTING "Connecting to server..."
#define STR_API_CONNECTED "Server connected"
#define STR_API_DISCONNECTED "Server disconnected"
#define STR_API_ERROR "Server error"
#define STR_API_SYNCING "Syncing data..."
#define STR_API_SYNC_COMPLETE "Sync complete"
#define STR_API_AUTH_SUCCESS "Authentication successful"
#define STR_API_AUTH_FAILED "Authentication failed"

// Sensors
#define STR_SENSOR_READING "Reading sensors..."
#define STR_SENSOR_TEMPERATURE "Temperature"
#define STR_SENSOR_HUMIDITY "Humidity"
#define STR_SENSOR_PRESSURE "Pressure"
#define STR_SENSOR_LIGHT "Light Level"
#define STR_SENSOR_MOTION "Motion Detected"
#define STR_SENSOR_NO_MOTION "No Motion"
#define STR_SENSOR_ERROR "Sensor Error"

// Camera (ESP32-CAM)
#define STR_CAMERA_INIT "Initializing camera..."
#define STR_CAMERA_READY "Camera ready"
#define STR_CAMERA_ERROR "Camera error"
#define STR_CAMERA_CAPTURE "Capturing image..."
#define STR_CAMERA_UPLOADED "Image uploaded"

// Storage
#define STR_STORAGE_INIT "Initializing storage..."
#define STR_STORAGE_READY "Storage ready"
#define STR_STORAGE_ERROR "Storage error"
#define STR_STORAGE_FULL "Storage full"

// Errors
#define STR_ERROR_GENERIC "An error occurred"
#define STR_ERROR_TIMEOUT "Operation timed out"
#define STR_ERROR_MEMORY "Memory allocation failed"
#define STR_ERROR_CONFIG "Configuration error"

// Web Interface
#define STR_WEB_TITLE "AWCMS IoT Device"
#define STR_WEB_STATUS "Device Status"
#define STR_WEB_SETTINGS "Settings"
#define STR_WEB_RESTART "Restart Device"
#define STR_WEB_UPDATE "Update Firmware"
#define STR_WEB_SAVE "Save"
#define STR_WEB_CANCEL "Cancel"

// Status
#define STR_STATUS_ONLINE "Online"
#define STR_STATUS_OFFLINE "Offline"
#define STR_STATUS_IDLE "Idle"
#define STR_STATUS_BUSY "Busy"
#define STR_STATUS_OK "OK"
#define STR_STATUS_WARNING "Warning"
#define STR_STATUS_ERROR "Error"

#endif // LANG_EN_H

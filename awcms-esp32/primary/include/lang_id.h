/**
 * AWCMS ESP32 - Indonesian Language Strings
 *
 * File ini berisi semua string yang ditampilkan kepada pengguna dalam Bahasa
 * Indonesia. Untuk mengubah bahasa perangkat, ubah DEVICE_LANGUAGE di config.h
 */

#ifndef LANG_ID_H
#define LANG_ID_H

// System Messages
#define STR_DEVICE_READY "Perangkat Siap"
#define STR_DEVICE_STARTING "Memulai perangkat..."
#define STR_DEVICE_REBOOTING "Memulai ulang..."
#define STR_FIRMWARE_VERSION "Versi Firmware"

// WiFi
#define STR_WIFI_CONNECTING "Menghubungkan ke WiFi..."
#define STR_WIFI_CONNECTED "WiFi Terhubung"
#define STR_WIFI_DISCONNECTED "WiFi Terputus"
#define STR_WIFI_RECONNECTING "Menghubungkan ulang ke WiFi..."
#define STR_WIFI_SSID "Jaringan"
#define STR_WIFI_SIGNAL "Kekuatan Sinyal"
#define STR_WIFI_IP "Alamat IP"

// Supabase / API
#define STR_API_CONNECTING "Menghubungkan ke server..."
#define STR_API_CONNECTED "Server terhubung"
#define STR_API_DISCONNECTED "Server terputus"
#define STR_API_ERROR "Kesalahan server"
#define STR_API_SYNCING "Menyinkronkan data..."
#define STR_API_SYNC_COMPLETE "Sinkronisasi selesai"
#define STR_API_AUTH_SUCCESS "Autentikasi berhasil"
#define STR_API_AUTH_FAILED "Autentikasi gagal"

// Sensors
#define STR_SENSOR_READING "Membaca sensor..."
#define STR_SENSOR_TEMPERATURE "Suhu"
#define STR_SENSOR_HUMIDITY "Kelembaban"
#define STR_SENSOR_PRESSURE "Tekanan"
#define STR_SENSOR_LIGHT "Tingkat Cahaya"
#define STR_SENSOR_MOTION "Gerakan Terdeteksi"
#define STR_SENSOR_NO_MOTION "Tidak Ada Gerakan"
#define STR_SENSOR_ERROR "Kesalahan Sensor"

// Camera (ESP32-CAM)
#define STR_CAMERA_INIT "Menginisialisasi kamera..."
#define STR_CAMERA_READY "Kamera siap"
#define STR_CAMERA_ERROR "Kesalahan kamera"
#define STR_CAMERA_CAPTURE "Mengambil gambar..."
#define STR_CAMERA_UPLOADED "Gambar diunggah"

// Storage
#define STR_STORAGE_INIT "Menginisialisasi penyimpanan..."
#define STR_STORAGE_READY "Penyimpanan siap"
#define STR_STORAGE_ERROR "Kesalahan penyimpanan"
#define STR_STORAGE_FULL "Penyimpanan penuh"

// Errors
#define STR_ERROR_GENERIC "Terjadi kesalahan"
#define STR_ERROR_TIMEOUT "Operasi habis waktu"
#define STR_ERROR_MEMORY "Alokasi memori gagal"
#define STR_ERROR_CONFIG "Kesalahan konfigurasi"

// Web Interface
#define STR_WEB_TITLE "Perangkat IoT AWCMS"
#define STR_WEB_STATUS "Status Perangkat"
#define STR_WEB_SETTINGS "Pengaturan"
#define STR_WEB_RESTART "Mulai Ulang Perangkat"
#define STR_WEB_UPDATE "Perbarui Firmware"
#define STR_WEB_SAVE "Simpan"
#define STR_WEB_CANCEL "Batal"

// Status
#define STR_STATUS_ONLINE "Online"
#define STR_STATUS_OFFLINE "Offline"
#define STR_STATUS_IDLE "Siaga"
#define STR_STATUS_BUSY "Sibuk"
#define STR_STATUS_OK "OK"
#define STR_STATUS_WARNING "Peringatan"
#define STR_STATUS_ERROR "Kesalahan"

#endif // LANG_ID_H

/// AWCMS Mobile - Connectivity Service
///
/// Monitors network connectivity status.
library;

import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Connectivity status enum
enum ConnectivityStatus { online, offline, unknown }

/// Connectivity service that monitors network status
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final _statusController = StreamController<ConnectivityStatus>.broadcast();

  ConnectivityStatus _currentStatus = ConnectivityStatus.unknown;

  /// Current connectivity status
  ConnectivityStatus get currentStatus => _currentStatus;

  /// Stream of connectivity changes
  Stream<ConnectivityStatus> get statusStream => _statusController.stream;

  /// Whether device is currently online
  bool get isOnline => _currentStatus == ConnectivityStatus.online;

  /// Initialize and start monitoring
  Future<void> initialize() async {
    // Get initial status
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);

    // Listen to changes
    _connectivity.onConnectivityChanged.listen(_updateStatus);
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final hasConnection = results.any(
      (r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet,
    );

    final newStatus = hasConnection
        ? ConnectivityStatus.online
        : ConnectivityStatus.offline;

    if (newStatus != _currentStatus) {
      _currentStatus = newStatus;
      _statusController.add(newStatus);
    }
  }

  /// Manually check connectivity
  Future<bool> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);
    return isOnline;
  }

  /// Dispose resources
  void dispose() {
    _statusController.close();
  }
}

/// Provider for connectivity service
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for current connectivity status
final connectivityStatusProvider = StreamProvider<ConnectivityStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.statusStream;
});

/// Provider for simple online check
final isOnlineProvider = Provider<bool>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.isOnline;
});

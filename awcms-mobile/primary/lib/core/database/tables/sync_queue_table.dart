/// AWCMS Mobile - Sync Queue Table
///
/// Drift table for queuing offline mutations.
library;

import 'package:drift/drift.dart';

/// Queue for offline mutations to be synced when online
@DataClassName('SyncQueueItem')
class SyncQueue extends Table {
  /// Auto-increment ID
  IntColumn get id => integer().autoIncrement()();

  /// Action type: 'create', 'update', 'delete'
  TextColumn get action => text()();

  /// Target table name in Supabase
  TextColumn get targetTable => text()();

  /// Record ID being modified
  TextColumn get recordId => text()();

  /// JSON payload of the data
  TextColumn get payload => text()();

  /// When this was queued
  DateTimeColumn get createdAt => dateTime()();

  /// Whether this has been processed
  BoolColumn get processed => boolean().withDefault(const Constant(false))();

  /// Error message if sync failed
  TextColumn get errorMessage => text().nullable()();

  /// Number of retry attempts
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
}

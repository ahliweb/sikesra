/// AWCMS Mobile - Sync Metadata Table
///
/// Tracks last sync timestamps per table.
library;

import 'package:drift/drift.dart';

/// Metadata for tracking sync state
@DataClassName('SyncMeta')
class SyncMetadata extends Table {
  /// Table name being tracked
  TextColumn get targetTable => text()();

  /// Last successful sync timestamp
  DateTimeColumn get lastSyncAt => dateTime()();

  /// Tenant ID if applicable
  TextColumn get tenantId => text().nullable()();

  @override
  Set<Column> get primaryKey => {targetTable};
}

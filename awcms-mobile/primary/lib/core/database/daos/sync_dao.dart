/// AWCMS Mobile - Sync DAO
///
/// Data Access Object for sync queue and metadata operations.
library;

import 'dart:convert';
import 'package:drift/drift.dart';
import '../app_database.dart';
import '../tables/sync_queue_table.dart';
import '../tables/sync_metadata_table.dart';

part 'sync_dao.g.dart';

/// DAO for sync operations
@DriftAccessor(tables: [SyncQueue, SyncMetadata])
class SyncDao extends DatabaseAccessor<AppDatabase> with _$SyncDaoMixin {
  SyncDao(super.db);

  // ============================================================
  // Sync Queue Operations
  // ============================================================

  /// Add item to sync queue
  Future<int> addToQueue({
    required String action,
    required String targetTable,
    required String recordId,
    required Map<String, dynamic> payload,
  }) {
    return into(syncQueue).insert(
      SyncQueueCompanion.insert(
        action: action,
        targetTable: targetTable,
        recordId: recordId,
        payload: jsonEncode(payload),
        createdAt: DateTime.now(),
      ),
    );
  }

  /// Get pending queue items (not processed)
  Future<List<SyncQueueItem>> getPendingQueue() {
    return (select(syncQueue)
          ..where((t) => t.processed.equals(false))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  /// Get pending count
  Future<int> getPendingCount() async {
    final count = countAll();
    final query = selectOnly(syncQueue)
      ..addColumns([count])
      ..where(syncQueue.processed.equals(false));
    final result = await query.getSingle();
    return result.read(count) ?? 0;
  }

  /// Mark queue item as processed
  Future<void> markAsProcessed(int id) {
    return (update(syncQueue)..where((t) => t.id.equals(id))).write(
      const SyncQueueCompanion(processed: Value(true)),
    );
  }

  /// Mark queue item as failed
  Future<void> markAsFailed(int id, String errorMessage) async {
    final current = await (select(
      syncQueue,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    final newRetryCount = (current?.retryCount ?? 0) + 1;

    await (update(syncQueue)..where((t) => t.id.equals(id))).write(
      SyncQueueCompanion(
        errorMessage: Value(errorMessage),
        retryCount: Value(newRetryCount),
      ),
    );
  }

  /// Delete processed items older than 24 hours
  Future<int> cleanupProcessedQueue() {
    final cutoff = DateTime.now().subtract(const Duration(hours: 24));
    return (delete(syncQueue)
          ..where((t) => t.processed.equals(true))
          ..where((t) => t.createdAt.isSmallerThanValue(cutoff)))
        .go();
  }

  // ============================================================
  // Sync Metadata Operations
  // ============================================================

  /// Get last sync time for a table
  Future<DateTime?> getLastSyncTime(
    String targetTable, {
    String? tenantId,
  }) async {
    final query = select(syncMetadata)
      ..where((t) => t.targetTable.equals(targetTable));

    if (tenantId != null) {
      query.where((t) => t.tenantId.equals(tenantId));
    }

    final result = await query.getSingleOrNull();
    return result?.lastSyncAt;
  }

  /// Update last sync time for a table
  Future<void> setLastSyncTime(
    String targetTable,
    DateTime syncTime, {
    String? tenantId,
  }) {
    return into(syncMetadata).insertOnConflictUpdate(
      SyncMetadataCompanion.insert(
        targetTable: targetTable,
        lastSyncAt: syncTime,
        tenantId: Value(tenantId),
      ),
    );
  }

  /// Clear all sync metadata (for full re-sync)
  Future<int> clearSyncMetadata() {
    return delete(syncMetadata).go();
  }
}

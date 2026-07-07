import type { VocabularyData } from "@/lib/vocabulary/types";

export const BACKUP_FORMAT = "mimi-pte-vocabulary-backup";
export const BACKUP_VERSION = 2;
export const BACKUP_APP_NAME = "words-learning-app-for-mimi";

export type BackupCounts = {
  people: number;
  items: number;
  activeItems: number;
  archivedItems: number;
  importBatches: number;
  reviewStates: number;
  reviewEvents: number;
};

export type VocabularyBackupMetadata = {
  appName: typeof BACKUP_APP_NAME;
  exportedAt: string;
  timezone: string;
  schemaVersion: VocabularyData["schemaVersion"];
  counts: BackupCounts;
};

export type VocabularyBackupFile = {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  metadata: VocabularyBackupMetadata;
  data: VocabularyData;
};

export type BackupParseResult =
  | {
      ok: true;
      backup: VocabularyBackupFile;
      data: VocabularyData;
      counts: BackupCounts;
    }
  | {
      ok: false;
      errors: string[];
    };

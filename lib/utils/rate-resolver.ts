import { RateSnapshot } from '@/lib/types'

// Given a list of snapshots (sorted by effective_date desc) and a target date,
// find the active snapshot. This is the most recent snapshot where
// effective_date <= targetDate.
export function resolveSnapshot(
  snapshots: RateSnapshot[],
  targetDate: Date
): RateSnapshot | null {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  )
  return sorted.find(s => new Date(s.effective_date) <= targetDate) ?? null
}

// Check if a snapshot can be edited (not locked AND no entries reference it)
export function canEditSnapshot(
  snapshot: RateSnapshot,
  linkedEntryCount: number
): boolean {
  return !snapshot.is_locked && linkedEntryCount === 0
}

// Check if a snapshot can be deleted (no entries reference it at all)
export function canDeleteSnapshot(linkedEntryCount: number): boolean {
  return linkedEntryCount === 0
}

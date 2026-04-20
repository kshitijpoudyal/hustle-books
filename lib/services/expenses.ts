import { fetchExpenses, insertExpense, updateExpense, deleteExpense } from '@/lib/data/expenses'
import { getAuthUserId } from '@/lib/data/auth'
import type { ExpenseEntry } from '@/lib/types'
import type { ExpenseFilters } from '@/lib/data/expenses'

export type { ExpenseFilters }

export async function getExpenses(filters?: ExpenseFilters): Promise<ExpenseEntry[]> {
  return fetchExpenses(filters)
}

export async function createExpense(
  data: {
    hustle_id?: string | null
    amount: number
    category: ExpenseEntry['category']
    description?: string
    is_recurring?: boolean
    date: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated' }
  const error = await insertExpense(userId, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function editExpense(
  id: string,
  data: Partial<Pick<ExpenseEntry, 'amount' | 'category' | 'description' | 'hustle_id' | 'is_recurring' | 'date'>>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await updateExpense(id, data)
  if (error) return { ok: false, error }
  return { ok: true }
}

export async function removeExpense(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = await deleteExpense(id)
  if (error) return { ok: false, error }
  return { ok: true }
}

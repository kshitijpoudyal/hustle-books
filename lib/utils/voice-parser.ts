import type { ExpenseEntry } from '@/lib/types'

export interface ParsedVoiceTransaction {
  // Determined fields
  type: 'income' | 'expense' | null
  amount: number | null
  miles: number | null
  category: ExpenseEntry['category'] | null
  hustleName: string | null
  notes: string | null
  // Raw input for reference
  rawTranscript: string
  // Confidence warnings
  warnings: string[]
}

// Maps spoken number words to numeric values
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
}

const TEENS: Record<string, number> = {
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}

/**
 * Converts a string of number words to a numeric value.
 * Handles patterns like "forty five", "one hundred twenty", "twenty dollars fifty cents"
 */
function numberWordsToNumber(text: string): number | null {
  const words = text.toLowerCase().trim().split(/\s+/)
  let total = 0
  let current = 0

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '')
    if (TEENS[clean] !== undefined) {
      current += TEENS[clean]
    } else if (NUMBER_WORDS[clean] !== undefined) {
      const val = NUMBER_WORDS[clean]
      if (val === 100) {
        current = current === 0 ? 100 : current * 100
      } else if (val === 1000) {
        total += (current === 0 ? 1 : current) * 1000
        current = 0
      } else {
        current += val
      }
    }
  }

  total += current
  return total > 0 ? total : null
}

/**
 * Extracts a dollar amount from spoken text.
 * Handles: "$45", "45.50", "forty five dollars fifty cents", "forty-five fifty"
 */
function extractAmount(text: string): number | null {
  // Numeric patterns first (most reliable)
  const numericMatch = text.match(/\$?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i)
  if (numericMatch) {
    return parseFloat(numericMatch[1].replace(',', '.'))
  }

  // Word-based amount: "forty five dollars and fifty cents"
  const wordAmountPattern =
    /\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\s*)+)(?:dollars?(?:\s+and\s+((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*)+cents?)?)?/i

  const wordMatch = text.match(wordAmountPattern)
  if (wordMatch) {
    const dollars = numberWordsToNumber(wordMatch[1]) ?? 0
    const cents = wordMatch[2] ? (numberWordsToNumber(wordMatch[2]) ?? 0) : 0
    const total = dollars + cents / 100
    if (total > 0) return total
  }

  return null
}

/**
 * Extracts mileage from spoken text.
 * Handles: "12 miles", "drove 8.5 miles", "fifteen miles"
 */
function extractMiles(text: string): number | null {
  // Numeric miles
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*miles?\b/i)
  if (numMatch) return parseFloat(numMatch[1])

  // Word-based miles
  const wordMilesPattern =
    /\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s*)+)\s*miles?\b/i
  const wordMatch = text.match(wordMilesPattern)
  if (wordMatch) return numberWordsToNumber(wordMatch[1])

  return null
}

/**
 * Determines if the transaction is income or expense from spoken cues.
 */
function extractType(text: string): 'income' | 'expense' | null {
  const lower = text.toLowerCase()

  const incomeKeywords = [
    'earned', 'made', 'received', 'income', 'payment', 'paid me',
    'got paid', 'collected', 'revenue', 'sale', 'sold', 'tip', 'tips',
  ]
  const expenseKeywords = [
    'spent', 'expense', 'expensed', 'paid', 'bought', 'purchased', 'cost',
    'fee', 'fees', 'supply', 'supplies', 'fuel', 'gas', 'maintenance',
    'phone', 'subscription', 'charged',
  ]

  const incomeScore = incomeKeywords.filter(k => lower.includes(k)).length
  const expenseScore = expenseKeywords.filter(k => lower.includes(k)).length

  if (incomeScore > expenseScore) return 'income'
  if (expenseScore > incomeScore) return 'expense'
  return null
}

/**
 * Extracts expense category from spoken text.
 */
function extractExpenseCategory(text: string): ExpenseEntry['category'] | null {
  const lower = text.toLowerCase()
  if (/\bfuel\b|\bgas\b|\bgasoline\b/.test(lower)) return 'fuel'
  if (/\bfee\b|\bfees\b|\bcommission\b|\bplatform\b/.test(lower)) return 'fees'
  if (/\bsuppl(y|ies)\b|\bmaterial\b|\bequipment\b/.test(lower)) return 'supplies'
  if (/\bmaintenance\b|\brepair\b|\boil\b|\btire\b/.test(lower)) return 'maintenance'
  if (/\bphone\b|\bcell\b|\bmobile\b|\bdata plan\b/.test(lower)) return 'phone'
  return null
}

/**
 * Finds a hustle name by fuzzy-matching against the user's hustle list.
 */
function extractHustleName(text: string, hustleNames: string[]): string | null {
  if (hustleNames.length === 0) return null
  const lower = text.toLowerCase()

  // Exact match first
  for (const name of hustleNames) {
    if (lower.includes(name.toLowerCase())) return name
  }

  // Word-level partial match (at least 2 chars)
  for (const name of hustleNames) {
    const nameParts = name.toLowerCase().split(/\s+/)
    const matches = nameParts.filter(part => part.length > 2 && lower.includes(part))
    if (matches.length > 0 && matches.length >= Math.ceil(nameParts.length / 2)) {
      return name
    }
  }

  return null
}

/**
 * Main parser: converts a raw voice transcript into structured transaction fields.
 */
export function parseVoiceTranscript(
  transcript: string,
  hustleNames: string[] = []
): ParsedVoiceTransaction {
  const warnings: string[] = []
  const text = transcript.trim()

  const type = extractType(text)
  const amount = extractAmount(text)
  const miles = extractMiles(text)
  const category = extractExpenseCategory(text)
  const hustleName = extractHustleName(text, hustleNames)

  // Build notes from leftover text (strip out the matched tokens)
  let notes = text
  if (amount !== null) {
    notes = notes
      .replace(/\$?\s*\d{1,6}(?:[.,]\d{1,2})?/g, '')
      .replace(/\b(?:dollar|cent)s?\b/gi, '')
  }
  notes = notes
    .replace(/\d+(?:\.\d+)?\s*miles?\b/gi, '')
    .replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gi, '')
    .replace(/\b(?:earned|made|received|income|payment|paid me|got paid|collected|spent|expense|expensed|paid|bought|purchased|cost|for|on|a|an|the|with|and|of|to|my)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (hustleName) {
    notes = notes.replace(new RegExp(hustleName, 'gi'), '').replace(/\s{2,}/g, ' ').trim()
  }

  // Warnings for low-confidence or missing required fields
  if (amount === null) {
    warnings.push('No amount detected — please enter it manually.')
  }
  if (type === null) {
    warnings.push('Could not determine income or expense — please select the type.')
  }

  return {
    type,
    amount,
    miles,
    category,
    hustleName,
    notes: notes.length > 2 ? notes : null,
    rawTranscript: transcript,
    warnings,
  }
}

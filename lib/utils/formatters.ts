// Currency formatting
export function formatCurrency(
  amount: number,
  currency = 'USD',
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Mileage formatting
export function formatMileage(miles: number): string {
  return `${miles.toFixed(1)} mi`
}

// Date formatting
export function formatDate(dateStr: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr + 'T00:00:00') // avoid timezone shifts
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'short', day: 'numeric' }
      : style === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

// Relative date (e.g., "3 days ago")
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Rate display helpers
export function formatGasPrice(price: number): string {
  return `$${price.toFixed(3)}/gal`
}

export function formatMpg(mpg: number): string {
  return `${mpg.toFixed(1)} MPG`
}

export function formatIrsRate(rate: number): string {
  return `$${rate.toFixed(3)}/mi`
}

export function formatTaxRate(rate: number): string {
  return `${rate.toFixed(0)}%`
}

export function formatDepreciationRate(rate: number): string {
  if (rate === 0) return 'Not set'
  return `$${rate.toFixed(3)}/mi`
}

// Days since a date
export function daysSince(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

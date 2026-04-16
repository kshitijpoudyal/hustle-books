import {
  Briefcase,
  Car,
  Package,
  Scissors,
  Laptop,
  Camera,
  Music,
  Wrench,
  Home,
  Utensils,
  Dog,
  ShoppingBag,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { HUSTLE_ICONS } from './constants'

export type HustleIconName = typeof HUSTLE_ICONS[number]

/** Map from icon name (stored in DB) → Lucide component */
export const HUSTLE_ICON_MAP: Record<HustleIconName, ComponentType<LucideProps>> = {
  'briefcase':    Briefcase,
  'car':          Car,
  'package':      Package,
  'scissors':     Scissors,
  'laptop':       Laptop,
  'camera':       Camera,
  'music':        Music,
  'wrench':       Wrench,
  'home':         Home,
  'utensils':     Utensils,
  'dog':          Dog,
  'shopping-bag': ShoppingBag,
}

interface HustleIconProps extends LucideProps {
  name: string
}

/**
 * Renders the Lucide icon for a given hustle icon name string.
 * Falls back gracefully to Briefcase if the name isn't recognised.
 */
export function HustleIcon({ name, ...props }: HustleIconProps) {
  const Icon = HUSTLE_ICON_MAP[name as HustleIconName] ?? Briefcase
  return <Icon {...props} />
}

// ============================================================
// PRIZE POOL CALCULATOR
// ============================================================
import type { PrizePoolBreakdown } from '@/types'

const MONTHLY_PRICE_PENCE  = 1000  // £10/month
const YEARLY_PRICE_PENCE   = 10000 // £100/year (2 months free)
const MIN_CHARITY_PERCENT  = 10

const JACKPOT_SHARE  = 0.40
const FOUR_SHARE     = 0.35
const THREE_SHARE    = 0.25

export function calculatePrizePool(
  activeSubscribers: { plan: string; amount_pence: number; charity_percentage: number }[],
  previousJackpot: number = 0
): PrizePoolBreakdown {
  let totalRevenue   = 0
  let charityTotal   = 0
  let gameableAmount = 0

  for (const sub of activeSubscribers) {
    const monthly = sub.plan === 'yearly'
      ? sub.amount_pence / 12
      : sub.amount_pence

    const charityShare = (monthly * sub.charity_percentage) / 100
    const gameShare    = monthly - charityShare

    totalRevenue   += monthly
    charityTotal   += charityShare
    gameableAmount += gameShare
  }

  const jackpot  = gameableAmount * JACKPOT_SHARE + previousJackpot
  const fourMatch = gameableAmount * FOUR_SHARE
  const threeMatch = gameableAmount * THREE_SHARE

  return {
    jackpot:      Math.round(jackpot * 100) / 100,
    fourMatch:    Math.round(fourMatch * 100) / 100,
    threeMatch:   Math.round(threeMatch * 100) / 100,
    charityTotal: Math.round(charityTotal * 100) / 100,
    totalPool:    Math.round(gameableAmount * 100) / 100,
  }
}

// ============================================================
// DRAW ENGINE
// ============================================================

/** Generate 5 winning numbers (1–45) */
export function generateWinningNumbers(
  mode: 'random' | 'algorithmic',
  allUserScores: number[] = []
): number[] {
  if (mode === 'random') {
    return generateRandom5()
  }
  return generateAlgorithmic5(allUserScores)
}

function generateRandom5(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1)
  const picked: number[] = []
  while (picked.length < 5) {
    const idx  = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked.sort((a, b) => a - b)
}

function generateAlgorithmic5(scores: number[]): number[] {
  if (scores.length < 10) return generateRandom5()

  // Count frequency of each score
  const freq: Record<number, number> = {}
  for (const s of scores) freq[s] = (freq[s] ?? 0) + 1

  // Build weighted pool (rarer scores get higher weight — balanced draw)
  const maxFreq = Math.max(...Object.values(freq))
  const weighted: number[] = []
  for (let n = 1; n <= 45; n++) {
    const f      = freq[n] ?? 0
    const weight = maxFreq - f + 1 // inverse frequency weight
    for (let i = 0; i < weight; i++) weighted.push(n)
  }

  const picked = new Set<number>()
  while (picked.size < 5) {
    const idx = Math.floor(Math.random() * weighted.length)
    picked.add(weighted[idx])
  }
  return Array.from(picked).sort((a, b) => a - b)
}

/** Count how many of a user's numbers match the winning draw */
export function countMatches(userNumbers: number[], winningNumbers: number[]): number {
  const winSet = new Set(winningNumbers)
  return userNumbers.filter(n => winSet.has(n)).length
}

/** Determine prize tier from match count */
export function getMatchType(matchCount: number): '5_match' | '4_match' | '3_match' | null {
  if (matchCount === 5) return '5_match'
  if (matchCount === 4) return '4_match'
  if (matchCount === 3) return '3_match'
  return null
}

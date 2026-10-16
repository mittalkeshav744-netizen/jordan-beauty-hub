/** Answers stored in the URL when a shopper skips a question. */
export const NO_CONCERN = 'none'
export const ANY_BUDGET = 'any'

/** Highest price per product for each budget answer; ANY_BUDGET sends no limit. */
export const QUIZ_BUDGETS = [
  { value: '299', name: 'Under ₹299', description: 'Smart everyday basics' },
  { value: '499', name: 'Under ₹499', description: 'Best value picks' },
  { value: '999', name: 'Under ₹999', description: 'Treat your skin' },
  { value: ANY_BUDGET, name: 'No limit', description: 'Show me the very best' },
]

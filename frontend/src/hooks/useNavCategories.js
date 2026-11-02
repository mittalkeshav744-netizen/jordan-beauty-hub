import { useMemo } from 'react'

import { FEATURED_NAV_LINKS, SHOP_ALL_LINK } from '../constants/navigation'
import { catalogService } from '../services/catalogService'
import { categoryShopPath, topCategories } from '../utils/categories'
import { useApi } from './useApi'

/**
 * Shop nav: Shop all + top categories from the catalog API (by sort_order) +
 * featured links (quiz / looks / courses). No hardcoded category slugs.
 */
export function useNavCategories() {
  const { data: categories, isLoading } = useApi(() => catalogService.getCategories(), [])

  const links = useMemo(() => {
    const featured = topCategories(categories).map((category) => ({
      label: category.name,
      to: categoryShopPath(category),
    }))
    return [SHOP_ALL_LINK, ...featured, ...FEATURED_NAV_LINKS]
  }, [categories])

  return { links, categories: categories ?? [], isLoading }
}

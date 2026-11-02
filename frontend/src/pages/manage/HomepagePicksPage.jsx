import { useEffect, useMemo, useState } from 'react'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatPrice } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const MAX_PICKS = 12

function productThumb(product) {
  const src =
    (typeof product.primary_image === 'string' && product.primary_image) ||
    product.primary_image?.image ||
    product.primary_image?.url ||
    ''
  if (src) {
    return <img src={src} alt="" className="h-14 w-14 rounded-control object-cover bg-subtle" />
  }
  return <div className="flex h-14 w-14 items-center justify-center rounded-control bg-cream text-xs text-muted">No photo</div>
}

export default function HomepagePicksPage() {
  const { showToast } = useToast()
  const {
    data: picksData,
    isLoading: picksLoading,
    error: picksError,
    reload: reloadPicks,
  } = useApi(() => portalService.getHomepagePicks(), [])
  const {
    data: catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useApi(() => portalService.listProducts({ page_size: 200 }), [])

  const [orderedIds, setOrderedIds] = useState([])
  const [dirty, setDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (picksData?.product_ids) {
      setOrderedIds(picksData.product_ids)
      setDirty(false)
    }
  }, [picksData])

  const catalogProducts = useMemo(() => {
    if (Array.isArray(catalogData?.results)) return catalogData.results
    if (Array.isArray(catalogData)) return catalogData
    return []
  }, [catalogData])

  const productById = useMemo(() => {
    const map = new Map()
    for (const product of catalogProducts) map.set(product.id, product)
    for (const product of picksData?.products || []) map.set(product.id, product)
    return map
  }, [catalogProducts, picksData])

  const selectedProducts = orderedIds.map((id) => productById.get(id)).filter(Boolean)
  const availableToAdd = catalogProducts.filter(
    (product) => product.is_active && !orderedIds.includes(product.id),
  )

  const move = (index, delta) => {
    const next = index + delta
    if (next < 0 || next >= orderedIds.length) return
    setOrderedIds((current) => {
      const copy = [...current]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
    setDirty(true)
  }

  const removeAt = (index) => {
    setOrderedIds((current) => current.filter((_, i) => i !== index))
    setDirty(true)
  }

  const addProduct = (id) => {
    if (orderedIds.includes(id) || orderedIds.length >= MAX_PICKS) return
    setOrderedIds((current) => [...current, id])
    setDirty(true)
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const saved = await portalService.saveHomepagePicks(orderedIds)
      setOrderedIds(saved.product_ids || [])
      setDirty(false)
      showToast('Home page products saved.')
      reloadPicks()
    } catch (error) {
      showToast(getErrorMessage(error) || 'Could not save home picks.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading = picksLoading || catalogLoading
  const error = picksError || catalogError

  useManageFocus({ ready: !isLoading })

  return (
    <section aria-labelledby="manage-homepage-picks-title" data-manage-section="picks">
      <ManagePageHeader
        title="Home page products"
        description="Choose which products appear on the shop home shelf. Order here is the order customers see. Only in-stock active items are shown on the live site."
        actions={
          <Button type="button" onClick={save} isLoading={isSaving} disabled={!dirty}>
            <FaIcon icon="check" className="mr-2 h-3.5 w-3.5" />
            Save home shelf
          </Button>
        }
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {error ? (
        <ErrorMessage
          error={error}
          onRetry={() => {
            reloadPicks()
            reloadCatalog()
          }}
        />
      ) : null}

      {!isLoading && !error ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-widest uppercase">
              On home ({orderedIds.length}/{MAX_PICKS})
            </h2>
            {selectedProducts.length === 0 ? (
              <EmptyState
                title="No products selected"
                message="Add products from the catalogue list. Until you save picks, the home page uses bestsellers / recommendations."
              />
            ) : (
              <ul className="space-y-2">
                {selectedProducts.map((product, index) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
                  >
                    {productThumb(product)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted">
                        {product.brand_name} · {product.min_price ? formatPrice(product.min_price) : '—'}
                        {!product.in_stock || !product.is_active ? (
                          <span className="ml-2 text-warning">Hidden on live site until available</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <Button type="button" size="sm" variant="outline" onClick={() => move(index, -1)} disabled={index === 0}>
                        Up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => move(index, 1)}
                        disabled={index === selectedProducts.length - 1}
                      >
                        Down
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => removeAt(index)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-widest uppercase">Add from catalogue</h2>
            {availableToAdd.length === 0 ? (
              <EmptyState title="Nothing left to add" message="All active products are already on the home shelf, or the catalogue is empty." />
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {availableToAdd.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
                  >
                    {productThumb(product)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted">
                        {product.brand_name} · {product.min_price ? formatPrice(product.min_price) : '—'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={orderedIds.length >= MAX_PICKS}
                      onClick={() => addProduct(product.id)}
                    >
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

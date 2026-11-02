import {
  compactErrors,
  optionalMoney,
  required,
  validMoney,
  validNonNegativeInt,
} from '../../utils/validators'

export function validateCreateProduct(form) {
  return compactErrors({
    name: required(form.name, 'Name'),
    brand_id: required(form.brand_id, 'Brand'),
    category_id: required(form.category_id, 'Category'),
    price: validMoney(form.price, 'Selling price'),
    compare_at_price: optionalMoney(form.compare_at_price, 'Original price'),
    stock_quantity: validNonNegativeInt(form.stock_quantity ?? '0', 'Starting stock'),
  })
}

export function emptyCreateForm() {
  return {
    name: '',
    brand_id: '',
    category_id: '',
    short_description: '',
    variant_name: 'Default',
    price: '',
    compare_at_price: '',
    stock_quantity: '0',
  }
}

export function editFormFromProduct(product) {
  return {
    name: product.name || '',
    short_description: product.short_description || '',
    description: product.description || '',
    ingredients: product.ingredients || '',
    how_to_use: product.how_to_use || '',
    net_quantity: product.net_quantity || '',
    is_active: product.is_active,
    is_featured: product.is_featured,
  }
}

export function variantDraftsFromProduct(product) {
  return Object.fromEntries(
    (product.variants || []).map((variant) => [
      variant.id,
      {
        name: variant.name,
        price: variant.price,
        compare_at_price: variant.compare_at_price || '',
        is_active: variant.is_active,
      },
    ]),
  )
}

export function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-danger">{message}</p>
}

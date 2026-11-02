import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'

import Skeleton from '../../components/common/Skeleton'

/**
 * Legacy deep link: send owners to the products list and open the edit modal there.
 */
export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/manage/products', {
      replace: true,
      state: { editProductId: Number(id) || id },
    })
  }, [id, navigate])

  return <Skeleton className="h-64 w-full" aria-label="Opening product editor" />
}

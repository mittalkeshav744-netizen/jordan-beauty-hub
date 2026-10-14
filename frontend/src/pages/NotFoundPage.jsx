import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="page-container py-16">
      <EmptyState
        title="Page not found"
        message="The page you are looking for doesn't exist or is no longer available."
        action={<Button to="/shop">Continue shopping</Button>}
      />
    </div>
  )
}

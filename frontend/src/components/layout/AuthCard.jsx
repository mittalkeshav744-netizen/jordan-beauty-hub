export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="page-container flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 rounded-card border border-line p-5 shadow-card sm:p-8">
        <div className="space-y-1 text-center">
          <h1 className="section-title">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <p className="text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  )
}

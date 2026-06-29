import c from './EnrichButton.module.scss'


interface Props {
  loading: boolean
  disabled: boolean
  enriched: boolean
  title?: string
  onClick: () => void
}

const EnrichButton = ({ loading, disabled, enriched, title, onClick }: Props) => (
  <button
    type="button"
    className={c.btn}
    data-loading={loading}
    disabled={disabled}
    title={title}
    onClick={onClick}
  >
    {loading ? (
      <span className={c.spinner} />
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.3 7.05 4 4 0 0 1 17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 11v8m0 0-3-3m3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}

    {enriched && (
      <span className={c.badge}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    )}
  </button>
)

export { EnrichButton }

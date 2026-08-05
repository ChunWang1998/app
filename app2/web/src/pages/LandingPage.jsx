import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="landing">
      <div className="landing__wash" aria-hidden="true" />
      <div className="landing__blob landing__blob--one" aria-hidden="true" />
      <div className="landing__blob landing__blob--two" aria-hidden="true" />

      <div className="landing__content">
        <p className="landing__brand">急廁 Go</p>
        <h1 className="landing__headline">趕快找到你附近的廁所！</h1>
        <button
          type="button"
          className="landing__cta"
          onClick={() => navigate('/map')}
        >
          開始找廁所
        </button>
      </div>

      <div className="landing__scene" aria-hidden="true">
        <svg className="landing__svg" viewBox="0 0 360 220" fill="none">
          <ellipse cx="180" cy="198" rx="140" ry="14" fill="rgba(26,155,142,0.12)" />
          {/* Q wooden WC flag */}
          <ellipse cx="180" cy="188" rx="48" ry="12" fill="#a67c52" opacity="0.9" />
          <rect x="175" y="110" width="10" height="78" rx="3" fill="#8b5a2b" />
          <rect x="132" y="72" width="96" height="52" rx="10" fill="#c4a574" stroke="#8b5a2b" strokeWidth="4" />
          <text x="180" y="108" textAnchor="middle" fill="#0f6f66" fontSize="28" fontWeight="800" fontFamily="Fredoka, sans-serif">WC</text>
          <circle className="landing__dot" cx="72" cy="72" r="10" fill="#ffb703" />
          <circle className="landing__dot landing__dot--delay" cx="296" cy="96" r="8" fill="#ef6f6c" />
        </svg>
      </div>
    </main>
  )
}

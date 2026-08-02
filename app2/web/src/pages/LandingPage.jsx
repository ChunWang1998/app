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
        <p className="landing__sub">
          定位後立刻告訴你最近、還在營業的三間超商廁所。
        </p>
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
          <rect x="118" y="58" width="124" height="128" rx="28" fill="#fff" stroke="#1a9b8e" strokeWidth="4" />
          <rect x="142" y="88" width="76" height="58" rx="12" fill="#d7f4ef" stroke="#1a9b8e" strokeWidth="3" />
          <circle cx="210" cy="120" r="7" fill="#1a9b8e" />
          <path d="M150 170h60" stroke="#1a9b8e" strokeWidth="4" strokeLinecap="round" />
          <circle className="landing__dot" cx="72" cy="72" r="10" fill="#ffb703" />
          <circle className="landing__dot landing__dot--delay" cx="296" cy="96" r="8" fill="#ef6f6c" />
        </svg>
      </div>
    </main>
  )
}

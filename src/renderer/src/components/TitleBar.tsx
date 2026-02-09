import { useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const hasWindowApi =
    typeof window.api?.isWindowMaximized === 'function' &&
    typeof window.api?.minimizeWindow === 'function' &&
    typeof window.api?.toggleMaximizeWindow === 'function' &&
    typeof window.api?.closeWindow === 'function'

  useEffect(() => {
    const load = async () => {
      if (!hasWindowApi) return
      const res = await window.api.isWindowMaximized()
      setIsMaximized(Boolean(res?.maximized))
    }
    load()
    if (typeof window.api?.onWindowEvent !== 'function') return
    const unsubscribe = window.api.onWindowEvent((payload) => {
      if (payload?.type === 'maximized') {
        setIsMaximized(Boolean(payload.value))
      }
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        {/* <div className="titlebar__badge">OS</div> */}
        <span className="titlebar__title">OwlStarter</span>
      </div>
      <div className="titlebar__controls">
        <button className="titlebar__btn" onClick={() => window.api.minimizeWindow()} disabled={!hasWindowApi}>
          <Minus size={16} />
        </button>
        <button className="titlebar__btn" onClick={() => window.api.toggleMaximizeWindow()} disabled={!hasWindowApi}>
          <Square size={14} className={isMaximized ? 'titlebar__icon--max' : ''} />
        </button>
        <button className="titlebar__btn titlebar__btn--close" onClick={() => window.api.closeWindow()} disabled={!hasWindowApi}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default TitleBar

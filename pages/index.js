import { useRef, useEffect } from 'react'

import { ShellEventEngine } from '../parent'
import styles from '../styles/Signin.module.css'

export default function Home() {
  const iframeRef = useRef(null)
  const hasIframeEffectCalled = useRef(false)

  useEffect(() => {
    if (!hasIframeEffectCalled.current) {
      const shellEngine = new ShellEventEngine(
        undefined,
        'https://campaign-game.vercel.app',
        iframeRef.current
      )
      hasIframeEffectCalled.current = true
    }
  }, [])

  return (
    <div>
      <main className={styles.main}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.2em' }}>
          <h4 style={{ margin: 0 }}>Lootex v3 Landing Page</h4>
          <h4 style={{ margin: 0 }}>Game script version: 未來日記(完整版)</h4>
          <span>Last update: 11/23 17:05</span>
        </div>
        <div className={styles.container}>
          <iframe
            title='game page'
            ref={iframeRef}
            src='/story1123.html'
            frameBorder='0'
            sandbox='allow-same-origin allow-scripts allow-forms allow-modals'
          />
        </div>
      </main>
    </div>
  )
}

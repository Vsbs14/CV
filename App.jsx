import { useState, useEffect } from 'react'
import ImageProcessor from './src/components/ImageProcessor'
import VideoProcessor from './src/components/VideoProcessor'
import DesmosPanel from './src/components/DesmosPanel'
import ErrorBoundary from './src/components/ErrorBoundary'
import './App.css'

function App() {
  const [opencvReady, setOpencvReady] = useState(false)
  const [mode, setMode] = useState(() => localStorage.getItem('cv_mode') || 'image') // 'image' | 'video'
  const [theme, setTheme] = useState(() => localStorage.getItem('cv_theme') || 'dark') // 'dark' | 'light'
  const [edgeData, setEdgeData] = useState(null) // pixel data for Desmos
  const [desmosOpen, setDesmosOpen] = useState(false)

  useEffect(() => {
    const handleReady = () => setOpencvReady(true)
    if (window.openCvReady) {
      setOpencvReady(true)
    } else {
      window.addEventListener('opencv-ready', handleReady)
    }
    return () => window.removeEventListener('opencv-ready', handleReady)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cv_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('cv_mode', mode)
  }, [mode])

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="header">
          <div className="header-left">
            <span className="logo-mark">◈</span>
            <h1 className="logo">CV-LAB</h1>
          </div>
          <nav className="nav">
            <button
              className={`nav-btn ${mode === 'image' ? 'active' : ''}`}
              aria-label="Switch to Image Processing Mode"
              onClick={() => setMode('image')}
            >
              IMAGE
            </button>
            <button
              className={`nav-btn ${mode === 'video' ? 'active' : ''}`}
              aria-label="Switch to Video Processing Mode"
              onClick={() => setMode('video')}
            >
              VIDEO
            </button>
          </nav>
          <div className="header-right">
            <button
              className="theme-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle Dark and Light Mode"
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </button>
            <div className={`cv-status ${opencvReady ? 'ready' : 'loading'}`}>
              <span className="cv-dot" />
              {opencvReady ? 'CV READY' : 'LOADING CV...'}
            </div>
          </div>
        </header>

        <main className="main">
          {mode === 'image' ? (
            <ImageProcessor
              opencvReady={opencvReady}
              onEdgeData={setEdgeData}
              onOpenDesmos={() => setDesmosOpen(true)}
            />
          ) : (
            <VideoProcessor opencvReady={opencvReady} />
          )}
        </main>

        {desmosOpen && (
          <DesmosPanel
            edgeData={edgeData}
            theme={theme}
            onClose={() => setDesmosOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MAX_CURVES, MIN_DESMOS_CURVES, MAX_DESMOS_CURVES, DESMOS_CURVES_STEP } from '../constants'
import './DesmosPanel.css'

export default function DesmosPanel({ edgeData, theme, onClose }) {
  const containerRef = useRef(null)
  const calculatorRef = useRef(null)
  const [curveCount, setCurveCount] = useState(0)
  const [maxCurves, setMaxCurves] = useState(() => Number(localStorage.getItem('cv_maxCurves')) || DEFAULT_MAX_CURVES)
  const [status, setStatus] = useState('INITIALIZING...')

  useEffect(() => {
    localStorage.setItem('cv_maxCurves', maxCurves)
  }, [maxCurves])

  useEffect(() => {
    if (!containerRef.current) return
    
    if (!window.Desmos) {
      setStatus('ERROR: Desmos API not loaded')
      return
    }

    const calc = window.Desmos.GraphingCalculator(containerRef.current, {
      expressionsCollapsed: true,
      settingsMenu: false,
      zoomButtons: true,
      border: false,
      backgroundColor: theme === 'light' ? '#ffffff' : '#0a0a0a',
      textColor: theme === 'light' ? '#000000' : '#ffffff',
    })
    calculatorRef.current = calc

    return () => {
      if (calc) calc.destroy()
    }
  }, [theme])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const calc = calculatorRef.current
    if (!calc || !edgeData) return

    setStatus('PLOTTING...')

    const timeoutId = setTimeout(() => {
      // edgeData is now an array of connected paths (arrays of bezier curves)
      // We sort them by length so the most important outlines are drawn first
      const sorted = [...edgeData].sort((a, b) => b.length - a.length)

      let currentCurves = 0
      const sampledCurves = []
      for (const path of sorted) {
        if (currentCurves + path.length > maxCurves) break
        sampledCurves.push(...path)
        currentCurves += path.length
      }

      setCurveCount(currentCurves)

      // Clear the calculator of previous line expressions
      calc.removeExpressions(calc.getExpressions().map(e => ({ id: e.id })))

      const Ax = [], Ay = []
      const Bx = [], By = []
      const Cx = [], Cy = []
      const Dx = [], Dy = []

      sampledCurves.forEach(curve => {
        Ax.push(curve[0][0]); Ay.push(curve[0][1]);
        Bx.push(curve[1][0]); By.push(curve[1][1]);
        Cx.push(curve[2][0]); Cy.push(curve[2][1]);
        Dx.push(curve[3][0]); Dy.push(curve[3][1]);
      })

      const expressions = [
        { id: 'Ax', latex: `A_x = [${Ax.join(',')}]` },
        { id: 'Ay', latex: `A_y = [${Ay.join(',')}]` },
        { id: 'Bx', latex: `B_x = [${Bx.join(',')}]` },
        { id: 'By', latex: `B_y = [${By.join(',')}]` },
        { id: 'Cx', latex: `C_x = [${Cx.join(',')}]` },
        { id: 'Cy', latex: `C_y = [${Cy.join(',')}]` },
        { id: 'Dx', latex: `D_x = [${Dx.join(',')}]` },
        { id: 'Dy', latex: `D_y = [${Dy.join(',')}]` },
        {
          id: 'master-bezier',
          type: 'expression',
          latex: `((1-t)^3 A_x + 3(1-t)^2 t B_x + 3(1-t) t^2 C_x + t^3 D_x, (1-t)^3 A_y + 3(1-t)^2 t B_y + 3(1-t) t^2 C_y + t^3 D_y)`,
          color: theme === 'light' ? '#000000' : '#e8ff47',
          lines: true,
          points: false,
          lineWidth: 1.5,
          parametricDomain: { min: '0', max: '1' }
        }
      ]

      calc.setExpressions(expressions)

      // Auto-fit
      let maxX = 0, maxY = 0
      sampledCurves.forEach(curve => {
        curve.forEach(p => {
          if (p[0] > maxX) maxX = p[0]
          if (p[1] > maxY) maxY = p[1]
        })
      })

      calc.setMathBounds({
        left: 0,
        right: maxX,
        bottom: 0,
        top: maxY,
      })

      setStatus('READY')
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [edgeData, maxCurves, theme])

  const handleMaxCurvesChange = (val) => {
    setMaxCurves(val)
  }

  return (
    <div className="desmos-overlay">
      <div className="desmos-panel">
        <div className="desmos-header">
          <div className="desmos-title">
            <span className="desmos-icon">∿</span>
            DESMOS GRAPH
          </div>
          <div className="desmos-meta">
            <span className="desmos-status">{status}</span>
            <span className="desmos-count">{curveCount.toLocaleString()} CURVES</span>
          </div>
          <div className="desmos-controls">
            <div className="desmos-slider-group">
              <span className="param-label">MAX CURVES</span>
              <input
                type="range"
                min={MIN_DESMOS_CURVES}
                max={MAX_DESMOS_CURVES}
                step={DESMOS_CURVES_STEP}
                value={maxCurves}
                onChange={e => handleMaxCurvesChange(+e.target.value)}
                style={{ width: 120 }}
              />
              <span className="param-value">{maxCurves.toLocaleString()}</span>
            </div>
            <button className="btn danger" onClick={onClose}>✕ CLOSE</button>
          </div>
        </div>

        <div className="desmos-notice">
          ⚠ Desmos is now rendering ultra-smooth Cubic Bezier curves using parallel list arrays. Adjust MAX CURVES if the browser lags.
        </div>

        <div className="desmos-container" ref={containerRef} />
      </div>
    </div>
  )
}

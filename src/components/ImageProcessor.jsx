import { useState, useRef, useCallback, useEffect } from 'react'
import fitCurve from 'fit-curve'
import {
  MAX_CANVAS_SIZE,
  DEFAULT_CANNY_THRESHOLD1,
  DEFAULT_CANNY_THRESHOLD2,
  MIN_THRESHOLD,
  MAX_THRESHOLD,
  MIN_BLUR_KERNEL,
  MAX_BLUR_KERNEL,
  BLUR_KERNEL_STEP,
  MIN_NOISE_FILTER,
  MAX_NOISE_FILTER,
  DEFAULT_NOISE_FILTER,
  MIN_SIMPLIFY,
  MAX_SIMPLIFY,
  DEFAULT_SIMPLIFY,
  SIMPLIFY_STEP,
  SIMPLIFY_ERROR_MARGIN_MULTIPLIER,
  ERRORS,
  MAX_IMAGE_SIZE_MB,
  ALGORITHMS,
} from '../constants'
import './Processor.css'

export default function ImageProcessor({ opencvReady, onEdgeData, onOpenDesmos }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [algorithm, setAlgorithm] = useState(() => localStorage.getItem('cv_algo') || 'canny')
  const [threshold1, setThreshold1] = useState(() => Number(localStorage.getItem('cv_t1')) || DEFAULT_CANNY_THRESHOLD1)
  const [threshold2, setThreshold2] = useState(() => Number(localStorage.getItem('cv_t2')) || DEFAULT_CANNY_THRESHOLD2)
  const [blurAmount, setBlurAmount] = useState(() => Number(localStorage.getItem('cv_blur')) || 5)
  const [noiseFilter, setNoiseFilter] = useState(() => Number(localStorage.getItem('cv_noise')) || DEFAULT_NOISE_FILTER)
  const [simplify, setSimplify] = useState(() => Number(localStorage.getItem('cv_simplify')) || DEFAULT_SIMPLIFY)
  const [processing, setProcessing] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [edgePaths, setEdgePaths] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  // Mobile accordion state
  const [inputCollapsed, setInputCollapsed] = useState(() => window.innerWidth <= 640 && !!imageSrc)
  const [algoCollapsed, setAlgoCollapsed] = useState(() => window.innerWidth <= 640 && false)
  const [paramsCollapsed, setParamsCollapsed] = useState(() => window.innerWidth <= 640 && !imageSrc)

  const inputCanvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('cv_algo', algorithm)
    localStorage.setItem('cv_t1', threshold1)
    localStorage.setItem('cv_t2', threshold2)
    localStorage.setItem('cv_blur', blurAmount)
    localStorage.setItem('cv_noise', noiseFilter)
    localStorage.setItem('cv_simplify', simplify)
   }, [algorithm, threshold1, threshold2, blurAmount, noiseFilter, simplify])

   // Auto-collapse INPUT section on mobile after image loads
   useEffect(() => {
     if (window.innerWidth <= 640 && imageSrc) {
       setInputCollapsed(true)
     }
   }, [imageSrc])

   const loadImageToCanvas = useCallback((src) => {
    const img = new Image()
    img.onload = () => {
      const canvas = inputCanvasRef.current
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_CANVAS_SIZE || h > MAX_CANVAS_SIZE) {
        const ratio = Math.min(MAX_CANVAS_SIZE / w, MAX_CANVAS_SIZE / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      setImageSrc(src)
      setHasResult(false)
      setStats(null)
      setError(null)
    }
    img.onerror = () => {
      const message = ERRORS.IMAGE_LOAD_FAILED
      setError(message)
      console.error(message)
    }
    img.src = src
  }, [])

  const handleFile = useCallback((file) => {
    if (!file) {
      setError('No file selected')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError(ERRORS.INVALID_FILE_TYPE)
      return
    }
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
      setError(`${ERRORS.FILE_TOO_LARGE}${MAX_IMAGE_SIZE_MB}MB`)
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => loadImageToCanvas(e.target.result)
    reader.onerror = () => setError('Failed to read file')
    reader.readAsDataURL(file)
  }, [loadImageToCanvas])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const runEdgeDetection = useCallback(() => {
    if (!opencvReady || !imageSrc || !window.cv) {
      setError(ERRORS.OPENCV_NOT_READY)
      return
    }
    setProcessing(true)
    setError(null)

    const process = () => {
      const startTime = performance.now()
      const cv = window.cv
      const inputCanvas = inputCanvasRef.current
      const outputCanvas = outputCanvasRef.current

      outputCanvas.width = inputCanvas.width
      outputCanvas.height = inputCanvas.height

      let src, gray, blurred, dst, rgba
      let sobelX, sobelY, absX, absY, lap
      let kernel, contours, hierarchy
      let skel, temp, eroded, crossElement

      try {
        src = cv.imread(inputCanvas)
        gray = new cv.Mat()
        blurred = new cv.Mat()
        dst = new cv.Mat()

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

        const ksize = blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount
        const kSizeObj = new cv.Size(ksize, ksize)
        cv.GaussianBlur(gray, blurred, kSizeObj, 0)

        if (algorithm === 'canny') {
          cv.Canny(blurred, dst, threshold1, threshold2)
        } else if (algorithm === 'sobel') {
          sobelX = new cv.Mat()
          sobelY = new cv.Mat()
          absX = new cv.Mat()
          absY = new cv.Mat()
          cv.Sobel(blurred, sobelX, cv.CV_16S, 1, 0)
          cv.Sobel(blurred, sobelY, cv.CV_16S, 0, 1)
          cv.convertScaleAbs(sobelX, absX)
          cv.convertScaleAbs(sobelY, absY)
          cv.addWeighted(absX, 0.5, absY, 0.5, 0, dst)
        } else if (algorithm === 'laplacian') {
          lap = new cv.Mat()
          cv.Laplacian(blurred, lap, cv.CV_16S)
          cv.convertScaleAbs(lap, dst)
        }

        kernel = cv.Mat.ones(3, 3, cv.CV_8U)
        cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel)

        rgba = new cv.Mat()
        cv.cvtColor(dst, rgba, cv.COLOR_GRAY2RGBA)
        cv.imshow(outputCanvas, rgba)

        if (algorithm === 'canny') {
          cv.threshold(dst, dst, 128, 255, cv.THRESH_BINARY)
        } else {
          cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU)
        }

        skel = cv.Mat.zeros(dst.rows, dst.cols, cv.CV_8UC1)
        temp = new cv.Mat()
        eroded = new cv.Mat()
        crossElement = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(3, 3))

        let done = false
        let maxIter = 100
        while (!done && maxIter > 0) {
          cv.erode(dst, eroded, crossElement)
          cv.dilate(eroded, temp, crossElement)
          cv.subtract(dst, temp, temp)
          cv.bitwise_or(skel, temp, skel)
          eroded.copyTo(dst)
          if (cv.countNonZero(dst) === 0) done = true
          maxIter--
        }

        skel.copyTo(dst)

        contours = new cv.MatVector()
        hierarchy = new cv.Mat()
        cv.findContours(dst, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

        const paths = []
        let totalCurves = 0
        const h = outputCanvas.height

        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i)
          try {
            if (cnt.rows >= noiseFilter) {
              const rawPoints = []
              for (let j = 0; j < cnt.rows; ++j) {
                const ptX = cnt.data32S[j * 2]
                const ptY = cnt.data32S[j * 2 + 1]
                rawPoints.push([ptX, h - ptY])
              }
              if (rawPoints.length > 1) {
                const errorMargin = Math.max(0.5, simplify * SIMPLIFY_ERROR_MARGIN_MULTIPLIER)
                const beziers = fitCurve(rawPoints, errorMargin)
                if (beziers.length > 0) {
                  paths.push(beziers)
                  totalCurves += beziers.length
                }
              }
            }
          } finally {
            cnt.delete()
          }
        }

        setStats({ time: Math.round(performance.now() - startTime), curves: totalCurves })
        setEdgePaths(paths)
        onEdgeData(paths)
        setHasResult(true)
      } catch (err) {
        console.error('OpenCV error:', err)
        const errorMsg = ERRORS.EDGE_DETECTION_FAILED
        setError(errorMsg)
      } finally {
        if (src) src.delete()
        if (gray) gray.delete()
        if (blurred) blurred.delete()
        if (dst) dst.delete()
        if (rgba) rgba.delete()
        if (sobelX) sobelX.delete()
        if (sobelY) sobelY.delete()
        if (absX) absX.delete()
        if (absY) absY.delete()
        if (lap) lap.delete()
        if (kernel) kernel.delete()
        if (contours) contours.delete()
        if (hierarchy) hierarchy.delete()
        if (skel) skel.delete()
        if (temp) temp.delete()
        if (eroded) eroded.delete()
        if (crossElement) crossElement.delete()
      }
      setProcessing(false)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(process)
    })
  }, [opencvReady, imageSrc, algorithm, threshold1, threshold2, blurAmount, noiseFilter, simplify, onEdgeData])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const key = e.key.toLowerCase()
      if (key === 'd' && opencvReady && imageSrc && !processing) runEdgeDetection()
      if (key === 'g' && hasResult) onOpenDesmos()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [runEdgeDetection, onOpenDesmos, opencvReady, imageSrc, processing, hasResult])

  const downloadResult = () => {
    const canvas = outputCanvasRef.current
    const link = document.createElement('a')
    link.download = 'edges.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  const exportSVG = useCallback(() => {
    if (!outputCanvasRef.current || !edgePaths) return
    const w = outputCanvasRef.current.width
    const h = outputCanvasRef.current.height
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n`
    svg += `<rect width="100%" height="100%" fill="white"/>\n`
    svg += `<g fill="none" stroke="black" stroke-width="1.5">\n`
    edgePaths.forEach(path => {
      if (!path || path.length === 0) return
      svg += `  <path d="M ${path[0][0][0]} ${h - path[0][0][1]} `
      path.forEach(curve => {
        svg += `C ${curve[1][0]} ${h - curve[1][1]}, ${curve[2][0]} ${h - curve[2][1]}, ${curve[3][0]} ${h - curve[3][1]} `
      })
      svg += `"/>\n`
    })
    svg += `</g>\n</svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'edges.svg'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [edgePaths])

  const exportJSON = useCallback(() => {
    if (!edgePaths) return
    const dataStr = JSON.stringify({ curves: edgePaths }, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'edges.json'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [edgePaths])

  return (
    <div className="processor">
      {/* Left: Controls */}
      <aside className="controls-panel">
        <div className="controls-section">
          <div className="panel-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => window.innerWidth <= 640 && setInputCollapsed(!inputCollapsed)}>
            <span>INPUT</span>
            {window.innerWidth <= 640 && (
              <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: inputCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
            )}
          </div>
          {(!inputCollapsed || window.innerWidth > 640) && (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="drop-icon">⊕</span>
              <span className="drop-label">DROP IMAGE<br/>OR CLICK TO BROWSE</span>
              <span className="drop-sub">PNG, JPG, WEBP, GIF</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          )}
        </div>

        <div className="controls-section">
          <div className="panel-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => window.innerWidth <= 640 && setAlgoCollapsed(!algoCollapsed)}>
            <span>ALGORITHM</span>
            {window.innerWidth <= 640 && (
              <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: algoCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
            )}
          </div>
          {(!algoCollapsed || window.innerWidth > 640) && (
            <>
          <div className="algo-group">
            {ALGORITHMS.map(a => (
              <button
                key={a.id}
                className={`algo-btn ${algorithm === a.id ? 'active' : ''}`}
                onClick={() => setAlgorithm(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="info-text" style={{ fontSize: '0.8em', marginTop: '8px', opacity: 0.8 }}>
            {ALGORITHMS.find(a => a.id === algorithm)?.desc}
          </div>
        </>
          )}
        </div>

         {/* ─── QUICK ACTION: DETECT BUTTON PROMINENT ─── */}
         <div className="controls-section controls-quick-action">
           <button
             className="btn primary"
             onClick={runEdgeDetection}
             disabled={!opencvReady || !imageSrc || processing}
             style={{ width: '100%', fontSize: '13px', padding: '14px' }}
           >
             {processing ? '◌ PROCESSING...' : '◈ DETECT EDGES'}
           </button>
           
           {error && (
             <div style={{
               padding: '12px',
               background: 'rgba(224, 49, 49, 0.1)',
               border: '1px solid var(--accent2)',
               borderRadius: 'var(--radius)',
               fontSize: '13px',
               color: 'var(--accent2)',
               marginTop: '10px',
               lineHeight: '1.4'
             }}>
               ⚠ {error}
             </div>
           )}
           
           {stats && hasResult && (
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               fontSize: '12px',
               marginTop: '10px',
               opacity: 0.9,
               letterSpacing: '0.5px'
             }}>
               <span>⏱ {stats.time}ms</span>
               <span>∿ {stats.curves.toLocaleString()} CURVES</span>
             </div>
           )}
         </div>

         <div className="controls-section">
           <div className="panel-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => window.innerWidth <= 640 && setParamsCollapsed(!paramsCollapsed)}>
             <span>PARAMETERS</span>
             {window.innerWidth <= 640 && (
               <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: paramsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
             )}
           </div>
           {(!paramsCollapsed || window.innerWidth > 640) && (
             <>
           {algorithm === 'canny' && (
            <>
              <div className="param-row">
                <span className="param-label" title="Minimum intensity gradient. Gradients below this are ignored as noise.">
                  THRESHOLD 1 <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
                </span>
                <span className="param-value">{threshold1}</span>
              </div>
              <input type="range" min={MIN_THRESHOLD} max={MAX_THRESHOLD} value={threshold1}
                onChange={e => setThreshold1(+e.target.value)} />

              <div className="param-row" style={{ marginTop: 16 }}>
                <span className="param-label" title="Maximum intensity gradient. Edges above this are considered strong boundaries.">
                  THRESHOLD 2 <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
                </span>
                <span className="param-value">{threshold2}</span>
              </div>
              <input type="range" min={MIN_THRESHOLD} max={MAX_THRESHOLD} value={threshold2}
                onChange={e => setThreshold2(+e.target.value)} />
            </>
          )}

          <div className="param-row" style={{ marginTop: 16 }}>
            <span className="param-label" title="Softens the image before detection. Higher values remove noise but blur fine details.">
              BLUR KERNEL <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
            </span>
            <span className="param-value">{blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount}×{blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount}</span>
          </div>
          <input type="range" min={MIN_BLUR_KERNEL} max={MAX_BLUR_KERNEL} step={BLUR_KERNEL_STEP} value={blurAmount}
            onChange={e => setBlurAmount(+e.target.value)} />

          <div className="param-row" style={{ marginTop: 16 }}>
            <span className="param-label" title="Removes small isolated edge fragments shorter than this pixel length.">
              NOISE FILTER <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
            </span>
            <span className="param-value">{noiseFilter} px</span>
          </div>
          <input type="range" min={MIN_NOISE_FILTER} max={MAX_NOISE_FILTER} step={1} value={noiseFilter}
            onChange={e => setNoiseFilter(+e.target.value)} />

          <div className="param-row" style={{ marginTop: 16 }}>
            <span className="param-label" title="Reduces the coordinate points in detected lines. Higher values make rendering faster but less accurate.">
              SIMPLIFY CURVE <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
            </span>
            <span className="param-value">{simplify.toFixed(1)}</span>
          </div>
           <input type="range" min={MIN_SIMPLIFY} max={MAX_SIMPLIFY} step={SIMPLIFY_STEP} value={simplify}
             onChange={e => setSimplify(+e.target.value)} />
          </>
        )}
      </div>

      <div className="controls-section controls-exports">
           {hasResult && (
             <>
               <div className="panel-label" style={{ marginTop: '12px' }}>EXPORT</div>
               <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                 <button className="btn" style={{ flex: 1 }} onClick={downloadResult}>
                   ↓ PNG
                 </button>
                 <button className="btn" style={{ flex: 1 }} onClick={exportSVG}>
                   ↓ SVG
                 </button>
                 <button className="btn" style={{ flex: 1 }} onClick={exportJSON}>
                   ↓ JSON
                 </button>
               </div>
               <button className="btn" style={{ marginTop: '8px', width: '100%' }} onClick={onOpenDesmos}>
                 ∿ GRAPH IN DESMOS
               </button>
             </>
           )}
         </div>

         {!opencvReady && (
           <div className="cv-warning">
             ⚡ OpenCV loading... edge detection will be available shortly.
           </div>
         )}
      </aside>

      {/* Right: Canvas area */}
      <div className="canvas-area">
        <div className="canvas-pane">
          <div className="pane-label">SOURCE</div>
          <div className="canvas-wrapper">
            {!imageSrc && (
              <div className="canvas-placeholder">
                <span>NO IMAGE LOADED</span>
              </div>
            )}
            <canvas ref={inputCanvasRef} style={{ opacity: imageSrc ? 1 : 0 }} />
          </div>
        </div>

        <div className="canvas-divider">→</div>

        <div className="canvas-pane">
          <div className="pane-label">EDGES</div>
          <div className="canvas-wrapper edge-canvas-wrapper">
            {!hasResult && (
              <div className="canvas-placeholder">
                <span>AWAITING DETECTION</span>
              </div>
            )}
            <canvas ref={outputCanvasRef} style={{ opacity: hasResult ? 1 : 0 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
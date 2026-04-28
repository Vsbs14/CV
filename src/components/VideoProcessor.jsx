import { useState, useRef, useCallback, useEffect } from 'react'
import {
  DEFAULT_CANNY_THRESHOLD1,
  DEFAULT_CANNY_THRESHOLD2,
  MIN_THRESHOLD,
  MAX_THRESHOLD,
  MIN_BLUR_KERNEL,
  MAX_BLUR_KERNEL,
  BLUR_KERNEL_STEP,
  VIDEO_FRAME_RATE,
  VIDEO_CODEC_PREFERENCES,
  ERRORS,
  MAX_VIDEO_SIZE_MB,
  ALGORITHMS,
} from '../constants'
import './Processor.css'

export default function VideoProcessor({ opencvReady }) {
  const [videoSrc, setVideoSrc] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [algorithm, setAlgorithm] = useState(() => localStorage.getItem('cv_vid_algo') || 'canny')
  const [threshold1, setThreshold1] = useState(() => Number(localStorage.getItem('cv_vid_t1')) || DEFAULT_CANNY_THRESHOLD1)
  const [threshold2, setThreshold2] = useState(() => Number(localStorage.getItem('cv_vid_t2')) || DEFAULT_CANNY_THRESHOLD2)
  const [blurAmount, setBlurAmount] = useState(() => Number(localStorage.getItem('cv_vid_blur')) || 5)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [isWebcam, setIsWebcam] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  const videoRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const frameTypeRef = useRef(null) // 'rAF' | 'rVFC' | null
  const fileInputRef = useRef(null)
  const matsRef = useRef(null)
  const capRef = useRef(null)
  const dimensionsRef = useRef({ w: 0, h: 0 })
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])

  useEffect(() => {
    localStorage.setItem('cv_vid_algo', algorithm)
    localStorage.setItem('cv_vid_t1', threshold1)
    localStorage.setItem('cv_vid_t2', threshold2)
    localStorage.setItem('cv_vid_blur', blurAmount)
  }, [algorithm, threshold1, threshold2, blurAmount])

  const processFrame = useCallback(() => {
    if (!opencvReady || !window.cv || !videoRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame)
      return
    }
    const video = videoRef.current
    if (video.paused) return

    const outputCanvas = outputCanvasRef.current
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      animFrameRef.current = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(processFrame)
        : requestAnimationFrame(processFrame)
      return
    }

    // FIX: OpenCV's VideoCapture requires the HTMLVideoElement to have explicitly set
    // width and height properties. Otherwise, it defaults to 0x0 and drops frames.
    if (video.width !== w) video.width = w
    if (video.height !== h) video.height = h

    const cv = window.cv

    outputCanvas.width = w
    outputCanvas.height = h

     // Reinitialize if video dimensions change
     if (!matsRef.current || dimensionsRef.current.w !== w || dimensionsRef.current.h !== h) {
       if (matsRef.current) {
         Object.values(matsRef.current).forEach(m => { try { m.delete() } catch(e){ void e; } })
       }
       if (capRef.current) {
          try { capRef.current.delete() } catch(e){ void e; }
       }
       dimensionsRef.current = { w, h }
       matsRef.current = {
         src: new cv.Mat(h, w, cv.CV_8UC4),
         gray: new cv.Mat(),
         blurred: new cv.Mat(),
         dst: new cv.Mat(),
         rgba: new cv.Mat(),
         sobelX: new cv.Mat(),
         sobelY: new cv.Mat(),
         absX: new cv.Mat(),
         absY: new cv.Mat(),
         lap: new cv.Mat()
       }
       capRef.current = new cv.VideoCapture(video)
     }
    
    const mats = matsRef.current;

    try {
      capRef.current.read(mats.src)

      cv.cvtColor(mats.src, mats.gray, cv.COLOR_RGBA2GRAY)
      const ksize = blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount
      cv.GaussianBlur(mats.gray, mats.blurred, new cv.Size(ksize, ksize), 0)

      if (algorithm === 'canny') {
        cv.Canny(mats.blurred, mats.dst, threshold1, threshold2)
      } else if (algorithm === 'sobel') {
        cv.Sobel(mats.blurred, mats.sobelX, cv.CV_16S, 1, 0)
        cv.Sobel(mats.blurred, mats.sobelY, cv.CV_16S, 0, 1)
        cv.convertScaleAbs(mats.sobelX, mats.absX)
        cv.convertScaleAbs(mats.sobelY, mats.absY)
        cv.addWeighted(mats.absX, 0.5, mats.absY, 0.5, 0, mats.dst)
      } else if (algorithm === 'laplacian') {
        cv.Laplacian(mats.blurred, mats.lap, cv.CV_16S)
        cv.convertScaleAbs(mats.lap, mats.dst)
      }

      cv.cvtColor(mats.dst, mats.rgba, cv.COLOR_GRAY2RGBA)
      cv.imshow(outputCanvas, mats.rgba)
    } catch (e) {
      void e; // intentionally skip bad frames
    }

    animFrameRef.current = video.requestVideoFrameCallback
      ? video.requestVideoFrameCallback(processFrame)
      : requestAnimationFrame(processFrame)
  }, [opencvReady, algorithm, threshold1, threshold2, blurAmount])

  const startProcessing = useCallback(() => {
    if (animFrameRef.current) {
      stopProcessing() // ensures proper cancellation based on type
    }
    const video = videoRef.current
    if (video && video.requestVideoFrameCallback) {
      animFrameRef.current = video.requestVideoFrameCallback(processFrame)
      frameTypeRef.current = 'rVFC'
    } else {
      animFrameRef.current = requestAnimationFrame(processFrame)
      frameTypeRef.current = 'rAF'
    }
    setProcessing(true)
  }, [processFrame])

  const stopProcessing = useCallback(() => {
    if (animFrameRef.current) {
      const video = videoRef.current
      if (frameTypeRef.current === 'rVFC' && video && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(animFrameRef.current)
      } else if (frameTypeRef.current === 'rAF') {
        cancelAnimationFrame(animFrameRef.current)
      }
      animFrameRef.current = null
      frameTypeRef.current = null
    }
    setProcessing(false)
  }, [])

  // Restarts the frame loop when algorithm parameters change dynamically
  useEffect(() => {
    if (isPlaying) {
      startProcessing()
    }
  }, [processFrame, isPlaying, startProcessing])

  useEffect(() => {
    return () => {
      // Cancel animation frame using the correct method
      if (animFrameRef.current) {
        const video = videoRef.current
        if (frameTypeRef.current === 'rVFC' && video && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(animFrameRef.current)
        } else if (frameTypeRef.current === 'rAF') {
          cancelAnimationFrame(animFrameRef.current)
        }
      }
      // Clean up OpenCV mats
      if (matsRef.current) {
        Object.values(matsRef.current).forEach(mat => {
          try { mat.delete() } catch(e){ void e; }
        })
        matsRef.current = null
      }
      // Clean up VideoCapture
      if (capRef.current) {
          try { capRef.current.delete() } catch(e){ void e; }
        capRef.current = null
      }
      // Stop webcam tracks
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
      // Stop media recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const stopWebcamTracks = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const startRecording = useCallback(() => {
    const canvas = outputCanvasRef.current
    if (!canvas) {
      setError('Output canvas not available')
      return
    }

    recordedChunksRef.current = []
    const stream = canvas.captureStream(VIDEO_FRAME_RATE)
    
    let options = { mimeType: VIDEO_CODEC_PREFERENCES[0] }
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      let foundCodec = false
      for (const codec of VIDEO_CODEC_PREFERENCES) {
        if (MediaRecorder.isTypeSupported(codec)) {
          options = { mimeType: codec }
          foundCodec = true
          break
        }
      }
      if (!foundCodec) options = {}
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || options.mimeType || 'video/webm'
        const extension = finalMimeType.includes('mp4') ? 'mp4' : 'webm'
        
        const blob = new Blob(recordedChunksRef.current, { type: finalMimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `edge-detection-video.${extension}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setError(null)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setError(null)
    } catch (e) {
      console.error('MediaRecorder error:', e)
      setError(`${ERRORS.RECORDING_FAILED}${e.message}`)
    }
  }, [])

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    setIsRecording(false)
  }, [])

  const handleFile = useCallback((file) => {
    if (!file) {
      setError('No file selected')
      return
    }
    if (!file.type.startsWith('video/')) {
      setError(ERRORS.INVALID_FILE_TYPE)
      return
    }
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_VIDEO_SIZE_MB) {
      setError(`${ERRORS.FILE_TOO_LARGE}${MAX_VIDEO_SIZE_MB}MB`)
      return
    }
    setError(null)
    stopWebcamTracks()
    setIsWebcam(false)
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    stopProcessing()
    setIsPlaying(false)
    stopRecording()
  }, [stopProcessing, stopWebcamTracks, stopRecording])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const video = videoRef.current
      if (!video) return
      stopWebcamTracks()
      setVideoSrc(null)
      video.srcObject = stream
      setIsWebcam(true)
      video.play()
      setIsPlaying(true)
      startProcessing()
      setError(null)
    } catch (err) {
      console.error("Error accessing webcam: ", err)
      setError(ERRORS.WEBCAM_ACCESS_DENIED)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
      startProcessing()
    } else {
      video.pause()
      setIsPlaying(false)
      stopProcessing()
    }
  }, [startProcessing, stopProcessing])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay])

  return (
    <div className="processor">
      <aside className="controls-panel">
        <div className="controls-section">
          <div className="panel-label">VIDEO INPUT</div>
          <button
            className="btn"
            style={{ width: '100%', marginBottom: '10px', justifyContent: 'center' }}
            onClick={startWebcam}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
            </svg>
            USE WEBCAM
          </button>
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            style={{ height: 120 }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="drop-icon">⊕</span>
            <span className="drop-label">DROP VIDEO<br/>OR CLICK TO BROWSE</span>
            <span className="drop-sub">MP4, WEBM, MOV, AVI</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        </div>

        <div className="controls-section">
          <div className="panel-label">ALGORITHM</div>
          <div className="algo-group">
            {ALGORITHMS.map(a => (
              <button
                key={a.id}
                className={`algo-btn ${algorithm === a.id ? 'active' : ''}`}
                onClick={() => setAlgorithm(a.id)}
                title={a.desc}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="info-text" style={{ fontSize: '0.8em', marginTop: '8px', opacity: 0.8 }}>
            {ALGORITHMS.find(a => a.id === algorithm)?.desc}
          </div>
        </div>

        <div className="controls-section">
          <div className="panel-label">PARAMETERS</div>
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
              <div className="param-row" style={{ marginTop: 14 }}>
                <span className="param-label" title="Maximum intensity gradient. Edges above this are considered strong boundaries.">
                  THRESHOLD 2 <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
                </span>
                <span className="param-value">{threshold2}</span>
              </div>
              <input type="range" min={MIN_THRESHOLD} max={MAX_THRESHOLD} value={threshold2}
                onChange={e => setThreshold2(+e.target.value)} />
            </>
          )}
          <div className="param-row" style={{ marginTop: 14 }}>
            <span className="param-label" title="Softens the image before detection. Higher values remove noise but blur fine details.">
              BLUR KERNEL <span style={{ cursor: 'help', opacity: 0.7 }}>ⓘ</span>
            </span>
            <span className="param-value">{blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount}×{blurAmount % 2 === 0 ? blurAmount + 1 : blurAmount}</span>
          </div>
          <input type="range" min={MIN_BLUR_KERNEL} max={MAX_BLUR_KERNEL} step={BLUR_KERNEL_STEP} value={blurAmount}
            onChange={e => setBlurAmount(+e.target.value)} />
        </div>

        <div className="controls-section controls-actions">
          {error && (
            <div style={{
              padding: '10px',
              background: 'rgba(224, 49, 49, 0.1)',
              border: '1px solid var(--accent2)',
              borderRadius: 'var(--radius)',
              fontSize: '11px',
              color: 'var(--accent2)',
              marginBottom: '10px',
              lineHeight: '1.4'
            }}>
              ⚠ {error}
            </div>
          )}
          {(videoSrc || isWebcam) && (
            <button className="btn primary" onClick={togglePlay} disabled={!opencvReady}>
              {isPlaying ? '◼ STOP' : '▶ PLAY + DETECT'}
            </button>
          )}
          {processing && (
            <button 
              className={`btn ${isRecording ? 'danger' : ''}`} 
              onClick={toggleRecording} 
              style={{ marginTop: '10px', width: '100%' }}
              title="Record the output to a video file"
            >
              {isRecording ? '◼ STOP RECORDING' : '⏺ RECORD VIDEO'}
            </button>
          )}
          {!opencvReady && (
            <div className="cv-warning">⚡ OpenCV loading...</div>
          )}
        </div>
      </aside>

      <div className="canvas-area">
        <div className="canvas-pane">
          <div className="pane-label">SOURCE VIDEO</div>
          <div className="canvas-wrapper">
            {!videoSrc && !isWebcam && (
              <div className="canvas-placeholder"><span>NO VIDEO LOADED</span></div>
            )}
            <video
              ref={videoRef}
              src={videoSrc || undefined}
              style={{ maxWidth: '100%', maxHeight: '100%', display: (videoSrc || isWebcam) ? 'block' : 'none' }}
              loop
              playsInline
              muted
            />
          </div>
        </div>

        <div className="canvas-divider">→</div>

        <div className="canvas-pane">
          <div className="pane-label">EDGE OUTPUT</div>
          <div className="canvas-wrapper edge-canvas-wrapper">
            {!processing && (
              <div className="canvas-placeholder"><span>PRESS PLAY TO BEGIN</span></div>
            )}
            <canvas
              ref={outputCanvasRef}
              style={{ maxWidth: '100%', maxHeight: '100%', opacity: processing ? 1 : 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

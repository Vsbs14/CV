// Edge Detection Configuration Constants

// Canvas Constraints
export const MAX_CANVAS_SIZE = 900

// Blur Kernel
export const MIN_BLUR_KERNEL = 1
export const MAX_BLUR_KERNEL = 15
export const BLUR_KERNEL_STEP = 2

// Canny Edge Detection
export const DEFAULT_CANNY_THRESHOLD1 = 80
export const DEFAULT_CANNY_THRESHOLD2 = 200
export const MIN_THRESHOLD = 0
export const MAX_THRESHOLD = 255

// Noise Filtering
export const MIN_NOISE_FILTER = 0
export const MAX_NOISE_FILTER = 100
export const DEFAULT_NOISE_FILTER = 35

// Curve Simplification
export const MIN_SIMPLIFY = 0.1
export const MAX_SIMPLIFY = 5.0
export const DEFAULT_SIMPLIFY = 0.4
export const SIMPLIFY_STEP = 0.1
export const SIMPLIFY_ERROR_MARGIN_MULTIPLIER = 10

// Desmos
export const DEFAULT_MAX_CURVES = 4000
export const MIN_DESMOS_CURVES = 100
export const MAX_DESMOS_CURVES = 10000
export const DESMOS_CURVES_STEP = 100

// Video Recording
export const VIDEO_FRAME_RATE = 30
export const VIDEO_CODEC_PREFERENCES = ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm', 'video/mp4']

// CORS Proxy (deprecated — URL upload removed)
// export const CORS_PROXY_URL = 'https://corsproxy.io/'

// Edge Detection Algorithms
export const ALGORITHMS = [
  { id: 'canny', label: 'CANNY', desc: 'Finds strong edges using intensity gradients. Best for clean, distinct lines.' },
  { id: 'sobel', label: 'SOBEL', desc: 'Highlights horizontal and vertical gradients. Good for textured depth.' },
  { id: 'laplacian', label: 'LAPLACIAN', desc: 'Measures 2nd derivative to find areas of rapid change. Very sensitive to detail.' },
]

// Error Messages
export const ERRORS = {
  IMAGE_LOAD_FAILED: 'Failed to load image. For URLs, CORS must be allowed.',
  OPENCV_NOT_READY: 'OpenCV is not ready yet. Please wait...',
  EDGE_DETECTION_FAILED: 'Edge detection failed. Please try again with a different image.',
  WEBCAM_ACCESS_DENIED: 'Could not access webcam. Please ensure you have granted permission.',
  RECORDING_FAILED: 'Could not start recording: ',
  DESMOS_API_MISSING: 'Desmos API not loaded. Graph cannot be displayed.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload the correct file type.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is ',
}

// File Size Limits
export const MAX_IMAGE_SIZE_MB = 50
export const MAX_VIDEO_SIZE_MB = 200

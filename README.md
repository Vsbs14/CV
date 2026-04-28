# CV-LAB (Computer Vision Laboratory)

CV-LAB is an interactive, browser-based tool for exploring computer vision algorithms in real-time. Built with React and OpenCV.js, it applies edge detection (Canny, Sobel, Laplacian) to images and videos, then visualizes the results as mathematical curves in Desmos.

All processing happens locally in your browser — no server required.

## Features

- **Local File Upload**: Drag & drop images or videos (no external dependencies or CORS proxies)
- **Real-time Edge Detection**: Canny, Sobel, and Laplacian algorithms with adjustable thresholds, blur, noise filtering, and curve simplification
- **Desmos Integration**: Convert detected edges into parametric cubic Bézier curves and explore them on an interactive graph
- **Video Processing**: Load video files or use your webcam for live edge detection
- **Export Options**: Download results as PNG, SVG, or JSON; record processed video as `.webm` or `.mp4`
- **Keyboard Shortcuts**: `D` to detect edges, `G` to open Desmos, `Space` to play/pause video, `Esc` to close Desmos panel
- **Light & Dark Mode**: Switch between themes at any time

## Tech Stack

- **Framework**: React 18 + Vite
- **Computer Vision**: OpenCV.js (WebAssembly)
- **Graphing**: Desmos Graphing Calculator API
- **Styling**: Custom CSS with CSS variables for theming

## Getting Started

### Prerequisites
Node.js (v18 or higher) and npm.

### Installation

```bash
git clone https://github.com/Vsbs14/CV.git
cd CV
npm install
```

### Development

```bash
npm run dev
```
Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Deployment

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

1. Enable GitHub Pages in your repository settings → Pages
2. Set Source to **GitHub Actions**
3. Push to `main` — a workflow will build and deploy to `https://YOUR-USERNAME.github.io/CV/`

## Usage

### Image Mode
1. Drag & drop an image onto the drop zone, or click to select a file
2. Choose an algorithm (Canny / Sobel / Laplacian)
3. Adjust parameters: thresholds, blur kernel, noise filter, and curve simplification
4. Click **DETECT EDGES** or press `D`
5. View results in the right canvas, then export or open in Desmos

### Video Mode
1. Upload a video file or click **USE WEBCAM**
2. Press play to start processing
3. Adjust the blur amount and algorithm in real-time
4. Use the **RECORD VIDEO** button to capture the output

### Desmos Panel
- Opens when you click **GRAPH IN DESMOS** or press `G` after processing
- Curves are rendered as parallel list arrays for efficient display
- Uses the same coordinate system as the source image (Y flipped for Cartesian orientation)
- Adjust **MAX CURVES** slider to balance performance vs detail

## Configuration

| Parameter | Range | Description |
|-----------|-------|-------------|
| Threshold 1 | 0–255 | Minimum gradient for Canny (lower = more edges) |
| Threshold 2 | 0–255 | Maximum gradient for Canny (higher = fewer edges) |
| Blur Kernel | 1–15 | Gaussian blur kernel size (odd numbers only; even auto-incremented) |
| Noise Filter | 0–100 px | Minimum contour length to keep (removes specks) |
| Simplify Curve | 0.1–5.0 | Bézier fitting error margin (lower = more accurate, slower) |
| Max Curves (Desmos) | 100–10,000 | Maximum curves rendered in Desmos |

## Architecture Notes

- OpenCV.js loads asynchronously from `docs.opencv.org` — a status indicator shows readiness
- Edge detection runs in a `requestAnimationFrame` loop to avoid blocking the UI
- Morphological skeletonization is applied to prevent double outlines in Desmos
- Video processing uses OpenCV's `VideoCapture` class on `<video>` elements with explicit width/height assignment
- All OpenCV `Mat` objects are explicitly deleted in `finally` blocks to avoid memory leaks
- Desmos expressions are batched: 8 parallel lists (Ax, Ay, Bx, By, Cx, Cy, Dx, Dy) plus one master parametric Bézier

## Browser Support

Tested on Chrome, Firefox, Safari, and Edge. Requires JavaScript and WebAssembly support.

## License

MIT

# CV-LAB (Computer Vision Laboratory)

CV-LAB is an interactive, educational web application designed to explore and visualize computer vision algorithms in real-time. Built with React and OpenCV.js, it allows users to experiment with edge detection techniques (Canny, Sobel, Laplacian) on both static images and live video feeds.

A standout feature of CV-LAB is its **Desmos Integration**, which mathematically parameterizes detected visual edges and transforms them into explorable coordinate graphs.

## Features

* **Real-time Video Processing**: Feed local video files or your webcam directly into OpenCV.js for zero-latency frame manipulation.
* **Educational Tooltips**: Interactive UI elements that explain the mathematics and purpose behind thresholds, blur kernels, and detection algorithms.
* **Algorithmic Variety**:
  * **Canny**: Intensity gradient mapping for distinct lines.
  * **Sobel**: 1st-derivative horizontal/vertical gradient highlights.
  * **Laplacian**: 2nd-derivative measurements for rapid change detection.
* **Desmos Graphing Engine**: Converts OpenCV morphological paths into optimized mathematical expressions rendered instantly on a Desmos coordinate plane.
* **Export Options**: Download processed PNG frames or record continuous `.webm`/`.mp4` outputs of your active computer vision pipeline.
* **Vectorization**: Real-time generation of mathematically pure Cubic Bezier SVG files.

### Keyboard Shortcuts
* `D` - Detect Edges
* `G` - Graph in Desmos
* `Space` - Play/Pause video processing
* `Esc` - Close Desmos Panel

## Tech Stack

* **Framework**: React 18 + Vite
* **Computer Vision**: OpenCV.js (WASM)
* **Math Rendering**: Desmos Graphing Calculator API
* **Styling**: Custom CSS (Dark/Light mode native support)

## Getting Started

### Prerequisites
Ensure you have Node.js installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/cv-lab.git
   ```
2. Navigate to the project directory:
   ```bash
   cd cv-lab
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment

This project is fully ready for deployment on platforms like Vercel, Netlify, or GitHub Pages. Because OpenCV.js runs locally in the user's browser via WebAssembly, you do not need a backend server.

To deploy using Vercel:
1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Select the `Vite` framework preset.
4. Deploy.

> **Note regarding CORS:** Processing remote URLs relies on a public CORS proxy (`corsproxy.io`). For production deployments handling sensitive images, consider setting up your own dedicated proxy server.

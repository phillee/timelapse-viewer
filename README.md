# Timelapse Viewer

A Next.js web application for viewing and exporting timelapse images from Frigate security camera system.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)

## Features

- 📍 **Multiple Locations** - View timelapses from different camera locations
- 📅 **Flexible Date Selection** - Choose custom date ranges for your timelapses
- ⏰ **Time Selection** - View images from specific times of day
- 🔄 **Frequency Options** - Display images daily, weekly, or monthly
- ▶️ **Animation Playback** - Play timelapses with adjustable speed (50-1000ms per frame)
- ⏸️ **Playback Controls** - Pause, resume, navigate forward/backward, replay
- 📸 **GIF Export** - Export timelapses as animated GIFs with progress tracking
- 🖼️ **Fullscreen Viewing** - View images in fullscreen with keyboard navigation
- 🚀 **Optimized Loading** - Batch image checking and preloading for smooth playback

## Tech Stack

- **Next.js 15.5** with App Router and Turbopack
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **gif.js** for GIF generation

## Prerequisites

- Node.js 18+ and npm
- Access to mounted Frigate timelapse directory
- SSHFS for mounting remote filesystem (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/phillee/timelapse-viewer.git
cd timelapse-viewer
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
# Create .env.local file
echo "TIMELAPSE_BASE_DIR=/path/to/timelapse/directory" > .env.local
```

4. Mount the tigers-server (if using remote filesystem):
```bash
mkdir -p ~/mnt/tigers-server
sshfs user@server:/ ~/mnt/tigers-server
```

## Usage

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3001

### Basic Workflow

1. **Select Location** - Choose a camera location from the dropdown
2. **Configure Settings**:
   - Frequency: Daily, Weekly, or Monthly
   - Time of Day: Select capture time
   - Date Range: Set start and end dates
   - Animation Speed: Adjust playback speed
3. **Load Images** - Click "Load Images" to fetch available timelapses
4. **View Timelapse**:
   - Click on any thumbnail to open fullscreen viewer
   - Click "Play Animation" to start automatic playback
   - Use controls or keyboard shortcuts for navigation

### Keyboard Shortcuts

When viewing images in fullscreen:
- **Space** - Play/Pause animation
- **←/→** - Navigate previous/next image
- **Esc** - Exit fullscreen
- **R** - Replay (when animation ends)

### GIF Export

Click "Export GIF" to create an animated GIF of your timelapse. The export includes:
- All loaded images in chronological order
- 800x600 pixel resolution
- Current animation speed as frame delay
- Descriptive filename with location, frequency, time, and date range

Example: `side-yard_daily_1200_2024-07-18_to_2025-01-30.gif`

## API Routes

The application provides the following API endpoints:

- `GET /api/locations` - List available camera locations
- `GET /api/check/:location/:filename` - Check if image exists
- `GET /api/image/:location/:filename` - Serve image file
- `POST /api/check-batch` - Batch check multiple images

## Project Structure

```
timelapse-viewer/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   ├── locations/
│   │   │   ├── check/
│   │   │   ├── image/
│   │   │   └── check-batch/
│   │   ├── page.tsx      # Main application page
│   │   └── layout.tsx    # Root layout
│   └── types/
│       └── timelapse.ts  # TypeScript definitions
├── public/
│   └── gif.worker.js     # Web worker for GIF generation
├── .env.local            # Environment configuration
└── package.json          # Dependencies and scripts
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Configuration

### Environment Variables

- `TIMELAPSE_BASE_DIR` - Path to the base directory containing timelapse images

### Customization

Edit `src/app/page.tsx` to modify:
- Default date ranges
- Animation speed limits
- GIF export settings
- Available time options

## Performance Optimizations

- **Batch Checking** - All image existence checks are done in a single API call
- **Image Preloading** - First 20 images preloaded on load, next 5 during playback
- **Turbopack** - Fast bundling and hot module replacement
- **Optimized Rendering** - Only visible thumbnails (first 100) are rendered

## License

MIT

## Author

Phil Lee

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { TimelapseImage, Location, Frequency, TimeOfDay, CheckResponse } from '@/types/timelapse'

const GIF = dynamic(() => import('gif.js'), { ssr: false })

export default function Home() {
  const [images, setImages] = useState<TimelapseImage[]>([])
  const [validImages, setValidImages] = useState<TimelapseImage[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [modalImage, setModalImage] = useState<TimelapseImage | null>(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [animationEnded, setAnimationEnded] = useState(false)
  const [exportingGif, setExportingGif] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('12-00')
  const [startDate, setStartDate] = useState('2024-07-18')
  const [endDate, setEndDate] = useState('2025-09-07')
  const [animationSpeed, setAnimationSpeed] = useState(100)
  const [location, setLocation] = useState('side_yard')
  const [locations, setLocations] = useState<Location[]>([])
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentIndexRef = useRef(0)
  const validImagesRef = useRef<TimelapseImage[]>([])
  
  const generateDates = useCallback(() => {
    const dates: Date[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    let current = new Date(start)
    
    while (current <= end) {
      dates.push(new Date(current))
      
      switch(frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }
    
    return dates
  }, [frequency, startDate, endDate])
  
  const formatDateForFilename = (date: Date): string[] => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    const timeStr = timeOfDay.includes(':') ? timeOfDay.replace(':', '-') : timeOfDay
    
    if (timeStr === '12' || timeStr === '12-00') {
      return [
        `${year}-${month}-${day}_12-00.jpg`,
        `${year}-${month}-${day}_12.jpg`
      ]
    }
    return [`${year}-${month}-${day}_${timeStr}.jpg`]
  }
  
  const formatDateForDisplay = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }
  
  const checkImageExists = async (filename: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/check/${location}/${filename}`)
      const data: CheckResponse = await response.json()
      return data.exists
    } catch (error) {
      return false
    }
  }
  
  const loadImages = async () => {
    setLoading(true)
    setStatus('Loading images...')
    setProgress(0)
    
    const dates = generateDates()
    
    // Prepare all possible filenames with their metadata
    const allFilenames: { filename: string; date: Date; displayDate: string }[] = []
    for (const date of dates) {
      const possibleFilenames = formatDateForFilename(date)
      const displayDate = formatDateForDisplay(date)
      // For now, just check the first format (most common)
      allFilenames.push({
        filename: possibleFilenames[0],
        date,
        displayDate
      })
    }
    
    // Batch check all filenames at once
    try {
      const response = await fetch('/api/check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          filenames: allFilenames.map(f => f.filename)
        })
      })
      
      const results = await response.json()
      const existsMap = new Map(results.map((r: any) => [r.filename, r.exists]))
      
      const imageData: TimelapseImage[] = []
      const valid: TimelapseImage[] = []
      
      for (const item of allFilenames) {
        const exists = existsMap.get(item.filename) || false
        const img: TimelapseImage = {
          path: exists ? `/api/image/${location}/${item.filename}` : '',
          filename: item.filename,
          date: item.date.toISOString(),
          displayDate: item.displayDate,
          exists
        }
        imageData.push(img)
        if (exists) {
          valid.push(img)
        }
        setProgress((imageData.length / allFilenames.length) * 100)
      }
      
      setImages(imageData)
      setValidImages(valid)
      validImagesRef.current = valid
      setStatus(`Loaded ${valid.length} images (${imageData.length - valid.length} missing)`)
      
      // Preload the first batch of images
      setStatus(`Preloading images...`)
      const preloadBatch = valid.slice(0, 20) // Preload first 20 images
      await Promise.all(
        preloadBatch.map(img => {
          return new Promise((resolve) => {
            const image = new Image()
            image.onload = resolve
            image.onerror = resolve
            image.src = img.path
          })
        })
      )
      setStatus(`Loaded ${valid.length} images (${imageData.length - valid.length} missing)`)
    } catch (error) {
      console.error('Failed to load images:', error)
      setStatus('Failed to load images')
    }
    
    setLoading(false)
    setProgress(100)
  }
  
  const startAnimation = () => {
    if (validImages.length === 0) {
      alert('No images to animate')
      return
    }
    
    setCurrentIndex(0)
    currentIndexRef.current = 0
    setModalImage(validImages[0])
    setAnimationEnded(false)
    setPlaying(true)
  }
  
  const stopAnimation = () => {
    setPlaying(false)
    setAnimationEnded(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setModalImage(null)
  }
  
  const pauseAnimation = () => {
    setPlaying(false)
  }
  
  const resumeAnimation = () => {
    if (!validImages.length || currentIndexRef.current >= validImages.length - 1) return
    setPlaying(true)
  }
  
  const goToNext = () => {
    if (currentIndexRef.current < validImages.length - 1) {
      if (playing) {
        pauseAnimation()
      }
      const next = currentIndexRef.current + 1
      currentIndexRef.current = next
      setCurrentIndex(next)
      setModalImage(validImages[next])
      if (next === validImages.length - 1) {
        setAnimationEnded(true)
        setPlaying(false)
      }
    }
  }
  
  const goToPrevious = () => {
    if (currentIndexRef.current > 0) {
      if (playing) {
        pauseAnimation()
      }
      const prev = currentIndexRef.current - 1
      currentIndexRef.current = prev
      setCurrentIndex(prev)
      setModalImage(validImages[prev])
      setAnimationEnded(false)
    }
  }
  
  const rewind = () => {
    setCurrentIndex(0)
    currentIndexRef.current = 0
    setModalImage(validImages[0])
    setAnimationEnded(false)
    setPlaying(true)
  }
  
  const openModal = (img: TimelapseImage) => {
    setModalImage(img)
    setAnimationEnded(false)
    const index = validImages.findIndex(v => v.path === img.path)
    if (index !== -1) {
      currentIndexRef.current = index
      setCurrentIndex(index)
    }
  }
  
  const closeModal = () => {
    if (playing) {
      stopAnimation()
    }
    setModalImage(null)
  }
  
  const exportToGif = async () => {
    if (validImages.length === 0) {
      alert('No images to export')
      return
    }
    
    setExportingGif(true)
    setExportProgress(0)
    
    try {
      const gif = new (await import('gif.js')).default({
        workers: 2,
        quality: 10,
        width: 800,
        height: 600,
        workerScript: '/gif.worker.js'
      })
      
      for (let i = 0; i < validImages.length; i++) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            canvas.width = 800
            canvas.height = 600
            
            const aspectRatio = img.width / img.height
            let drawWidth = canvas.width
            let drawHeight = canvas.height
            
            if (aspectRatio > canvas.width / canvas.height) {
              drawHeight = canvas.width / aspectRatio
            } else {
              drawWidth = canvas.height * aspectRatio
            }
            
            const x = (canvas.width - drawWidth) / 2
            const y = (canvas.height - drawHeight) / 2
            
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, x, y, drawWidth, drawHeight)
            
            gif.addFrame(canvas, { delay: animationSpeed })
            
            setExportProgress(Math.round((i + 1) / validImages.length * 100))
            resolve()
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = validImages[i].path
        })
      }
      
      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const locationName = location.replace(/_/g, '-')
        const firstDate = validImages[0]?.filename?.split('_')[0] || startDate
        const lastDate = validImages[validImages.length - 1]?.filename?.split('_')[0] || endDate
        const timeStr = timeOfDay.replace('-', '')
        const frequencyStr = frequency
        
        a.download = `${locationName}_${frequencyStr}_${timeStr}_${firstDate}_to_${lastDate}.gif`
        a.click()
        URL.revokeObjectURL(url)
        setExportingGif(false)
        setExportProgress(0)
      })
      
      gif.render()
    } catch (error) {
      console.error('Error creating GIF:', error)
      alert('Failed to create GIF: ' + (error as Error).message)
      setExportingGif(false)
      setExportProgress(0)
    }
  }
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!modalImage) return
      
      switch(e.key) {
        case 'Escape':
          closeModal()
          break
        case ' ':
          e.preventDefault()
          if (playing) {
            pauseAnimation()
          } else if (!animationEnded) {
            resumeAnimation()
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'r':
        case 'R':
          if (animationEnded) {
            rewind()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [modalImage, playing, animationEnded, currentIndex, validImages])
  
  useEffect(() => {
    if (playing && validImages.length > 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setInterval(() => {
        const nextIndex = currentIndexRef.current + 1
        const images = validImagesRef.current
        
        if (nextIndex >= images.length) {
          setPlaying(false)
          setAnimationEnded(true)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          currentIndexRef.current = nextIndex
          setCurrentIndex(nextIndex)
          setModalImage(images[nextIndex])
          
          // Preload next 5 images ahead
          const preloadAhead = 5
          for (let i = 1; i <= preloadAhead; i++) {
            const preloadIndex = nextIndex + i
            if (preloadIndex < images.length) {
              const img = new Image()
              img.src = images[preloadIndex].path
            }
          }
        }
      }, animationSpeed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [playing, animationSpeed])
  
  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then((data: Location[]) => {
        setLocations(data)
      })
      .catch(err => console.error('Failed to load locations:', err))
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">
        🎥 {locations.find(l => l.value === location)?.label || 'Timelapse'} Viewer
      </h1>
      
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Location</label>
              <select 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Frequency</label>
              <select 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Time of Day</label>
              <select 
                value={timeOfDay} 
                onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="00-00">12:00 AM</option>
                <option value="04-00">4:00 AM</option>
                <option value="08-00">8:00 AM</option>
                <option value="12-00">12:00 PM</option>
                <option value="12">12:00 PM (old)</option>
                <option value="16-00">4:00 PM</option>
                <option value="20-00">8:00 PM</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Speed: {animationSpeed}ms</label>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="mt-2"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={loadImages} 
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {loading ? '⏳ Loading...' : '📥 Load Images'}
            </button>
            
            {!playing ? (
              <button 
                onClick={startAnimation}
                disabled={validImages.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 rounded-lg font-semibold transition-colors"
              >
                ▶️ Play Animation
              </button>
            ) : (
              <button 
                onClick={stopAnimation}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                ⏹️ Stop
              </button>
            )}
            
            <button 
              onClick={exportToGif}
              disabled={validImages.length === 0 || exportingGif}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {exportingGif ? `📸 Exporting... ${exportProgress}%` : '📸 Export GIF'}
            </button>
          </div>
        </div>
        
        {status && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-lg mb-2">{status}</p>
            {loading && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            )}
            {!loading && images.length > 0 && (
              <div className="flex gap-4 mt-2">
                <span className="text-green-400">✅ Valid: {validImages.length}</span>
                <span className="text-red-400">❌ Missing: {images.length - validImages.length}</span>
                <span className="text-gray-400">📊 Total: {images.length}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {images.slice(0, 100).map((img, index) => (
            <div 
              key={index} 
              className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                !img.exists ? 'bg-gray-800 border-2 border-gray-700' : 'bg-gray-900'
              }`}
              onClick={() => img.exists && openModal(img)}
            >
              {img.exists ? (
                <img 
                  src={img.path} 
                  alt={img.displayDate} 
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  📷 Missing
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-xs p-1 text-center">
                {img.displayDate}
              </div>
            </div>
          ))}
          {images.length > 100 && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
              <div className="text-gray-400">
                +{images.length - 100} more
              </div>
            </div>
          )}
        </div>
      </div>
      
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
          >
            &times;
          </button>
          
          <div className="flex flex-col items-center w-full h-full p-4">
            <img 
              src={modalImage.path} 
              alt="" 
              className="w-full h-full object-contain max-h-[calc(100vh-200px)]"
            />
            <div className="text-xl mt-4 mb-4">
              {modalImage.displayDate}
              {validImages.length > 0 && (
                <span className="text-gray-400 ml-2">
                  ({currentIndex + 1} / {validImages.length})
                </span>
              )}
            </div>
            
            <div className="flex gap-4 mb-4">
              <button 
                onClick={goToPrevious} 
                disabled={currentIndex === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 rounded transition-colors"
              >
                ⬅️ Previous
              </button>
              
              {playing ? (
                <button 
                  onClick={pauseAnimation}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                >
                  ⏸️ Pause
                </button>
              ) : animationEnded ? (
                <button 
                  onClick={rewind}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  🔄 Replay
                </button>
              ) : modalImage && currentIndex < validImages.length - 1 ? (
                <button 
                  onClick={resumeAnimation}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  ▶️ Resume
                </button>
              ) : (
                <button 
                  onClick={stopAnimation}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  ⏹️ Close
                </button>
              )}
              
              <button 
                onClick={goToNext} 
                disabled={currentIndex === validImages.length - 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 rounded transition-colors"
              >
                Next ➡️
              </button>
            </div>
            
            <div className="text-sm text-gray-400 flex gap-4">
              <span>Space: Play/Pause</span>
              <span>←→: Navigate</span>
              <span>Esc: Exit</span>
              {animationEnded && <span>R: Replay</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

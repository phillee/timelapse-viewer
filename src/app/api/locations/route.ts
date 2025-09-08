import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { Location } from '@/types/timelapse'

export async function GET() {
  const TIMELAPSE_BASE_DIR = process.env.TIMELAPSE_BASE_DIR!
  
  try {
    const files = await fs.readdir(TIMELAPSE_BASE_DIR)
    
    const locations: Location[] = []
    for (const file of files) {
      const stats = await fs.stat(path.join(TIMELAPSE_BASE_DIR, file))
      if (stats.isDirectory()) {
        locations.push({
          value: file,
          label: file.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        })
      }
    }
    
    return NextResponse.json(locations)
  } catch (error) {
    console.error('Failed to read locations:', error)
    return NextResponse.json({ error: 'Failed to read locations' }, { status: 500 })
  }
}
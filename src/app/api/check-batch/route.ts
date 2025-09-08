import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { CheckBatchRequest, CheckBatchResponse } from '@/types/timelapse'

export async function POST(request: NextRequest) {
  const body: CheckBatchRequest = await request.json()
  const { location, filenames } = body
  
  if (!location || !Array.isArray(filenames)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  
  const TIMELAPSE_BASE_DIR = process.env.TIMELAPSE_BASE_DIR!
  
  const results: CheckBatchResponse[] = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(TIMELAPSE_BASE_DIR, location, filename)
      try {
        await fs.access(filePath)
        return { filename, exists: true }
      } catch {
        return { filename, exists: false }
      }
    })
  )
  
  return NextResponse.json(results)
}
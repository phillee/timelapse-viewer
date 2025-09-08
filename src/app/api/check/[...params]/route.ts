import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { CheckResponse } from '@/types/timelapse'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const resolvedParams = await params
  const [location, filename] = resolvedParams.params
  
  if (!location || !filename) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  const TIMELAPSE_BASE_DIR = process.env.TIMELAPSE_BASE_DIR!
  const filePath = path.join(TIMELAPSE_BASE_DIR, location, filename)
  
  try {
    await fs.access(filePath)
    const response: CheckResponse = { exists: true }
    return NextResponse.json(response)
  } catch {
    const response: CheckResponse = { exists: false }
    return NextResponse.json(response)
  }
}
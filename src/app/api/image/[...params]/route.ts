import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }
  
  try {
    const stat = fs.statSync(filePath)
    const stream = fs.createReadStream(filePath)
    const buffer = await streamToBuffer(stream)
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('Error serving image:', error)
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 })
  }
}

async function streamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
export interface TimelapseImage {
  path: string
  filename: string
  date: string
  displayDate: string
  exists: boolean
}

export interface Location {
  value: string
  label: string
}

export type Frequency = 'daily' | 'weekly' | 'monthly'

export type TimeOfDay = '00-00' | '04-00' | '08-00' | '12-00' | '12' | '16-00' | '20-00'

export interface CheckBatchRequest {
  location: string
  filenames: string[]
}

export interface CheckBatchResponse {
  filename: string
  exists: boolean
}

export interface CheckResponse {
  exists: boolean
}
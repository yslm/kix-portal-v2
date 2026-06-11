export interface ApiListResponse<T> {
  items: T[]
  total?: number
  cursor?: string | null
}

export interface BrandGame {
  id: string
  brand: string
  name: string
  status?: 'active' | 'paused' | 'draft'
  createdAt?: string
  // Extend as schema is reverse-engineered from real responses.
}

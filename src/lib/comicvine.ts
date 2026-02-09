const apiKey = import.meta.env.VITE_COMICVINE_API_KEY as string | undefined
const apiProxy = import.meta.env.VITE_COMICVINE_PROXY as string | undefined
const fallbackProxies = [
  apiProxy,
  'https://api.allorigins.win/raw?url=',
  'https://cors.isomorphic-git.org/',
].filter(Boolean) as string[]
const cacheTtlMs = 6 * 60 * 60 * 1000

export interface ComicIssue {
  id: number
  name: string | null
  issue_number: string
  cover_date: string | null
  image: {
    small_url: string
    super_url: string
  } | null
  volume: {
    name: string
  } | null
}

const baseUrl = 'https://comicvine.gamespot.com/api'

function buildUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${baseUrl}${path}`)
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  )
  return url.toString()
}

function getCachedResults(query: string): ComicIssue[] | null {
  if (typeof window === 'undefined') return null
  const key = `comicvine:search:${query.toLowerCase()}`
  const cached = window.localStorage.getItem(key)
  if (!cached) return null
  try {
    const parsed = JSON.parse(cached) as {
      timestamp: number
      results: ComicIssue[]
    }
    if (Date.now() - parsed.timestamp > cacheTtlMs) {
      window.localStorage.removeItem(key)
      return null
    }
    return parsed.results
  } catch {
    return null
  }
}

function setCachedResults(query: string, results: ComicIssue[]) {
  if (typeof window === 'undefined') return
  const key = `comicvine:search:${query.toLowerCase()}`
  const payload = JSON.stringify({ timestamp: Date.now(), results })
  window.localStorage.setItem(key, payload)
}

async function fetchWithFallback(url: string) {
  const targets =
    fallbackProxies.length > 0
      ? fallbackProxies.map((proxy) => `${proxy}${encodeURIComponent(url)}`)
      : [url]

  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const target of targets) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      try {
        const response = await fetch(target, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response
      } catch (err) {
        lastError = err
      } finally {
        clearTimeout(timeout)
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
  }

  throw lastError ?? new Error('Network error')
}

async function fetchIssues(query: string, limit?: number): Promise<ComicIssue[]> {
  if (!apiKey) {
    throw new Error('Missing Comic Vine API key')
  }

  const cached = getCachedResults(query)
  if (cached && !limit) {
    return cached
  }

  const url = buildUrl('/search/', {
    api_key: apiKey,
    format: 'json',
    resources: 'issue',
    query,
    limit: limit ? String(limit) : '20',
    field_list: 'id,name,issue_number,cover_date,image,volume',
  })

  const response = await fetchWithFallback(url)

  if (!response.ok) {
    throw new Error('Comic Vine request failed')
  }

  const data = (await response.json()) as {
    results?: ComicIssue[]
    error?: string
  }

  if (data.error && data.error !== 'OK') {
    throw new Error(data.error)
  }

  const results = data.results ?? []
  if (!limit) {
    setCachedResults(query, results)
  }
  return results
}

export async function searchIssues(query: string): Promise<ComicIssue[]> {
  return fetchIssues(query)
}

export async function searchIssueSuggestions(
  query: string,
): Promise<ComicIssue[]> {
  return fetchIssues(query, 6)
}

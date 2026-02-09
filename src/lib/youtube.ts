export type YouTubePlayer = YT.Player

let apiPromise: Promise<typeof YT> | null = null

export function loadYouTubeApi(): Promise<typeof YT> {
  if (apiPromise) {
    return apiPromise
  }

  apiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('YouTube API load timeout'))
    }, 8000)

    if (window.YT?.Player) {
      clearTimeout(timeout)
      resolve(window.YT)
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    )

    if (existingScript) {
      const checkReady = () => {
        if (window.YT?.Player) {
          clearTimeout(timeout)
          resolve(window.YT)
        } else {
          setTimeout(checkReady, 50)
        }
      }
      checkReady()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Failed to load YouTube API'))
    }

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) {
        clearTimeout(timeout)
        resolve(window.YT)
      } else {
        clearTimeout(timeout)
        reject(new Error('YouTube API unavailable'))
      }
    }

    document.head.appendChild(script)
  })

  return apiPromise
}

export function resetYouTubeApi() {
  apiPromise = null
  const script = document.querySelector<HTMLScriptElement>(
    'script[src="https://www.youtube.com/iframe_api"]',
  )
  if (script) {
    script.remove()
  }
  if (window.onYouTubeIframeAPIReady) {
    delete window.onYouTubeIframeAPIReady
  }
}

export async function createYouTubePlayer(
  elementId: string,
  onStateChange?: (event: YT.OnStateChangeEvent) => void,
  onError?: (event: YT.OnErrorEvent) => void,
): Promise<YouTubePlayer> {
  const YTApi = await loadYouTubeApi()

  return new Promise((resolve) => {
    const player = new YTApi.Player(elementId, {
      host: 'https://www.youtube.com',
      height: '1',
      width: '1',
      playerVars: {
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => resolve(player),
        onStateChange,
        onError,
      },
    })
  })
}

export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = parsed.hostname.replace('www.', '')
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      if (parsed.pathname.startsWith('/watch')) {
        return parsed.searchParams.get('v')
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1]
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1]
      }
    }
    if (host === 'youtu.be') {
      return parsed.pathname.replace('/', '')
    }
    return null
  } catch {
    return null
  }
}

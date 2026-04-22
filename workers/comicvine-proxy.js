const ALLOWED_ORIGIN = 'https://comicvine.gamespot.com'
const ALLOWED_HOST = 'comicvine.gamespot.com'
const DEFAULT_TTL_SECONDS = 300

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = url.searchParams.get('url')

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (!target) {
      return new Response('Missing url query parameter.', { status: 400 })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    } catch {
      return new Response('Invalid url.', { status: 400 })
    }

    if (targetUrl.host !== ALLOWED_HOST) {
      return new Response('Only Comic Vine API requests are allowed.', {
        status: 403,
      })
    }

    const upstreamRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
    })

    const response = await fetch(upstreamRequest)
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Cache-Control', `public, max-age=${DEFAULT_TTL_SECONDS}`)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}

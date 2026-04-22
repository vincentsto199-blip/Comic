# Comic Vine Proxy (Cloudflare Worker)

This proxy replaces the unreliable public CORS proxies. It allows the browser to
reach the Comic Vine API without CORS errors.

## 1) Create the Worker

1. Go to Cloudflare Dashboard.
2. Workers & Pages -> Create -> Worker.
3. Name it `comicvine-proxy`.
4. Replace the Worker code with `workers/comicvine-proxy.js`.
5. Deploy.

You will get a URL like:
`https://comicvine-proxy.<your-subdomain>.workers.dev`

## 2) Wire it to the app

In `.env.local` set:

```
VITE_COMICVINE_PROXY=https://comicvine-proxy.<your-subdomain>.workers.dev/?url=
```

Then restart:

```
npm run dev
```

## Notes

- The proxy only allows `comicvine.gamespot.com` requests.
- The API key is still passed from the app to Comic Vine, but it is no longer
  exposed to public proxy services.

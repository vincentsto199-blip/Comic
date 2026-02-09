/// <reference types="vite/client" />
/// <reference types="youtube" />

interface Window {
  onYouTubeIframeAPIReady?: () => void
  YT?: typeof YT
}

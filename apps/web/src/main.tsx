import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { SeedViewer } from '@/components/seed-viewer/seed-viewer'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'

// Dev-only component gallery at /?gallery. `import.meta.env.DEV` is a build-time constant,
// so production builds drop this branch and the gallery chunk with it.
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/gallery.tsx')) : null
const showGallery = Gallery !== null && new URLSearchParams(location.search).has('gallery')
// Dev-only seed search engine test page at /?seedtest.
const SeedTest = import.meta.env.DEV ? lazy(() => import('./dev/seed-search.tsx')) : null
const showSeedTest = SeedTest !== null && new URLSearchParams(location.search).has('seedtest')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <TooltipProvider delayDuration={300}>
        {showSeedTest && SeedTest ? (
          <Suspense fallback={null}>
            <SeedTest />
          </Suspense>
        ) : showGallery && Gallery ? (
          <Suspense fallback={null}>
            <Gallery />
          </Suspense>
        ) : (
          <App />
        )}
        <SeedViewer />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)

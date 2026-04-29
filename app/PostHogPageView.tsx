"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { usePostHog } from 'posthog-js/react'

import { getGPUInfo } from "@/lib/analytics"

function PostHogPageViewImpl() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString()
      }

      // Gather device/hardware info
      const gpuInfo = getGPUInfo()
      const isMobile = window.innerWidth <= 768

      posthog.capture('$pageview', {
        $current_url: url,
        user_gpu: gpuInfo,
        user_device_type: isMobile ? 'Mobile' : 'Desktop',
        screen_resolution: `${window.screen.width}x${window.screen.height}`
      })
    }
  }, [pathname, searchParams, posthog])
  
  return null
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewImpl />
    </Suspense>
  )
}

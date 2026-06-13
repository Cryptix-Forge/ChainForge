"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface ParallaxImageProps {
  src: string
  alt: string
  /** strength of the parallax movement in px (total travel) */
  strength?: number
  className?: string
  imgClassName?: string
  children?: ReactNode
  /** overlay tint over the image for text legibility */
  overlayClassName?: string
}

/**
 * A fixed-height band whose background image drifts at a different rate
 * than the scroll, producing a parallax effect. Optional children render
 * on top (e.g. centered copy).
 */
export function ParallaxImage({
  src,
  alt,
  strength = 120,
  className = "",
  imgClassName = "",
  children,
  overlayClassName = "",
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        const vh = window.innerHeight
        // progress from -1 (below viewport) to 1 (above viewport)
        const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2)
        setOffset(progress * (strength / 2))
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [strength])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.18)` }}
      >
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className={`size-full object-cover ${imgClassName}`}
          crossOrigin="anonymous"
        />
      </div>
      {overlayClassName && <div className={`absolute inset-0 ${overlayClassName}`} aria-hidden="true" />}
      {children && <div className="relative z-10 size-full">{children}</div>}
    </div>
  )
}

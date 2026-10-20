import { useEffect, useEffectEvent } from 'react'

export function useDocumentKeyDown(handler: (event: KeyboardEvent) => void) {
  const onKeyDown = useEffectEvent(handler)
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}

// Space toggles playback, except on buttons and links where it keeps its native activation.
export const useSpaceToggle = (toggle: () => void) =>
  useDocumentKeyDown((event) => {
    if (event.key !== ' ' || event.repeat) return
    if (event.target instanceof Element && event.target.closest('button, a')) return
    event.preventDefault()
    toggle()
  })

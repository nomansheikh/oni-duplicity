import { useCallback, useState } from 'react'

const KEY = 'duplicity:allow-unverified'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

/** Whether saving is allowed for save versions newer than the verified range. */
export function useAllowUnverified(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(read)
  const update = useCallback((next: boolean) => {
    setValue(next)
    try {
      localStorage.setItem(KEY, String(next))
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this visit.
    }
  }, [])
  return [value, update]
}

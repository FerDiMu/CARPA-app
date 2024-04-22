import { EpubCFI } from "@flow/epubjs/types"

export function keys<T extends object>(o: T) {
  return Object.keys(o) as (keyof T)[]
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

export function group<T>(array: T[], getKey: (item: T) => string | number) {
  const o: Record<string, T[]> = {}

  array.forEach((item) => {
    const key = getKey(item)
    o[key] = [...(o[key] ?? []), item]
  })

  return o
}

export function makeRangeCfi(a:string, b:string) {
  const startCfi = a
  const endCfi = b
  const cfiBase = startCfi.replace(/!.*/, '') 
  const cfiStart = startCfi.replace(/.*!/, '').replace(/\)$/, '')
  const cfiEnd = endCfi.replace(/.*!/, '').replace(/\)$/, '')
  const cfiRange = `${cfiBase }!,${cfiStart },${cfiEnd })`
  return cfiRange
}

export function copy(text: string) {
  return navigator.clipboard.writeText(text)
}

export const timeConfiguration: Intl.DateTimeFormatOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: "short",
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    fractionalSecondDigits: 3
}

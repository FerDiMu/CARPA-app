import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const keyDownState = atom<{key: string|undefined, time: number|undefined}>({
  key: 'keyDown',
  default: {"key": undefined, "time": undefined},
})

export function useSetKeyDown() {
  return useSetRecoilState(keyDownState)
}

export function useKeyDown() {
  return useRecoilState(keyDownState)
}
import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const sessionIDState = atom<string | undefined>({
  key: 'sessionID',
  default: "",
})

export function useSetSessionID() {
  return useSetRecoilState(sessionIDState)
}

export function useSessionID() {
  return useRecoilState(sessionIDState)
}

import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const bookLocationCallbackState = atom<{callback: (param:boolean, data: {}) => void}>({
    key: 'bookLocationCallback',
    default: {callback: (param:boolean, data: {}) => {console.log("Weblogger: Empty book location callback")}},
  })

export function useSetBookLocationCallback() {
  return useSetRecoilState(bookLocationCallbackState)
}

export function useBookLocationCallback() {
  return useRecoilState(bookLocationCallbackState)
}
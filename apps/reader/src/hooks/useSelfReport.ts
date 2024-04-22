import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const selfReportState = atom<{show: boolean, show_beginning: boolean, show_end: boolean, sections: { [key: string]: {show: boolean, when:string[]} }}>({
  key: 'selfReport',
  default: {show: false, show_beginning: true, show_end: false,  sections: {mood: {show: true, when: ["beginning","end"]}, motivation: {show: true, when: ["beginning"]}, taskResponse: {show: true, when: ["end"]}}},
})

export function useSetSelfReport() {
  return useSetRecoilState(selfReportState)
}

export function useSelfReport() {
  return useRecoilState(selfReportState)
}
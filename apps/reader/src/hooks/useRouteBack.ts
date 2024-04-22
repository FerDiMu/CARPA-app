import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export type PageType =
  | 'calibration'
  | 'report'

export const routeBackState = atom<{calibration: {prev: boolean, current: boolean}, report: {prev: boolean, current: boolean}}>({
  key: 'routeBack',
  default: {calibration: {prev: false, current: false}, report: {prev: false, current: false}},
})

export function useSetRouteBack() {
  return useSetRecoilState(routeBackState)
}

export function useRouteBack() {
  return useRecoilState(routeBackState)
}
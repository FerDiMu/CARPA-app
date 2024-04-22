import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const routeHistoryState = atom<Array<string>>({
  key: 'routeHistory',
  default: [],
})

export function useSetRouteHistory() {
  return useSetRecoilState(routeHistoryState)
}

export function useRouteHistory() {
  return useRecoilState(routeHistoryState)
}

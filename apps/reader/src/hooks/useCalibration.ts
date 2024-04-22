import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export const calibrationState = atom<boolean>({
  key: 'performedCalibration',
  default: false,
})

export function useSetPerformedCalibration() {
  return useSetRecoilState(calibrationState)
}

export function usePerformedCalibration() {
  return useRecoilState(calibrationState)
}
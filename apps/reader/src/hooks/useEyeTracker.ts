import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export type EyeTrackerState =
'inactive'
| 'paused'
| 'active'

export type RegressionType =
'ridge'
|  'weightedRidge'
|  'threadedRidge'


export const eyeTrackerState = atom<{state: EyeTrackerState, kalmanFilter: boolean, videoPreview: boolean, regressionType: RegressionType, showPredictions: boolean, saveDataAcrossSessions: boolean, page_calibration: boolean}>({
  key: 'eyeTracker',
  default: {state: "inactive", page_calibration: false, kalmanFilter: true,  videoPreview: true, regressionType: "ridge", showPredictions: true, saveDataAcrossSessions: true},
})

export function useSetEyeTracker() {
  return useSetRecoilState(eyeTrackerState)
}

export function useEyeTracker() {
  return useRecoilState(eyeTrackerState)
}
import { atom, useRecoilState, useSetRecoilState } from 'recoil'
import { db } from '../db';
import { timeConfiguration } from '../utils';

export const microphoneState = atom<{context: AudioContext | undefined, analyser: AnalyserNode | undefined}>({
    key: 'microphoneState',
    default: {context: undefined, analyser: undefined},
})

export function modifyContextState(audioCtx: AudioContext, callback: ()=>void){
    if (audioCtx.state === "running") {
        audioCtx.suspend().then(() => {
          console.log("Weblogger: Audio context suspended");
          callback()
        });
      } else if (audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
            console.log("Weblogger: Audio context resumed");
            callback()
        });
      }
}

export function volumeCallback(analyser: AnalyserNode){
    const date = Date.now()
    const volumes = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(volumes)
    let volumeSum = 0
    for (const volume of volumes) volumeSum += volume
    const averageVolume = volumeSum / volumes.length
    console.log("Weblogger: Volume " + averageVolume)
    const normalizedVolume =
      (averageVolume - analyser.minDecibels) /
      (analyser.maxDecibels - analyser.minDecibels)
    console.log("Weblogger: Normalized volume " + normalizedVolume)
    db?.microphones.add({
        volume_level: normalizedVolume,
        timestamp: date,
        timestamp_formatted: new Date(date).toLocaleString(
            'es-ES',
            timeConfiguration,
        ),
    })
}

export function useSetMicrophone() {
  return useSetRecoilState(microphoneState)
}

export function useMicrophone() {
  return useRecoilState(microphoneState)
}
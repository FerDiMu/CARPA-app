import { useEffect, useRef, useState } from 'react'
import { Checkbox } from '../Form'
import { PaneViewProps, PaneView, Pane } from '../base'
import { useTranslation } from '@flow/reader/hooks'
import { useMicrophone } from '@flow/reader/hooks/useMicrophone'

export const MicrophoneView: React.FC<PaneViewProps> = (props) => {
  const t = useTranslation('microphone')
  const audioCtxContainer = useRef<AudioContext | null>(null)
  const [microphone, setMicrophone] = useMicrophone()

  useEffect(() => {
    audioCtxContainer.current = new AudioContext()
  }, [])

  return (
    <PaneView {...props}>
      <Pane headline={t('general')} className="space-y-3 px-5 pt-2 pb-4">
        <Checkbox
          name={t('activate')}
          defaultChecked={false}
          onClick={(e) => {
            if (e.currentTarget.checked) {
              if (navigator.mediaDevices) {
                navigator.mediaDevices
                  .getUserMedia({ audio: true, video: false })
                  .then((stream) => {
                    const analyser = audioCtxContainer.current!.createAnalyser()
                    analyser.smoothingTimeConstant = 0.8
                    analyser.fftSize = 2048
                    const micStream =
                      audioCtxContainer.current!.createMediaStreamSource(stream)
                    micStream.connect(analyser)
                    audioCtxContainer.current!.suspend().then(() => {
                      setMicrophone({
                        context: audioCtxContainer.current!,
                        analyser: analyser,
                      })
                    })
                    console.log(
                      'Weblogger: Analyzer: Max level ' +
                        analyser.maxDecibels +
                        '. Min decibels ' +
                        analyser.minDecibels,
                    )
                  })
              }
            } else {
              audioCtxContainer.current!.close()
              setMicrophone({
                context: undefined,
                analyser: undefined,
              })
            }
          }}
        />
      </Pane>
    </PaneView>
  )
}

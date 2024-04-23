'use client'

//import { Player, Script, Video } from 'liqvid'
import { useEffect, useRef } from 'react'

export interface SelfReportProps {
  question: string
  script: [string, string][]
  source: string
  input: JSX.Element
  on_exit_callback: (val: string, question: string) => void
}

export const SelfReportPlayer = ({
  question,
  script,
  source,
  input,
  on_exit_callback,
}: SelfReportProps) => {
  //const vidRef = useRef<Player>(null)
  const onclick = (val: string) => {
    //vidRef.current!.playback.seek(0)
    //vidRef.current!.playback.pause()
    console.log(
      'Webloggger: Selfreport: Onclick callback called! Question: ' +
        question +
        '. Val:' +
        val,
    )
    on_exit_callback(val, question)
  }
  useEffect(() => {
    var iframe = document.getElementById('section-iframe')! as HTMLIFrameElement
    var innerDoc = iframe.contentDocument
      ? iframe.contentDocument
      : iframe.contentWindow!.document
    Array.from(innerDoc.getElementsByTagName('input')).forEach((element) => {
      console.log('Weblogger: Adding listeners')
      element.addEventListener('click', () => {
        onclick(element.value)
      })
    })
    return () => {
      Array.from(innerDoc.getElementsByTagName('input')).forEach((element) => {
        element.removeEventListener('click', () => {
          onclick(element.value)
        })
      })
    }
  }, [])
  return {
    /* <Player ref={vidRef} script={new Script(script)}>
      <Video style={{ aspectRatio: '16/10', width: '100%' }}>
        <source src={source} type="video/mp4" />
      </Video>
      {input}
    </Player> */
  }
}

export default SelfReportPlayer

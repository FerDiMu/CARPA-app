import { useEffect, useRef, useState } from 'react'
import { SelfReportProps } from '../components/SelfReportPlayer'
import { NextPageWithLayout } from './_app'
import { Root, createRoot } from 'react-dom/client'
import { timeConfiguration } from '../utils'
import { useRouter } from 'next/router'
import { useSelfReport } from '../hooks/useSelfReport'
import {
  Popup_Motivation,
  script_motivation,
} from '../components/self-report/MotivationSection'
import { Popup_Mood, script_mood } from '../components/self-report/MoodSection'
import {
  Popup_Satisfaction,
  script_satisfaction,
} from '../components/self-report/SatisfactionSection'
import { useRouteBack } from '../hooks/useRouteBack'
import React from 'react'
import dynamic from 'next/dynamic'

function onResponseCallback(response: string, question: string) {
  console.log('Weblogger: Called Response Callback')
  if (
    (document.cookie.match(/^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/) || [
      ,
      null,
    ])[1] != null
  ) {
    const response_item = {
      section: question,
      response: response,
      timestamp: Date.now(),
    }
    console.log('Weblogger: Sending fetch request to server...')
    fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collection: document.cookie.match(
          /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
        )![1],
        document: 'self-report-' + response_item.timestamp,
        data: {
          timestamp_formatted: new Date(response_item.timestamp).toLocaleString(
            'es-ES',
            timeConfiguration,
          ),
          ...response_item,
        },
      }),
    }).then((res: Response) => {
      console.log(
        'Weblogger: HTTP Response: Code ' +
          res.status +
          '. ' +
          JSON.stringify(res.json()),
      )
    })
  } else
    console.log(
      "Weblogger: Careful! You haven't created a session cookie, data won't be stored",
    )
}
/* const SelfReportPlayer: React.ComponentType<SelfReportProps> =
  dynamic<SelfReportProps>(() =>
    import('../components/SelfReportPlayer'),
  ) */

const SelfReport: NextPageWithLayout = () => {
  const router = useRouter()
  const [routeBack, setRouteBack] = useRouteBack()
  const { when } = router.query
  const [selfReport] = useSelfReport()
  const [root, setRoot] = useState<Root | null>(null)
  const sections_array = Object.keys(selfReport.sections)
  const [finishedSection, setFinishedSection] = useState(false)
  const [index, setIndex] = useState(0)
  const vidRef = useRef<any>(null)
  const onexit = (val: string, question: string) => {
    vidRef.current!.playback.seek(0)
    vidRef.current!.playback.pause()
    console.log(
      'Weblogger: Selfreport sections: ' + JSON.stringify(sections_array),
      +'. Current section: ' + sections_array[index]!,
    )
    onResponseCallback(val, question)
    setFinishedSection(true)
  }
  var section: string | undefined = undefined
  const sections_props: { [key: string]: SelfReportProps } = {
    //Location of video source is relative to location of iframe's html
    mood: {
      question: 'mood',
      script: script_mood,
      source: '../videos/emojis-list.mp4',
      input: Popup_Mood(),
      on_exit_callback: onexit,
    },
    motivation: {
      question: 'motivation',
      script: script_motivation,
      source: '../videos/video-ganas-corto.mp4',
      input: Popup_Motivation(),
      on_exit_callback: onexit,
    },
    taskResponse: {
      question: 'satisfaction',
      script: script_satisfaction,
      source: '../videos/video-gustar-tarea-corto.mp4',
      input: Popup_Satisfaction(),
      on_exit_callback: onexit,
    },
  }
  const onrender = async () => {
    console.log('Weblogger: Index ' + index)
    for (let i = !root ? index : index + 1; i < sections_array.length; i++) {
      if (
        selfReport.sections[sections_array[i]!]!.show &&
        selfReport.sections[sections_array[i]!]!.when.indexOf(when as string) >
          -1
      ) {
        section = sections_array[i]!
        console.log('Weblogger: Found new section index: ' + i)
        setIndex(i)
        break
      }
    }
    if (section) {
      const Player = (await import('liqvid')).Player
      const Script = (await import('liqvid')).Script
      const Video = (await import('liqvid')).Video
      console.log('Weblogger: Found new section: ' + section)
      var root_aux = createRoot(
        document
          .querySelector('iframe')!
          .contentDocument!.querySelector('main')!,
      )
      console.log('Weblogger: Rendering section ' + section)

      //root_aux.render(<SelfReportPlayer {...sections_props[section]!} />)
      root_aux.render(
        <Player
          ref={vidRef}
          script={new Script(sections_props[section]!.script)}
        >
          <Video style={{ aspectRatio: '16/10', width: '100%' }}>
            <source src={sections_props[section]!.source} type="video/mp4" />
          </Video>
          {sections_props[section]!.input}
        </Player>,
      )
      setRoot(root_aux)
    } else {
      setRouteBack({
        ...routeBack,
        report: {
          ...routeBack.report,
          current: !routeBack.report.current,
        },
      })
      router.back()
    }
  }

  useEffect(() => {
    if (root) {
      var iframe = document.getElementById(
        'section-iframe',
      )! as HTMLIFrameElement
      var innerDoc = iframe.contentDocument
        ? iframe.contentDocument
        : iframe.contentWindow!.document
      Array.from(innerDoc.getElementsByTagName('input')).forEach((element) => {
        console.log('Weblogger: Adding listeners')
        element.addEventListener('click', () => {
          onexit(
            element.value,
            sections_props[sections_array[index]!]!.question,
          )
        })
      })
      return () => {
        Array.from(innerDoc.getElementsByTagName('input')).forEach(
          (element) => {
            element.removeEventListener('click', () => {
              onexit(
                element.value,
                sections_props[sections_array[index]!]!.question,
              )
            })
          },
        )
      }
    }
  }, [root])

  useEffect(() => {
    if (!root) {
      document.querySelector('iframe')!.onload = () => {
        console.log('iframe loaded')
        onrender()
      }
    } else {
      if (finishedSection) {
        root.unmount()
        onrender()
        setFinishedSection(false)
      }
    }
  }, [finishedSection])

  return (
    <div className="video-container">
      <div className="aspect-ratio" style={{ paddingBottom: '62.5%' }}>
        <iframe id="section-iframe" src="html/liqvid-video.html"></iframe>
      </div>
    </div>
  )
}

SelfReport.getLayout = function getLayout(page) {
  return <>{page}</>
}

export default SelfReport

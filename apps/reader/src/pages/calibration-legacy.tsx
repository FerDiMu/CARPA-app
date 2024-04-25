import Script from 'next/script'
import { Helmet } from 'react-helmet'
import { useEffect, useRef, useState } from 'react'
import { Restart, onLoad } from '../javascript/main'
import {
  ClearCalibration,
  ClearCanvas,
  ShowCalibrationPoint,
  calPointClick,
  calcAccuracy,
} from '../javascript/calibration'
import { NextPageWithLayout } from './_app'
import { VideoModal } from '../components/VideoModal'
import { HelpModal } from '../components/HelpModal'
import { useRouter } from 'next/router'
import { makeRangeCfi, timeConfiguration } from '../utils'
import { db } from '../db'
import { BookTab, useReaderSnapshot } from '../models'
import useWindowDimensions from '../hooks/useWindowDimensions'
import { useRouteBack } from '../hooks/useRouteBack'
import { useBookLocationCallback } from '../hooks/useLocation'
import { useEyeTracker } from '../hooks/useEyeTracker'

const CalibrationLegacy: NextPageWithLayout = () => {
  let router = useRouter()
  let currentAction: any = undefined
  const [routeBack, setRouteBack] = useRouteBack()
  const { focusedBookTab } = useReaderSnapshot()
  const [loading, setLoading] = useState(true)
  const [styleVideo, setStyleVideo] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(true)
  const { width, height } = useWindowDimensions()
  const [eyeTracker] = useEyeTracker()
  const [showPrecisionModal, setShowPrecisionModal] = useState(false)
  const canvas_ref = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState<{
    calibration: { top: string; left: string; width: string; height: string }[]
    start: { top: string; left: string; width: string; height: string }
  }>()
  const calibration_callback = () => {
    setShowPrecisionModal(true)
  }
  const accuracy_callback = (accuracy_num: number, past_50: any) => {
    console.log('Weblogger: Accuracy: ' + JSON.stringify(past_50))
    const accuracy_item = {
      accuracy: accuracy_num,
      timestamp: Date.now(),
      accuracy_predictions: {
        x: past_50[0],
        y: past_50[1],
      },
      window_dimensions: {
        width: width,
        height: height,
      },
    }
    if (
      ((typeof document !== 'undefined' &&
        document.cookie.match(
          /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
        )) || [, null])[1] != null
    ) {
      db?.accuracies.add(accuracy_item)
      fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection:
            typeof document !== 'undefined' &&
            document.cookie.match(
              /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
            )![1],
          document: 'accuracy-' + accuracy_item.timestamp,
          data: {
            session_id:
              typeof document !== 'undefined' &&
              document.cookie.match(
                /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
              )![1],
            timestamp_formatted: new Date(
              accuracy_item.timestamp,
            ).toLocaleString('es-ES', timeConfiguration),
            ...accuracy_item,
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
    }
    setRouteBack({
      ...routeBack,
      calibration: {
        ...routeBack.calibration,
        current: !routeBack.calibration.current,
      },
    })

    router.back()

    const webgazer = require('../javascript/webgazer')
    webgazer.setVideoViewerSize(160, 120)
    db?.eyegazes.clear()
    webgazer.setGazeListener(function (data: any, clock: any) {
      const date = Date.now()
      db?.eyegazes.add({
        session_id: ((typeof document !== 'undefined' &&
          document.cookie.match(
            /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
          )) || [, null])[1] as string | null,
        timestamp: date,
        timestamp_formatted: new Date(date).toLocaleString(
          'es-ES',
          timeConfiguration,
        ),
        x_screen_prediction: data['x'],
        y_screen_prediction: data['y'],
      })
    })
  }
  useEffect(() => {
    currentAction = router.query.action
    console.log('Weblogger: Current action: ' + currentAction)
    onLoad()
    if (focusedBookTab) {
      console.log('Weblogger: Can access booktab')
      db?.words.toArray().then((words) => {
        var points_aux: {
          top: string
          left: string
          width: string
          height: string
        }[] = []
        console.log('Weblogger: Number of words: ' + words.length)
        let y = words.map(({ y }) => y)
        const y_frequency = y.reduce((y_count: any, y_value) => {
          const count = y_count[y_value] || 0
          y_count[y_value] = count + 1
          return y_count
        }, {})
        console.log(
          'Weblogger: Number of words per line: ' + JSON.stringify(y_frequency),
        )
        let words_per_line = Object.keys(y_frequency).map(function (key) {
          return y_frequency[key]
        })
        let mean_words_per_line =
          words_per_line.reduce(function (sum: any, value: any) {
            return sum + value
          }, 0) / words_per_line.length
        console.log(
          'Weblogger: Mean number of words per line: ' +
            JSON.stringify(Math.floor(mean_words_per_line)),
        )
        const min_top = Math.min(...words.map(({ y }) => y))
        const min_left = Math.min(
          ...words.filter((word) => word.y == min_top).map(({ x }) => x),
        )
        let uniqueHeight = [...new Set(words.map(({ height }) => height))]
        let mean_height =
          uniqueHeight.reduce(function (sum, value) {
            return sum + value
          }, 0) / uniqueHeight.length
        console.log(
          'Weblogger: Mean word height: ' + JSON.stringify(mean_height),
        )
        var video_height_px = 240
        for (let top_coordinate in y_frequency) {
          console.log('Weblogger: Top coordinate: ' + top_coordinate)
          if (Number(top_coordinate) <= video_height_px + mean_height) {
            for (let k = 1; k <= 4; k++) {
              points_aux.push({
                top: top_coordinate + 'px',
                left: k != 4 ? 25 * k + 'vw' : '94vw',
                width: mean_height + 'px',
                height: mean_height + 'px',
              })
            }
          } else {
            for (let k = 1; k <= 5; k++) {
              points_aux.push({
                top: top_coordinate + 'px',
                left:
                  k != 1 && k != 5
                    ? 25 * (k - 1) + 'vw'
                    : k != 1
                    ? '94vw'
                    : '2vw',
                width: mean_height + 'px',
                height: mean_height + 'px',
              })
            }
          }
        }
        setLoading(false)
        setPoints({
          calibration: points_aux,
          start: {
            top: min_top + 'px',
            left: min_left - mean_height + 'px',
            height: mean_height + 'px',
            width: mean_height + 'px',
          },
        })
        console.log('Weblogger: Points: ' + JSON.stringify(points))
      })
    }
  }, [])
  useEffect(() => {
    console.log('Weblogger: Loading :' + loading)
    ClearCalibration()
    ClearCanvas()
  }, [loading])
  useEffect
  useEffect(() => {
    if (
      typeof document !== 'undefined' &&
      document.getElementById('webgazerVideoContainer') &&
      !styleVideo
    ) {
      console.log('Weblogger: Video has been loaded')
      document
        .getElementById('webgazerVideoContainer')!
        .style.setProperty('left', '0px !important')
      setStyleVideo(true)
    }
  })
  return (
    <>
      <Helmet>
        <script type="module" src="/javascript/webgazer.js"></script>
        <link
          rel="stylesheet"
          href="./node_modules/bootstrap/dist/css/bootstrap.min.css"
        ></link>
      </Helmet>
      <canvas
        id="plotting_canvas"
        width="500"
        ref={canvas_ref}
        height="500"
        //style={{ cursor: 'url(/icons/hammer-resized.png), auto' }}
      ></canvas>

      <script src="./node_modules/sweetalert/dist/sweetalert.min.js"></script>

      {false && (
        <nav
          id="webgazerNavbar"
          className="navbar navbar-expand-lg navbar-light bg-light"
        >
          <div className="container-fluid">
            <div id="Accuracy">
              <a className="navbar-brand h1 mb-0">Not yet Calibrated</a>
            </div>
            <button
              className="navbar-toggler"
              id="calibrationMenuToggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="navbar-collapse show" id="navbarSupportedContent">
              <ul className="navbar-nav me-auto mb-lg-0 mb-2">
                <li className="nav-item">
                  <a className="nav-link active" href="#" onClick={Restart}>
                    Recalibrate
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link active"
                    href="#"
                    onClick={() => {
                      const webgazer = require('../javascript/webgazer')
                      webgazer.applyKalmanFilter(
                        !webgazer.params.applyKalmanFilter,
                      )
                    }}
                  >
                    Toggle Kalman Filter
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link active"
                    href="#"
                    onClick={() => {
                      setShowHelpModal(true)
                    }}
                  >
                    Help
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      )}

      {!loading && (
        <>
          <img
            id="startTextMarker"
            src="/icons/right-arrow.png"
            alt="Start text position"
            style={{
              display: 'none',
              top: points!['start'].top,
              left: points!['start'].left,
              width: points!['start'].width,
              height: points!['start'].height,
              position: 'fixed',
            }}
          ></img>
          <div className="calibrationDiv">
            <input></input>
            <input type="button" id="PtPrecision" className="Calibration" />
            {
              //new Array(13).fill(0).map((item, index) => (
              points!['calibration'].map((item, index) => (
                <input
                  type="image"
                  src="/icons/digglet-hole.png"
                  className="Calibration"
                  style={{
                    cursor: 'url(/icons/hammer-resized.png), auto',
                    top: item['top'],
                    left: item['left'],
                    width: item['width'],
                    height: item['height'],
                  }}
                  id={'Pt' + (index + 1)}
                  onClick={(e) => {
                    calPointClick(e.currentTarget, calibration_callback)
                  }}
                />
              ))
            }
          </div>
        </>
      )}

      {showHelpModal && (
        <VideoModal
          modalId="helpModal"
          mediaURL="../videos/Intro-calibracion.mp4"
          onclick={() => {
            setShowHelpModal(false)
            ShowCalibrationPoint()
            console.log('Weblogger: Clicked to close modal')
          }}
          script={[['play/', '0:32']]}
          button_name="OK"
        ></VideoModal>
      )}

      {showPrecisionModal && (
        <VideoModal
          modalId="precisionModal"
          mediaURL="../videos/Precision.mp4"
          onclick={() => {
            setShowPrecisionModal(false)
            calcAccuracy(accuracy_callback)
          }}
          script={[['play/', '0:12']]}
          button_name="OK"
        ></VideoModal>
      )}

      {/* {showHelpModal && (
        <HelpModal
          modalId="helpModal"
          mediaURL="examples/calibration.png"
          onclickcancel={() => {
            setShowHelpModal(false)
            router.back()
          }}
          onclickcalibrate={() => {
            setShowHelpModal(false)
            Restart()
          }}
        />
      )} */}

      <Script
        src="/javascript/precision_store_points.js"
        strategy="afterInteractive"
      />

      <Script
        src="/javascript/precision_calculation.js"
        strategy="afterInteractive"
      />
      <Script src="/javascript/sweetalert.min.js" strategy="afterInteractive" />
      <Script src="/javascript/calibration.js" strategy="afterInteractive" />

      <Script src="/javascript/resize_canvas.js" strategy="afterInteractive" />
      <Script src="/javascript/main.js" strategy="afterInteractive" />
    </>
  )
}

CalibrationLegacy.getLayout = function getLayout(page) {
  return <>{page}</>
}

export default CalibrationLegacy

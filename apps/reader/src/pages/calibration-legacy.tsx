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
  initializePrecisionPoints,
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
    precision: { top: string; left: string; width: string; height: string }[]
    calibration: { top: string; left: string; width: string; height: string }[]
    start: { top: string; left: string; width: string; height: string }
  }>()
  const calcPeripheralPrecision = (
    precision_positions: Set<String>,
    calibration_positions: {
      top: number
      left: number
    }[],
  ) => {
    var lowest_top = Math.min.apply(
      null,
      calibration_positions.map((x) => x['top']),
    )
    var lowest_top_left = Math.min.apply(
      null,
      calibration_positions.map((x) => x['left']).filter((x) => lowest_top),
    )
    var lowest_top_right = Math.max.apply(
      null,
      calibration_positions.map((x) => x['left']).filter((x) => lowest_top),
    )
    var highest_top = Math.max.apply(
      null,
      calibration_positions.map((x) => x['top']),
    )
    var highest_top_left = Math.min.apply(
      null,
      calibration_positions.map((x) => x['left']).filter((x) => highest_top),
    )
    var highest_top_right = Math.max.apply(
      null,
      calibration_positions.map((x) => x['left']).filter((x) => highest_top),
    )
    precision_positions.add(lowest_top + 'px,' + lowest_top_left + 'px')
    precision_positions.add(lowest_top + 'px,' + lowest_top_right + 'px')
    precision_positions.add(highest_top + 'px,' + highest_top_left + 'px')
    precision_positions.add(highest_top + 'px,' + highest_top_right + 'px')
    console.log(precision_positions)
  }
  const calibration_callback = () => {
    setShowPrecisionModal(true)
  }
  const accuracy_callback = (
    accuracyInfo: {
      start_timestamp: number
      end_timestamp: number
      accuracy: number
      true_value: { x: number; y: number }
      predictions: {
        timestamp: number
        x_screen_prediction: number
        y_screen_prediction: number
      }[]
    }[],
  ) => {
    if (
      ((typeof document !== 'undefined' &&
        document.cookie.match(
          /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
        )) || [, null])[1] != null
    ) {
      var date = Date.now()
      db!.calibrationValidations.add({
        session_id:
          typeof document !== 'undefined' &&
          document.cookie.match(
            /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
          )![1],
        timestamp: date,
        timestamp_formatted: new Date(date).toLocaleString(
          'es-ES',
          timeConfiguration,
        ),
        window_dimensions: {
          width: width,
          height: height,
        },
        validations: accuracyInfo,
      })
      fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: 'calibration_information',
          document: 'calibration_' + date,
          data: {
            session_id:
              typeof document !== 'undefined' &&
              document.cookie.match(
                /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
              )![1],
            timestamp: date,
            timestamp_formatted: new Date(date).toLocaleString(
              'es-ES',
              timeConfiguration,
            ),
            window_dimensions: {
              width: width,
              height: height,
            },
            validations: accuracyInfo,
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
      if (data != null) {
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
      }
    })
  }

  useEffect(() => {
    currentAction = router.query.action
    console.log('Weblogger: Current action: ' + currentAction)
    onLoad()
    if (focusedBookTab) {
      console.log('Weblogger: Can access booktab')
      db?.words.toArray().then((words) => {
        var calibration_positions: {
          top: number
          left: number
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
        let video_width_px = 320
        var video_height_px = 240

        for (let top_coordinate in y_frequency) {
          console.log('Weblogger: Top coordinate: ' + top_coordinate)
          if (Number(top_coordinate) <= video_height_px + mean_height) {
            for (let k = 1; k <= eyeTracker.calibration_points_per_line; k++) {
              console.log('Weblogger: Point at video height')
              let left_position =
                video_width_px +
                k *
                  ((window.innerWidth - video_width_px) /
                    (eyeTracker.calibration_points_per_line + 1))
              console.log('Weblogger: Video width ' + video_width_px)
              console.log('Weblogger: Page width ' + window.innerWidth)
              console.log(
                'Weblogger: Distance factor ' +
                  (window.innerWidth - video_width_px) /
                    (eyeTracker.calibration_points_per_line + 1),
              )
              console.log('Weblogger: Left position ' + left_position)
              calibration_positions.push({
                top: Number(top_coordinate),
                left: left_position,
              })
            }
          } else {
            for (let k = 1; k <= eyeTracker.calibration_points_per_line; k++) {
              console.log('Weblogger: Point beyond video height')
              let left_position =
                k *
                (window.innerWidth /
                  (eyeTracker.calibration_points_per_line + 1))
              console.log('Weblogger: Video width ' + video_width_px)
              console.log('Weblogger: Page width ' + window.innerWidth)
              console.log(
                'Weblogger: Distance factor ' +
                  window.innerWidth /
                    (eyeTracker.calibration_points_per_line + 1),
              )
              console.log('Weblogger: Left position ' + left_position)
              calibration_positions.push({
                top: Number(top_coordinate),
                left: left_position,
              })
            }
          }
        }
        var points_aux_precision = new Set<string>()
        // Set precision points
        if (
          eyeTracker.validation_type == 'central' ||
          eyeTracker.validation_type == 'both'
        ) {
          points_aux_precision.add('50vh,50vw')
        }
        if (
          eyeTracker.validation_type == 'peripheral' ||
          eyeTracker.validation_type == 'both'
        ) {
          calcPeripheralPrecision(points_aux_precision, calibration_positions)
        }
        setLoading(false)
        setPoints({
          precision: [...points_aux_precision].map((item: any, index: any) => ({
            top: item.split(',')[0],
            left: item.split(',')[1],
            width: mean_height + 'px',
            height: mean_height + 'px',
          })),
          calibration: calibration_positions.map((item: any, index: any) => ({
            top: item['top'] + 'px',
            left: item['left'] + 'px',
            width: mean_height + 'px',
            height: mean_height + 'px',
          })),
          start: {
            top: min_top + 'px',
            left: min_left - mean_height + 'px',
            width: mean_height + 'px',
            height: mean_height + 'px',
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
            {
              //new Array(13).fill(0).map((item, index) => (
              points!['precision'].map((item, index) => (
                <input
                  type="image"
                  src="/icons/digglet-with-hole.png"
                  className="Precision"
                  style={{
                    top: item['top'],
                    left: item['left'],
                    width: item['width'],
                    height: item['height'],
                  }}
                  id={'PrecisionPt' + (index + 1)}
                />
              ))
            }
            {points!['calibration'].map((item, index) => (
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
                id={'CalibrationPt' + (index + 1)}
                onClick={(e) => {
                  calPointClick(e.currentTarget, calibration_callback)
                }}
              />
            ))}
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
            initializePrecisionPoints()
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

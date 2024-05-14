import { useBoolean } from '@literal-ui/hooks'
import clsx from 'clsx'

import { useLiveQuery } from 'dexie-react-hooks'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { ReactElement, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdCheckCircle,
  MdOutlineFileDownload,
  MdOutlineShare,
} from 'react-icons/md'
import { useSet } from 'react-use'
import { usePrevious } from 'react-use'

import {
  ReaderGridView,
  Button,
  TextField,
  DropZone,
  Layout,
} from '../components'
import { BookRecord, CoverRecord, db } from '../db'
import { addFile, fetchBook, handleFiles } from '../file'
import {
  useAction,
  useDisablePinchZooming,
  useLibrary,
  useMobile,
  useRemoteBooks,
  useRemoteFiles,
  useTranslation,
} from '../hooks'
import { BookTab, TimelineItem, reader, useReaderSnapshot } from '../models'
import { lock } from '../styles'
import { dbx, pack, uploadData } from '../sync'
import { copy, timeConfiguration } from '../utils'
import { NextPageWithLayout } from './_app'
import { dbf, initFirebase } from '../firebase/firebaseApp'
import { User, signInAnonymously } from 'firebase/auth'
import { RiCreativeCommonsSaLine } from 'react-icons/ri'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { doc, setDoc } from 'firebase/firestore'
import { IndexableType, Table } from 'dexie'
import useWindowDimensions from '../hooks/useWindowDimensions'
import {
  EyeTrackerState,
  RegressionType,
  useEyeTracker,
} from '../hooks/useEyeTracker'
import { useBackButton } from '../hooks/useBackButton'
import { useRouteHistory } from '../hooks/useRouteHistory'
import { useKeyDown } from '../hooks/useKeyDown'
import { useSelfReport } from '../hooks/useSelfReport'
import { PageType, routeBackState, useRouteBack } from '../hooks/useRouteBack'
import { useBookLocationCallback } from '../hooks/useLocation'
import { useSettings } from '../state'
import { useSessionID } from '../hooks/useSessionId'
// import html2canvas from 'html2canvas'

const placeholder = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="gray" fill-opacity="0" width="1" height="1"/></svg>`

const SOURCE = 'src'
const BOOK = 'book'

const Index: NextPageWithLayout = () => {
  const { focusedTab } = useReaderSnapshot()
  const { focusedBookTab } = useReaderSnapshot()
  const [eyeTracker] = useEyeTracker()
  const [selfReport] = useSelfReport()
  const [routeBack, setRouteBackState] = useRouteBack()
  const [keyDown] = useKeyDown()
  const [routeHistory, setRouteHistory] = useRouteHistory()
  const [bookLocationCallback, setBookLocationCallback] =
    useBookLocationCallback()
  const prevTitle = useRef<string | undefined>(focusedBookTab?.title)
  const prevEyeTracker = useRef<{
    state: EyeTrackerState
    kalmanFilter: boolean
    videoPreview: boolean
    regressionType: RegressionType
    showPredictions: boolean
    saveDataAcrossSessions: boolean
    page_calibration: boolean
  }>(eyeTracker)
  const router = useRouter()
  const src = new URL(window.location.href).searchParams.get(SOURCE)
  const [loading, setLoading] = useState(!!src)

  useDisablePinchZooming()

  useEffect(() => {
    let src = router.query[SOURCE]
    if (!src) return
    if (!Array.isArray(src)) src = [src]

    Promise.all(
      src.map((s) =>
        fetchBook(s).then((b) => {
          reader.addTab(b)
        }),
      ),
    ).finally(() => setLoading(false))
  }, [router.query])

  useEffect(() => {
    const handleRouteChange = (url: string, { shallow }: any) => {
      console.log(`Weblogger: ${typeof url}`)
      console.log(
        `Weblogger: App is changing to ${url} ${
          shallow ? 'with' : 'without'
        } shallow routing`,
      )
      setRouteHistory((routeHistory) => [...routeHistory, url])
    }

    router.events.on('routeChangeStart', handleRouteChange)

    // If the component is unmounted, unsubscribe
    // from the event with the `off` method:
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router])

  useEffect(() => {
    console.log(
      'Weblogger: Index Routing useEffect: ' +
        JSON.stringify(eyeTracker.state) +
        '". Document title: "' +
        focusedTab?.title +
        '". Prev Document title: "' +
        prevTitle.current +
        '". Route back: "' +
        JSON.stringify(routeBack),
    )
    const save_page_data = (
      param: boolean,
      prev_page_data: any,
      recalibrate: boolean,
    ) => {
      if (param) {
        if (Object.keys(prev_page_data).length != 0) {
          fetch('/api/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              collection: 'page_information',
              document: 'page_' + prev_page_data.start_timestamp,
              data: {
                session_id: document.cookie.match(
                  /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                )![1],
                ...prev_page_data,
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
        if (recalibrate) {
          router.push('/calibration-legacy')
        }
      }
    }
    const route_to_report_or_calibration = (
      route_to_report: boolean,
      route_to_calibration: boolean,
      when: string = 'beginning',
    ) => {
      if (
        route_to_report &&
        selfReport.show &&
        selfReport[('show_' + when) as 'show_beginning' | 'show_end']
      )
        if (when === 'beginning') {
          setBookLocationCallback({
            callback: () => {
              router.push({
                pathname: '/self-report',
                query: { when: when },
              })
            },
          })
        } else {
          router.push({
            pathname: '/self-report',
            query: { when: when },
          })
        }
      else if (route_to_calibration && eyeTracker.state == 'active') {
        setBookLocationCallback({
          callback: () => {
            router.push('/calibration-legacy')
          },
        })
      } else
        setBookLocationCallback({
          callback: (param: boolean, data: any) => {
            save_page_data(param, data, false)
          },
        })
    }
    //User has returned from a page
    if (
      Object.keys(routeBack).filter(function (key) {
        return (
          routeBack[key as PageType]['prev'] !=
          routeBack[key as PageType]['current']
        )
      }).length != 0
    ) {
      console.log('Weblogger: Index Routing entered if')
      if (routeBack.report.current != routeBack.report.prev) {
        //We have just come back from report page
        route_to_report_or_calibration(false, true)
        setRouteBackState({
          ...routeBack,
          report: {
            ...routeBack.report,
            prev: routeBack.report.current,
          },
        })
      } else {
        //We have come back from the calibration page
        setBookLocationCallback({
          callback: () => {
            if (eyeTracker.page_calibration) {
              setBookLocationCallback({
                callback: (param: boolean, data: any) => {
                  save_page_data(param, data, true)
                },
              })
            } else {
              setBookLocationCallback({
                callback: (param: boolean, data: any) => {
                  save_page_data(param, data, false)
                },
              })
            }
          },
        })
        setRouteBackState({
          ...routeBack,
          calibration: {
            ...routeBack.calibration,
            prev: routeBack.calibration.current,
          },
        })
      }
    } //We are not back from a page, title just changed
    else {
      console.log('Weblogger: Index Routing entered else ')
      // User has started reading
      if (prevTitle.current != focusedBookTab?.title && focusedBookTab?.title) {
        console.log('Weblogger: User has started reading')
        route_to_report_or_calibration(true, true, 'beginning')
      }
      // User has finished reading
      else if (
        prevTitle.current != focusedBookTab?.title &&
        !focusedBookTab?.title
      ) {
        console.log('Weblogger: User has started reading')
        route_to_report_or_calibration(true, false, 'end')
      }
      prevTitle.current = focusedBookTab?.title
    }
  }, [focusedBookTab?.title])

  /* useEffect(() => {
    if (
      eyeTracker.page_calibration == prevEyeTracker.current.page_calibration &&
      eyeTracker.state == 'active' &&
      eyeTracker.page_calibration
    ) {
      console.log('Weblogger: Index page calibration is active')
      if (
        focusedBookTab &&
        keyDown &&
        ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Space'].includes(
          keyDown.key!,
        ) &&
        Math.abs(keyDown.time! - focusedBookTab?.timeline[0]?.timestamp!) < 1000
      ) {
        console.log(
          'Weblogger: Index page calibration routing to calibration page',
        )
        router.push('/calibration-legacy')
      }
    }
  }, [focusedBookTab?.timeline]) */

  useEffect(() => {
    console.log('Weblogger: Title changed...')
  }, [focusedBookTab?.title])

  useEffect(() => {
    console.log(
      'Weblogger: Rendition Book location changed...' +
        JSON.stringify(bookLocationCallback),
    )
  }, [bookLocationCallback])

  /* useEffect(() => {
    console.log(
      'Weblogger: Index EyeTracker state: "' +
        JSON.stringify(eyeTracker) +
        '". Previous eyetracker state: "' +
        JSON.stringify(prevEyeTracker.current) +
        '". Route history: "' +
        JSON.stringify(routeHistory) +
        '". Previous title state: "' +
        prevTitle.current +
        '". Document title: "' +
        focusedTab?.title +
        '"' +
        ' . Key Code: ' +
        keyDown,
    )
    console.log('Weblogger: Executing eyeTracker useEffect')
    // We have returned from the calibration page (we don't want to calibrate again)
    if (
      !routeHistory.includes('/calibration-legacy') &&
      !routeHistory.includes('/self-report')
    ) {
      if (
        focusedBookTab?.title != prevTitle.current ||
        eyeTracker.state != prevEyeTracker.current.state
      ) {
        console.log('Weblogger: Index eyetracker or title has changed')
        if (eyeTracker.state == 'active') {
          //Trigger calibration only if the user is reading
          if (focusedBookTab) router.push('/calibration-legacy')
        }
      }
      //Timeline is the only one that can be triggering the change (We have changed page)
      else {
        console.log('Weblogger: Index page calibration or keyDown has changed')
        if (
          eyeTracker.page_calibration ==
            prevEyeTracker.current.page_calibration &&
          eyeTracker.state == 'active' &&
          eyeTracker.page_calibration
        ) {
          console.log('Weblogger: Index page calibration is active')
          if (
            focusedBookTab &&
            keyDown &&
            [
              'ArrowLeft',
              'ArrowUp',
              'ArrowRight',
              'ArrowDown',
              'Space',
            ].includes(keyDown.key!) &&
            Math.abs(keyDown.time! - focusedBookTab?.timeline[0]?.timestamp!) <
              1000
          )
            router.push('/calibration-legacy')
        }
      }
      prevTitle.current = focusedBookTab?.title
      prevEyeTracker.current = eyeTracker
    } else setRouteHistory([])
  }, [
    eyeTracker,
    focusedBookTab?.title,
    routeHistory,
    focusedBookTab?.timeline,
  ]) */

  useEffect(() => {
    if ('launchQueue' in window && 'LaunchParams' in window) {
      window.launchQueue.setConsumer((params) => {
        console.log('launchQueue', params)
        if (params.files.length) {
          Promise.all(params.files.map((f) => f.getFile()))
            .then((files) => handleFiles(files))
            .then((books) => books.forEach((b) => reader.addTab(b)))
        }
      })
    }
  }, [])

  useEffect(() => {
    router.beforePopState(({ url }) => {
      if (url === '/') {
        reader.clear()
      }
      return true
    })
  }, [router])

  return (
    <>
      <Head>
        {/* https://github.com/microsoft/vscode/blob/36fdf6b697cba431beb6e391b5a8c5f3606975a1/src/vs/code/browser/workbench/workbench.html#L16 */}
        {/* Disable pinch zooming */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <title>{focusedTab?.title ?? 'Flow'}</title>
      </Head>
      <ReaderGridView />
      {loading || <Library />}
    </>
  )
}

Index.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>
}

const Library: React.FC = () => {
  const app = initFirebase()

  const router = useRouter()
  const books = useLibrary()
  const covers = useLiveQuery(() => db?.covers.toArray() ?? [])
  const t = useTranslation('home')

  const { data: remoteBooks, mutate: mutateRemoteBooks } = useRemoteBooks()
  const { data: remoteFiles, mutate: mutateRemoteFiles } = useRemoteFiles()
  const [sessionID, setSessionID] = useSessionID()
  const previousRemoteBooks = usePrevious(remoteBooks)
  const previousRemoteFiles = usePrevious(remoteFiles)
  const [selfReport] = useSelfReport()
  const [eyeTracker] = useEyeTracker()
  const [settings, setSettings] = useSettings()

  const [select, toggleSelect] = useBoolean(false)
  const [selectedBookIds, { add, has, toggle, reset }] = useSet<string>()
  const [loading, setLoading] = useState<string | undefined>()
  const [readyToSync, setReadyToSync] = useState(false)

  const { groups } = useReaderSnapshot()

  useEffect(() => {
    if (previousRemoteFiles && remoteFiles) {
      // to remove effect dependency `books`
      db?.books.toArray().then((books) => {
        if (books.length === 0) return

        const newRemoteBooks = remoteFiles.map((f) =>
          books.find((b) => b.name === f.name),
        ) as BookRecord[]

        uploadData(newRemoteBooks)
        mutateRemoteBooks(newRemoteBooks, { revalidate: false })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutateRemoteBooks, remoteFiles])

  useEffect(() => {
    if (!previousRemoteBooks && remoteBooks) {
      db?.books.bulkPut(remoteBooks).then(() => setReadyToSync(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteBooks])

  useEffect(() => {
    if (!remoteFiles || !readyToSync) return

    db?.books.toArray().then(async (books) => {
      for (const remoteFile of remoteFiles) {
        const book = books.find((b) => b.name === remoteFile.name)
        if (!book) continue

        const file = await db?.files.get(book.id)
        if (file) continue

        setLoading(book.id)
        await dbx
          .filesDownload({ path: `/files/${remoteFile.name}` })
          .then((d) => {
            const blob: Blob = (d.result as any).fileBlob
            return addFile(book.id, new File([blob], book.name))
          })
        setLoading(undefined)
      }
    })
  }, [readyToSync, remoteFiles])

  useEffect(() => {
    if (!select) reset()
  }, [reset, select])

  useEffect(() => {
    db?.tables.forEach(function (table) {
      console.log('Weblogger: Table ' + table.name)
    })
    db?.accuracies.toArray().then((value) => {
      console.log('Weblogger: Accuracy Record: ' + value.length)
    })
    if (!remoteFiles || !readyToSync) return
    console.log('Weblogger: Entered Library method')
    let id = router.query[BOOK]
    if (!id) return
    console.log('Weblogger: Book ID identified!')
    db?.books.toArray().then((books) => {
      const book = books.find((b) => b.id === id)
      if (book) reader.addTab(book)
    })
  }, [])

  if (groups.length) return null
  if (!books) return null

  const selectedBooks = [...selectedBookIds].map(
    (id) => books.find((b) => b.id === id)!,
  )
  const allSelected = selectedBookIds.size === books.length

  return (
    <>
      <div
        id="authenticationDiv"
        className="d-grid d-md-flex justify-content-md-end gap-2 p-4"
      >
        {!sessionID && (
          <button
            className="typescale-label-large disabled:bg-disabled disabled:text-on-disabled bg-primary-container text-on-primary-container relative px-3 py-1.5"
            onClick={() => {
              const date = Date.now()
              document.cookie = 'readerID=' + uuidv4()
              console.log(
                'Weblogger: Cookie created succesfully: Reader ID ' +
                  (document.cookie.match(
                    /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                  ) || [, null])[1],
              )
              setSessionID(
                (document.cookie.match(
                  /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                ) || [, ''])[1],
              )
              db?.books.toArray().then((books: BookRecord[]) => {
                var books_info: any = []
                if (books.length != 0) {
                  books_info = books.map(function (x) {
                    const data = {
                      name: x.name,
                      cfi: x.cfi,
                      typography: x.configuration?.typography,
                    }
                    return data
                  })
                }
                console.log('Weblogger: Activity config: Sending data')
                db?.readers
                  .orderBy('timestamp')
                  .last()
                  .then((result) => {
                    fetch('/api/data', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        collection: 'activity_information',
                        document: document.cookie.match(
                          /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                        )![1],
                        data: {
                          start_timestamp_formatted: new Date(
                            date,
                          ).toLocaleString('es-ES', timeConfiguration),
                          start_timestamp: date,
                          end_timestamp_formatted: new Date(
                            date,
                          ).toLocaleString('es-ES', timeConfiguration),
                          end_timestamp: date,
                          self_report: selfReport,
                          eyetracking: eyeTracker,
                          settings: settings,
                          book_setings:
                            books_info.length == 0 ? [] : books_info,
                          participant_id: result ? result.participant_id : -1,
                          session_id: document.cookie.match(
                            /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                          )![1],
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
                  })
              })
            }}
          >
            {t('start_reading')}
          </button>
        )}
        {sessionID && (
          <>
            <button
              className="typescale-label-large disabled:bg-disabled disabled:text-on-disabled bg-primary-container text-on-primary-container relative px-3 py-1.5"
              disabled={true}
            >
              {sessionID}
            </button>
            <button
              className="typescale-label-large disabled:bg-disabled disabled:text-on-disabled bg-primary-container text-on-primary-container relative px-3 py-1.5"
              onClick={() => {
                const date = Date.now()
                fetch('/api/data', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    collection: 'activity_information',
                    document: document.cookie.match(
                      /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                    )![1],
                    data: {
                      end_timestamp_formatted: new Date(date).toLocaleString(
                        'es-ES',
                        timeConfiguration,
                      ),
                      end_timestamp: date,
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
                document.cookie = 'readerID=' + ';max-age=-1'
                console.log(
                  'Weblogger: Cookie deleted succesfully: Reader ID ' +
                    (document.cookie.match(
                      /^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/,
                    ) || [, null])[1],
                )
                db?.eyegazes.clear()
                db?.words.clear()
                db?.accuracies.clear()
                db?.timelines.clear()
                setSessionID('')
              }}
            >
              {t('finish_reading')}
            </button>
          </>
        )}
      </div>
      <DropZone
        className="scroll-parent h-full p-4"
        onDrop={(e) => {
          const bookId = e.dataTransfer.getData('text/plain')
          const book = books.find((b) => b.id === bookId)
          if (book) reader.addTab(book)

          handleFiles(e.dataTransfer.files)
        }}
      >
        <div className="mb-4 space-y-2.5">
          <div>
            <TextField
              name={SOURCE}
              placeholder="https://link.to/remote.epub"
              type="url"
              hideLabel
              actions={[
                {
                  title: t('share'),
                  Icon: MdOutlineShare,
                  onClick(el) {
                    if (el?.reportValidity()) {
                      copy(`${window.location.origin}/?${SOURCE}=${el.value}`)
                    }
                  },
                },
                {
                  title: t('download'),
                  Icon: MdOutlineFileDownload,
                  onClick(el) {
                    if (el?.reportValidity()) fetchBook(el.value)
                  },
                },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-x-2">
              {books.length ? (
                <Button variant="secondary" onClick={toggleSelect}>
                  {t(select ? 'cancel' : 'select')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={!books}
                  onClick={() => {
                    fetchBook(
                      'https://epubtest.org/books/Fundamental-Accessibility-Tests-Basic-Functionality-v1.0.0.epub',
                    )
                  }}
                >
                  {t('download_sample_book')}
                </Button>
              )}
              {select &&
                (allSelected ? (
                  <Button variant="secondary" onClick={reset}>
                    {t('deselect_all')}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => books.forEach((b) => add(b.id))}
                  >
                    {t('select_all')}
                  </Button>
                ))}
            </div>

            <div className="space-x-2">
              {select ? (
                <>
                  <Button
                    onClick={async () => {
                      toggleSelect()

                      for (const book of selectedBooks) {
                        const remoteFile = remoteFiles?.find(
                          (f) => f.name === book.name,
                        )
                        if (remoteFile) continue

                        const file = await db?.files.get(book.id)
                        if (!file) continue

                        setLoading(book.id)
                        await dbx.filesUpload({
                          path: `/files/${book.name}`,
                          contents: file.file,
                        })
                        setLoading(undefined)

                        mutateRemoteFiles()
                      }
                    }}
                  >
                    {t('upload')}
                  </Button>
                  <Button
                    onClick={async () => {
                      toggleSelect()
                      const bookIds = [...selectedBookIds]

                      db?.books.bulkDelete(bookIds)
                      db?.covers.bulkDelete(bookIds)
                      db?.files.bulkDelete(bookIds)

                      // folder data is not updated after `filesDeleteBatch`
                      mutateRemoteFiles(
                        async (data) => {
                          await dbx.filesDeleteBatch({
                            entries: selectedBooks.map((b) => ({
                              path: `/files/${b.name}`,
                            })),
                          })
                          return data?.filter(
                            (f) =>
                              !selectedBooks.find((b) => b.name === f.name),
                          )
                        },
                        { revalidate: false },
                      )
                    }}
                  >
                    {t('delete')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={!books.length}
                    onClick={pack}
                  >
                    {t('export')}
                  </Button>
                  <Button className="relative">
                    <input
                      type="file"
                      accept="application/epub+zip,application/epub,application/zip"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        const files = e.target.files
                        if (files) handleFiles(files)
                      }}
                    />
                    {t('import')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="scroll h-full">
          <ul
            className="grid"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(calc(80px + 3vw), 1fr))`,
              columnGap: lock(16, 32),
              rowGap: lock(24, 40),
            }}
          >
            {books.map((book) => (
              <Book
                key={book.id}
                book={book}
                covers={covers}
                select={select}
                selected={has(book.id)}
                loading={loading === book.id}
                toggle={toggle}
              />
            ))}
          </ul>
        </div>
      </DropZone>
    </>
  )
}

interface BookProps {
  book: BookRecord
  covers?: CoverRecord[]
  select?: boolean
  selected?: boolean
  loading?: boolean
  toggle: (id: string) => void
}
const Book: React.FC<BookProps> = ({
  book,
  covers,
  select,
  selected,
  loading,
  toggle,
}) => {
  const remoteFiles = useRemoteFiles()
  const [eyeTracker] = useEyeTracker()
  const router = useRouter()
  const mobile = useMobile()

  const cover = covers?.find((c) => c.id === book.id)?.cover
  const remoteFile = remoteFiles.data?.find((f) => f.name === book.name)

  const Icon = selected ? MdCheckBox : MdCheckBoxOutlineBlank

  return (
    <div className="relative flex flex-col">
      <div
        role="button"
        className="border-inverse-on-surface relative border"
        onClick={async () => {
          if (select) {
            toggle(book.id)
          } else {
            if (mobile) await router.push('/_')
            router.push({
              ...router,
              query: {
                ...router.query,
                [BOOK]: book.id,
              },
            })
            reader.addTab(book)
          }
        }}
      >
        <div
          className={clsx(
            'absolute bottom-0 h-1 bg-blue-500',
            loading && 'progress-bit w-[5%]',
          )}
        />
        {book.percentage !== undefined && (
          <div className="typescale-body-large absolute right-0 bg-gray-500/60 px-2 text-gray-100">
            {(book.percentage * 100).toFixed()}%
          </div>
        )}
        <img
          src={cover ?? placeholder}
          alt="Cover"
          className="mx-auto aspect-[9/12] object-cover"
          draggable={false}
        />
        {select && (
          <div className="absolute bottom-1 right-1">
            <Icon
              size={24}
              className={clsx(
                '-m-1',
                selected ? 'text-tertiary' : 'text-outline',
              )}
            />
          </div>
        )}
      </div>

      <div
        className="line-clamp-2 text-on-surface-variant typescale-body-small lg:typescale-body-medium mt-2 w-full"
        title={book.name}
      >
        <MdCheckCircle
          className={clsx(
            'mr-1 mb-0.5 inline',
            remoteFile ? 'text-tertiary' : 'text-surface-variant',
          )}
          size={16}
        />
        {book.name}
      </div>
    </div>
  )
}

export default Index

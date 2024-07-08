import { Dialog, Transition } from '@headlessui/react'
import React, { Fragment, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface VideoModalProps {
  modalId: string
  mediaURL: string
  script: [string, string][]
  onclick: () => void
  button_name: string
}

export const VideoModal = ({
  modalId,
  mediaURL,
  onclick,
  script,
  button_name,
}: VideoModalProps) => {
  let [isOpen, setIsOpen] = useState(true)
  let iframeRef = useRef(null)
  const vidRef = useRef<any>(null)

  const onLoad = async () => {
    console.log('Weblogger: Dialog loaded')
    const Player = (await import('liqvid')).Player
    const Script = (await import('liqvid')).Script
    const Video = (await import('liqvid')).Video
    const handlePlayVideo = () => {
      vidRef.current!.playback.pause()
    }
    createRoot(
      document.querySelector('iframe')!.contentDocument!.querySelector('main')!,
    ).render(
      <Player id="myPlayer" ref={vidRef} script={new Script(script)}>
        <Video id="myVideo" style={{ aspectRatio: '16/10', width: '100%' }}>
          <source src={mediaURL} type="video/mp4" />
        </Video>
        <div
          id="button-div"
          style={{
            width: '100%',
            position: 'absolute',
            top: '85%',
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: '15px',
            paddingRight: '15px',
          }}
        >
          <button
            className="btn btn-primary"
            style={{
              fontFamily: 'cursive',
              fontSize: '20px',
            }}
            onClick={() => {
              console.log('Weblogger: Clicked in button')
              handlePlayVideo()
              setIsOpen(false)
              onclick()
            }}
          >
            {button_name}
          </button>
        </div>
      </Player>,
    )
  }

  useEffect(() => {
    console.log('Weblogger: Iframe fuction has been loaded')
    console.log('Weblogger: iframe ID ' + document.querySelector('iframe')!.id)
  }, [])

  return (
    <Dialog
      onLoad={async () => {
        console.log('Weblogger: Dialog loaded')
        const Player = (await import('liqvid')).Player
        const Script = (await import('liqvid')).Script
        const Video = (await import('liqvid')).Video
        const handlePlayVideo = () => {
          vidRef.current!.playback.pause()
        }
        const element = document.querySelector(
          '#helpIframe',
        ) as HTMLIFrameElement
        createRoot(element!.contentDocument!.querySelector('main')!).render(
          <Player id="myPlayer" ref={vidRef} script={new Script(script)}>
            <Video id="myVideo" style={{ aspectRatio: '16/10', width: '100%' }}>
              <source src={mediaURL} type="video/mp4" />
            </Video>
            <div
              id="button-div"
              style={{
                width: '100%',
                position: 'absolute',
                top: '85%',
                display: 'flex',
                justifyContent: 'center',
                paddingLeft: '15px',
                paddingRight: '15px',
              }}
            >
              <button
                className="btn btn-primary"
                style={{
                  fontFamily: 'cursive',
                  fontSize: '20px',
                }}
                onClick={() => {
                  console.log('Weblogger: Clicked in button')
                  handlePlayVideo()
                  setIsOpen(false)
                  onclick()
                }}
              >
                {button_name}
              </button>
            </div>
          </Player>,
        )
      }}
      open={isOpen}
      id={modalId}
      initialFocus={iframeRef}
      onClose={() => {}}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <div className="video-container">
          <div className="aspect-ratio" style={{ paddingBottom: '62.5%' }}>
            <iframe
              id="helpIframe"
              ref={iframeRef}
              src="html/liqvid-video.html"
            ></iframe>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

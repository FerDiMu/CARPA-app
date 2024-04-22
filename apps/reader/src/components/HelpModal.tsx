import { Dialog } from '@headlessui/react'
import React, { useRef, useState } from 'react'

interface HelpModalProps {
  modalId: string
  onclickcalibrate: () => void
  onclickcancel: () => void
  mediaURL: string
}
export const HelpModal = ({
  modalId,
  onclickcancel,
  onclickcalibrate,
  mediaURL,
}: HelpModalProps) => {
  let [isOpen, setIsOpen] = useState(true)
  let imageRef = useRef(null)
  return (
    <Dialog
      open={isOpen}
      id={modalId}
      initialFocus={imageRef}
      onClose={() => {}}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">WebGazer instructions</h5>
            </div>
            <div className="modal-body">
              <img
                src={mediaURL}
                ref={imageRef}
                width="100%"
                height="100%"
                alt="webgazer demo instructions"
              ></img>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onclickcancel}>
                {' '}
                Close & load saved model{' '}
              </button>
              <button className="btn btn-primary" onClick={onclickcalibrate}>
                Calibrate
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

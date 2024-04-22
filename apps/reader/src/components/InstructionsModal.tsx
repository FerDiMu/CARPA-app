import { Dialog } from '@headlessui/react'
import React, { useRef, useState } from 'react'

interface InstructionsModalProps {
  onclick: () => void
}
export const InstructionsModal = ({ onclick }: InstructionsModalProps) => {
  let [isOpen, setIsOpen] = useState(true)
  let textRef = useRef(null)
  return (
    <Dialog
      open={isOpen}
      initialFocus={textRef}
      onClose={() => {
        setIsOpen(false)
      }}
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
              <h5 className="modal-title">Calibration instructions</h5>
            </div>
            <div className="modal-body">
              <p ref={textRef}>
                "Please click on each of the 9 points on the screen. You must
                click on each point 5 times till it goes yellow. This will
                calibrate your eye movements."
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary"> Cancel </button>
              <button className="btn btn-primary" onClick={onclick}>
                Confirm
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

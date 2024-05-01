import { MdAdd, MdRemove } from 'react-icons/md'

import { TextField, TextFieldProps } from '../Form'
import { PaneViewProps, PaneView, Pane } from '../base'
import { useTranslation } from '@flow/reader/hooks'
import { db } from '@flow/reader/db'
import { useEffect, useRef, useState } from 'react'

export const ReaderInformationView: React.FC<PaneViewProps> = (props) => {
  const t = useTranslation('reader-info')

  const [participant_number, setParticipantNumber] = useState<
    number | undefined
  >(-1)

  useEffect(() => {
    db?.readers
      .orderBy('timestamp')
      .last()
      .then((result) => {
        if (result) setParticipantNumber(result.participant_id)
      })
  }, [])

  return (
    <PaneView {...props}>
      <Pane headline={t('trial')} className="space-y-3 px-5 pt-2 pb-4">
        <NumberField
          name={t('participant-number')}
          key={participant_number}
          min={-1}
          max={3000}
          defaultValue={participant_number}
          onChange={(v) => {
            db?.readers.add({ participant_id: v, timestamp: Date.now() })
          }}
        />
      </Pane>
    </PaneView>
  )
}

interface NumberFieldProps extends Omit<TextFieldProps<'input'>, 'onChange'> {
  onChange: (v?: number) => void
}
const NumberField: React.FC<NumberFieldProps> = ({ onChange, ...props }) => {
  const ref = useRef<HTMLInputElement>(null)
  const t = useTranslation('action')

  return (
    <TextField
      as="input"
      type="number"
      placeholder="default"
      actions={[
        {
          title: t('step_down'),
          Icon: MdRemove,
          onClick: () => {
            if (!ref.current) return
            ref.current.stepDown()
            onChange(Number(ref.current.value))
          },
        },
        {
          title: t('step_up'),
          Icon: MdAdd,
          onClick: () => {
            if (!ref.current) return
            ref.current.stepUp()
            onChange(Number(ref.current.value))
          },
        },
      ]}
      mRef={ref}
      // lazy render
      onBlur={(e) => {
        onChange(Number(e.target.value))
      }}
      onClear={() => {
        if (ref.current) ref.current.value = ''
        onChange(undefined)
      }}
      {...props}
    />
  )
}

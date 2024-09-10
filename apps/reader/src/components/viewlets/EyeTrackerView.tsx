import { Pane, PaneView, PaneViewProps } from '../base'
import { useTranslation } from '@flow/reader/hooks'
import { Checkbox, Select, TextField, TextFieldProps } from '../Form'
import {
  RegressionType,
  ValidationType,
  useEyeTracker,
} from '@flow/reader/hooks/useEyeTracker'
import { useRef } from 'react'
import { MdAdd, MdRemove } from 'react-icons/md'

export const EyeTrackerView: React.FC<PaneViewProps> = (props) => {
  const t = useTranslation('eyetracker')
  const [eyeTracker, setEyeTracker] = useEyeTracker()
  const webgazer = require('../../javascript/webgazer')

  return (
    <PaneView {...props}>
      <Pane headline={t('general_params')} className="space-y-3 px-5 pt-2 pb-4">
        <Checkbox
          name={t('activate')}
          defaultChecked={eyeTracker.state == 'active' ? true : false}
          onClick={(e) => {
            if (e.currentTarget.checked) {
              const init_func = async () => {
                if (eyeTracker.state == 'inactive') {
                  setEyeTracker({ ...eyeTracker, state: 'active' })
                  await webgazer.begin()
                } else {
                  setEyeTracker({ ...eyeTracker, state: 'active' })
                  await webgazer.resume()
                }
                webgazer
                  .applyKalmanFilter(eyeTracker.kalmanFilter)
                  .setRegression(eyeTracker.regressionType)
                  .saveDataAcrossSessions(eyeTracker.saveDataAcrossSessions)
                  .showVideoPreview(eyeTracker.videoPreview)
                  .showPredictionPoints(eyeTracker.showPredictions)
                if (eyeTracker.videoPreview) {
                  document
                    .getElementById('webgazerVideoContainer')!
                    .style.removeProperty('left')
                  webgazer.setVideoViewerSize(160, 120)
                }
              }
              init_func()
            } else {
              webgazer.pause()
              setEyeTracker({ ...eyeTracker, state: 'paused' })
              webgazer.showVideoPreview(false).showPredictionPoints(false)
            }
            console.log('Weblogger: Eyetracker state: ' + eyeTracker.state)
          }}
        />
      </Pane>
      <Pane
        headline={t('calibration_params')}
        className="space-y-3 px-5 pt-2 pb-4"
      >
        <Checkbox
          name={t('page_calibration')}
          defaultChecked={eyeTracker.page_calibration}
          onClick={(e) => {
            setEyeTracker({
              ...eyeTracker,
              page_calibration: e.currentTarget.checked,
            })
          }}
        />
        <NumberField
          name={t('calibration-points-per-line')}
          min={1}
          max={5}
          defaultValue={eyeTracker.calibration_points_per_line}
          onChange={(v) => {
            setEyeTracker({
              ...eyeTracker,
              calibration_points_per_line: v!,
            })
          }}
        />
        <Select
          name={t('validation_procedure')}
          value={eyeTracker.validation_type}
          onChange={(e) => {
            setEyeTracker({
              ...eyeTracker,
              validation_type: e.target.value as ValidationType,
            })
          }}
        >
          <option value={'central'}>{t('central')}</option>
          <option value={'peripheral'}>{t('peripheral')}</option>
          <option value={'both'}>{t('both')}</option>
        </Select>
      </Pane>
      <Pane
        headline={t('specific_params')}
        className="space-y-3 px-5 pt-2 pb-4"
      >
        <Select
          name={t('regression_type')}
          value={eyeTracker.regressionType}
          onChange={(e) => {
            setEyeTracker({
              ...eyeTracker,
              regressionType: e.target.value as RegressionType,
            })
            webgazer.setRegression(e.target.value)
          }}
        >
          <option value={'ridge'}>{t('ridge')}</option>
          <option value={'weightedRidge'}>{t('weightedRidge')}</option>
          <option value={'threadedRidge'}>{t('threadedRidge')}</option>
        </Select>
        <Checkbox
          name={t('kalman_filter')}
          defaultChecked={eyeTracker.kalmanFilter}
          onClick={(e) => {
            setEyeTracker({
              ...eyeTracker,
              kalmanFilter: e.currentTarget.checked,
            })
            webgazer.applyKalmanFilter(e.currentTarget.checked)
          }}
        />
        <Checkbox
          name={t('show_video')}
          defaultChecked={eyeTracker.videoPreview}
          onClick={(e) => {
            setEyeTracker({
              ...eyeTracker,
              videoPreview: e.currentTarget.checked,
            })
            webgazer.showVideoPreview(e.currentTarget.checked)
            if (e.currentTarget.checked) {
              document
                .getElementById('webgazerVideoContainer')!
                .style.removeProperty('left')
              webgazer.setVideoViewerSize(160, 120)
            }
          }}
        />
        <Checkbox
          name={t('show_predictions')}
          defaultChecked={eyeTracker.showPredictions}
          onClick={(e) => {
            setEyeTracker({
              ...eyeTracker,
              showPredictions: e.currentTarget.checked,
            })
            webgazer.showPredictionPoints(e.currentTarget.checked)
          }}
        />
        <Checkbox
          name={t('save_data')}
          defaultChecked={eyeTracker.saveDataAcrossSessions}
          onClick={(e) => {
            setEyeTracker({
              ...eyeTracker,
              saveDataAcrossSessions: e.currentTarget.checked,
            })
            webgazer.saveDataAcrossSessions(e.currentTarget.checked)
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

import { Pane, PaneView, PaneViewProps } from '../base'
import { useTranslation } from '@flow/reader/hooks'
import { Checkbox, Select } from '../Form'
import { useSelfReport } from '@flow/reader/hooks/useSelfReport'

export const SelfReportView: React.FC<PaneViewProps> = (props) => {
  const t = useTranslation('self-report')
  const [selfReport, setSelfReport] = useSelfReport()

  return (
    <PaneView {...props}>
      <Pane headline={t('general_params')} className="space-y-3 px-5 pt-2 pb-4">
        <Checkbox
          name={t('activate')}
          defaultChecked={selfReport.show}
          onClick={(e) => {
            setSelfReport({
              ...selfReport,
              show: e.currentTarget.checked,
            })
          }}
        />
        {selfReport.show && (
          <>
            <Checkbox
              name={t('show-beginning')}
              checked={selfReport.show_beginning}
              onClick={(e) => {
                if (!e.currentTarget.checked && !selfReport.show_end) {
                  console.log(
                    'Weblogger: Clicked to disable show beginning when show end was already disabled',
                  )
                  setSelfReport({
                    ...selfReport,
                    show_beginning: e.currentTarget.checked,
                    show_end: true,
                  })
                } else {
                  setSelfReport({
                    ...selfReport,
                    show_beginning: e.currentTarget.checked,
                  })
                }
              }}
            />
            <Checkbox
              name={t('show-end')}
              checked={selfReport.show_end}
              onClick={(e) => {
                if (!e.currentTarget.checked && !selfReport.show_beginning) {
                  console.log(
                    'Weblogger: Clicked to disable show end when show beginning was alredy disabled',
                  )
                  setSelfReport({
                    ...selfReport,
                    show_beginning: true,
                    show_end: e.currentTarget.checked,
                  })
                } else {
                  setSelfReport({
                    ...selfReport,
                    show_end: e.currentTarget.checked,
                  })
                }
              }}
            />
          </>
        )}
      </Pane>
      <Pane headline={t('sections')} className="space-y-3 px-5 pt-2 pb-4">
        {Object.keys(selfReport.sections).map((value) => {
          var show = false
          for (let i = 0; i < selfReport.sections[value]!.when.length; i++) {
            if (
              selfReport.show &&
              selfReport[
                ('show_' + selfReport.sections[value]!.when[i]) as
                  | 'show_beginning'
                  | 'show_end'
              ]
            ) {
              show = true
            }
          }
          if (show) {
            return (
              <Checkbox
                name={t(value)}
                defaultChecked={selfReport.sections[value]!.show}
                onClick={(e) => {
                  setSelfReport({
                    ...selfReport,
                    sections: {
                      ...selfReport.sections,
                      [value]: {
                        ...selfReport.sections[value]!,
                        show: e.currentTarget.checked,
                      },
                    },
                  })
                }}
              />
            )
          } else {
            return
          }
        })}
      </Pane>
    </PaneView>
  )
}

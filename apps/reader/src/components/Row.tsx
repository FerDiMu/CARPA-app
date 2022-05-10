import { StateLayer } from '@literal-ui/core'
import clsx from 'clsx'
import { ComponentProps, useEffect, useRef } from 'react'
import { MdExpandMore, MdChevronRight } from 'react-icons/md'

interface RowProps extends ComponentProps<'div'> {
  expanded?: boolean
  active?: boolean
  depth?: number
  subitems?: Readonly<any[]>
  toggle?: () => void
  onActivate?: () => void
}
export const Row: React.FC<RowProps> = ({
  title,
  expanded = false,
  active = false,
  depth = 0,
  subitems,
  toggle,
  onActivate,
  className,
  children,
  ...props
}) => {
  const onActivateRef = useRef(onActivate)
  onActivateRef.current = onActivate

  const isLeaf = !subitems || !subitems.length
  const Icon = expanded ? MdExpandMore : MdChevronRight

  useEffect(() => {
    if (active) onActivateRef.current?.()
  }, [active])

  return (
    <div
      className={clsx(
        'relative flex cursor-pointer items-center py-0.5 pr-3 text-left',
        active && 'bg-outline/20',
        className,
      )}
      style={{ paddingLeft: depth * 8 }}
      title={title}
      {...props}
    >
      <StateLayer />
      <Icon
        size={20}
        className={clsx('text-outline shrink-0', isLeaf && 'invisible')}
        onClick={(e) => {
          e.stopPropagation()
          toggle?.()
        }}
      />
      <div className="typescale-body-small text-on-surface-variant truncate">
        {children || title}
      </div>
    </div>
  )
}

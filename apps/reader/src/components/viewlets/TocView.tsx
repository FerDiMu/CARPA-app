import { StateLayer } from '@literal-ui/core'
import { useSnapshot } from 'valtio'

import { useLibrary, useList } from '@ink/reader/hooks'
import { ReaderTab } from '@ink/reader/models'

import { reader } from '../Reader'
import { Row } from '../Row'

import { Pane } from './Pane'
import { View, ViewProps } from './View'

export const TocView: React.FC<ViewProps> = (props) => {
  return (
    <View {...props}>
      <LibraryPane />
      <TocPane />
    </View>
  )
}

const LibraryPane: React.FC = () => {
  const books = useLibrary()
  return (
    <Pane headline="library" shrinkThreshold={6}>
      {books?.map((book) => (
        <button
          key={book.id}
          className="relative w-full truncate px-5 py-1 text-left"
          title={book.name}
          draggable
          onClick={() => reader.addTab(book)}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', book.id)
          }}
        >
          <StateLayer />
          {book.name}
        </button>
      ))}
    </Pane>
  )
}

const TocPane: React.FC = () => {
  const { focusedTab } = useSnapshot(reader)
  const { outerRef, innerRef, items, scrollToItem } = useList(focusedTab?.toc)

  return (
    <Pane headline="toc" ref={outerRef}>
      <div ref={innerRef}>
        {items.map(({ index }) => (
          <TocRow
            key={index}
            index={index}
            tab={reader.focusedTab}
            onActivate={() => scrollToItem(index)}
          />
        ))}
      </div>
    </Pane>
  )
}

interface TocRowProps {
  tab?: ReaderTab
  index: number
  onActivate: () => void
}
const TocRow: React.FC<TocRowProps> = ({ tab, index, onActivate }) => {
  const item = tab?.toc[index]
  if (!item) return null
  const { label, subitems, depth, expanded, id, href } = item

  return (
    <Row
      title={label.trim()}
      depth={depth}
      active={tab.location?.start.href === href}
      expanded={expanded}
      subitems={subitems}
      onClick={() => tab.rendition?.display(item.href)}
      toggle={() => tab.toggle(id)}
      onActivate={onActivate}
    />
  )
}

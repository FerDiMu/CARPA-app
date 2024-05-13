import { IS_SERVER } from '@literal-ui/hooks'
import Dexie, { Table } from 'dexie'

import { PackagingMetadataObject } from '@flow/epubjs/types/packaging'

import type {Location} from '@flow/epubjs'

import { Annotation } from './annotation'
import { fileToEpub } from './file'
import { TypographyConfiguration } from './state'

export interface MicrophoneData{
  timestamp: number
  timestamp_formatted: string
  volume_level: number
}

export interface ReaderInformation{
  timestamp:number,
  participant_id: number | undefined,
}

export interface AccuracyRecord{
  timestamp: number,
  accuracy: number,
  accuracy_predictions: {
    x: number[],
    y: number[],
  },
  window_dimensions: {
    width: number,
    height: number,
  },
}

export interface TimelineRecord{
  location: Location,
  timestamp: number,
}

export interface EyeGazeRecord{
  session_id: string | null
  timestamp: number
  timestamp_formatted: string
  x_screen_prediction: number
  y_screen_prediction: number
}

export interface WordRecord{
  word: string
  x: number,
  y: number,
  width: number,
  height: number
}

export interface FileRecord {
  id: string
  file: File
}

export interface CoverRecord {
  id: string
  cover: string | null
}

export interface BookRecord {
  // TODO: use file hash as id
  id: string
  name: string
  size: number
  metadata: PackagingMetadataObject
  createdAt: number
  updatedAt?: number
  cfi?: string
  percentage?: number
  definitions: string[]
  annotations: Annotation[]
  configuration?: {
    typography?: TypographyConfiguration
  }
}

export class DB extends Dexie {
  // 'books' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  microphones!: Table<MicrophoneData>
  readers!: Table<ReaderInformation>
  timelines!: Table<TimelineRecord>
  accuracies!: Table<AccuracyRecord>
  words!: Table<WordRecord>
  eyegazes!: Table<EyeGazeRecord>
  files!: Table<FileRecord>
  covers!: Table<CoverRecord>
  books!: Table<BookRecord>

  constructor(name: string) {
    super(name)

    this.version(11).stores({
      microphones: 'timestamp, volume_level'
    })

    this.version(10).stores({
      readers: 'timestamp, participant_id'
    })

    this.version(9).stores({
      timelines: 'timestamp, location'
    })

    this.version(8).stores({
      accuracies: 'timestamp, accuracy, accuracy_predictions,  window_dimensions'
    })

    this.version(7).stores({
      words: '[x+y], word, width, height',
    })

    this.version(6).stores({
      eyegazes: 'timestamp, session_id, x_screen_prediction, y_screen_prediction',
    })

    this.version(5).stores({
      books:
        'id, name, size, metadata, createdAt, updatedAt, cfi, percentage, definitions, annotations, configuration',
    })

    this.version(4)
      .stores({
        books:
          'id, name, size, metadata, createdAt, updatedAt, cfi, percentage, definitions, annotations',
      })
      .upgrade(async (t) => {
        t.table('books')
          .toCollection()
          .modify((r) => {
            r.annotations = []
          })
      })

    this.version(3)
      .stores({
        books:
          'id, name, size, metadata, createdAt, updatedAt, cfi, percentage, definitions',
      })
      .upgrade(async (t) => {
        const files = await t.table('files').toArray()

        const metadatas = await Dexie.waitFor(
          Promise.all(
            files.map(async ({ file }) => {
              const epub = await fileToEpub(file)
              return epub.loaded.metadata
            }),
          ),
        )

        return t
          .table('books')
          .toCollection()
          .modify(async (r) => {
            const i = files.findIndex((f) => f.id === r.id)
            r.metadata = metadatas[i]
            r.size = files[i].file.size
          })
          .catch((e) => {
            console.error(e)
            throw e
          })
      })
    this.version(2)
      .stores({
        books: 'id, name, createdAt, cfi, percentage, definitions',
      })
      .upgrade(async (t) => {
        const books = await t.table('books').toArray()
        ;['covers', 'files'].forEach((tableName) => {
          t.table(tableName)
            .toCollection()
            .modify((r) => {
              const book = books.find((b) => b.name === r.id)
              if (book) r.id = book.id
            })
        })
      })
    this.version(1).stores({
      books: 'id, name, createdAt, cfi, percentage, definitions', // Primary key and indexed props
      covers: 'id, cover',
      files: 'id, file',
    })
  }
}

export const db = IS_SERVER ? null : new DB('re-reader')

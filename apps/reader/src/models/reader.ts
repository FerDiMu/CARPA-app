import { debounce } from '@github/mini-throttle/decorators'
import { IS_SERVER } from '@literal-ui/hooks'
import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import { proxy, ref, snapshot, subscribe, useSnapshot } from 'valtio'

import {type Location, type Book, type Contents, EpubCFI} from '@flow/epubjs'
import { type Rendition } from '@flow/epubjs/types/rendition'
import Navigation, { NavItem } from '@flow/epubjs/types/navigation'
import Section from '@flow/epubjs/types/section'

import { AnnotationColor, AnnotationType } from '../annotation'
import { BookRecord, db, EyeGazeRecord, WordRecord } from '../db'
import { fileToEpub } from '../file'
import { defaultStyle } from '../styles'

import { dfs, find, INode } from './tree'
import { time } from 'console'
import { app, dbf } from '../firebase/firebaseApp'
import { useRouter } from 'next/router'
import { makeRangeCfi, timeConfiguration } from '../utils'
import html2canvas from 'html2canvas'
import View from '@flow/epubjs/types/managers/view'
import { LayoutSettings } from '@flow/epubjs/types/layout'

import $ from "jquery";
import { PreventFlash } from '@literal-ui/core'

function updateIndex(array: any[], deletedItemIndex: number) {
  const last = array.length - 1
  return deletedItemIndex > last ? last : deletedItemIndex
}

export function compareHref(
  sectionHref: string | undefined,
  navitemHref: string | undefined,
) {
  if (sectionHref && navitemHref) {
    const [target] = navitemHref.split('#')

    return (
      sectionHref.endsWith(target!) ||
      // fix for relative nav path `../Text/example.html`
      target?.endsWith(sectionHref)
    )
  }
}

function compareDefinition(d1: string, d2: string) {
  return d1.toLowerCase() === d2.toLowerCase()
}

export interface INavItem extends NavItem, INode {
  subitems?: INavItem[]
}

export interface IMatch extends INode {
  excerpt: string
  description?: string
  cfi?: string
  subitems?: IMatch[]
}

export interface ISection extends Section {
  length: number
  images: string[]
  navitem?: INavItem
}

export interface TimelineItem {
  location: Location
  timestamp: number
}

class BaseTab {
  constructor(public readonly id: string, public readonly title = id) {}

  get isBook(): boolean {
    return this instanceof BookTab
  }

  get isPage(): boolean {
    return this instanceof PageTab
  }
}

// https://github.com/pmndrs/valtio/blob/92f3311f7f1a9fe2a22096cd30f9174b860488ed/src/vanilla.ts#L6
type AsRef = { $$valtioRef: true }

export class BookTab extends BaseTab {
  epub?: Book
  iframe?: Window & AsRef
  rendition?: Rendition & { manager?: any }
  nav?: Navigation
  locationToReturn?: Location
  section?: ISection
  sections?: ISection[]
  results?: IMatch[]
  activeResultID?: string
  rendered = false
  moved_page = false

  get container() {
    return this?.rendition?.manager?.container as HTMLDivElement | undefined
  }

  timeline: TimelineItem[] = []
  get location() {
    return this.timeline[0]?.location
  }

  display(target?: string, returnable = true) {
    this.rendition?.display(target)
    if (returnable) this.showPrevLocation()
  }
  displayFromSelector(selector: string, section: ISection, returnable = true) {
    try {
      const el = section.document.querySelector(selector)
      if (el) this.display(section.cfiFromElement(el), returnable)
    } catch (err) {
      this.display(section.href, returnable)
    }
  }
  prev() {
    this.moved_page = true
    this.rendition?.prev()
    // avoid content flash
    if (this.container?.scrollLeft === 0 && !this.location?.atStart) {
      this.rendered = false
    }
  }
  next() {
    this.moved_page = true
    this.rendition?.next()
  }

  updateBook(changes: Partial<BookRecord>) {
    changes = {
      ...changes,
      updatedAt: Date.now(),
    }
    // don't wait promise resolve to make valtio batch updates
    this.book = { ...this.book, ...changes }
    db?.books.update(this.book.id, changes)
  }

  annotationRange?: Range
  setAnnotationRange(cfi: string) {
    const range = this.view?.contents.range(cfi)
    if (range) this.annotationRange = ref(range)
  }

  define(def: string[]) {
    this.updateBook({ definitions: [...this.book.definitions, ...def] })
  }
  undefine(def: string) {
    this.updateBook({
      definitions: this.book.definitions.filter(
        (d) => !compareDefinition(d, def),
      ),
    })
  }
  isDefined(def: string) {
    return this.book.definitions.some((d) => compareDefinition(d, def))
  }

  rangeToCfi(range: Range) {
    return this.view.contents.cfiFromRange(range)
  }
  putAnnotation(
    type: AnnotationType,
    cfi: string,
    color: AnnotationColor,
    text: string,
    notes?: string,
  ) {
    const spine = this.section
    if (!spine?.navitem) return

    const i = this.book.annotations.findIndex((a) => a.cfi === cfi)
    let annotation = this.book.annotations[i]

    const now = Date.now()
    if (!annotation) {
      annotation = {
        id: uuidv4(),
        bookId: this.book.id,
        cfi,
        spine: {
          index: spine.index,
          title: spine.navitem.label,
        },
        createAt: now,
        updatedAt: now,
        type,
        color,
        notes,
        text,
      }

      this.updateBook({
        // DataCloneError: Failed to execute 'put' on 'IDBObjectStore': #<Object> could not be cloned.
        annotations: [...snapshot(this.book.annotations), annotation],
      })
    } else {
      annotation = {
        ...this.book.annotations[i]!,
        type,
        updatedAt: now,
        color,
        notes,
        text,
      }
      this.book.annotations.splice(i, 1, annotation)
      this.updateBook({
        annotations: [...snapshot(this.book.annotations)],
      })
    }
  }
  removeAnnotation(cfi: string) {
    return this.updateBook({
      annotations: snapshot(this.book.annotations).filter((a:any) => a.cfi !== cfi),
    })
  }

  keyword = ''
  setKeyword(keyword: string) {
    if (this.keyword === keyword) return
    this.keyword = keyword
    this.onKeywordChange()
  }

  // only use throttle/debounce for side effects
  @debounce(1000)
  async onKeywordChange() {
    this.results = await this.search()
  }

  get totalLength() {
    return this.sections?.reduce((acc, s) => acc + s.length, 0) ?? 0
  }

  toggle(id: string) {
    const item = find(this.nav?.toc, id) as INavItem
    if (item) item.expanded = !item.expanded
  }

  toggleResult(id: string) {
    const item = find(this.results, id)
    if (item) item.expanded = !item.expanded
  }

  showPrevLocation() {
    this.locationToReturn = this.location
  }

  hidePrevLocation() {
    this.locationToReturn = undefined
  }

  mapSectionToNavItem(sectionHref: string) {
    let navItem: NavItem | undefined
    this.nav?.toc.forEach((item) =>
      dfs(item as NavItem, (i) => {
        if (compareHref(sectionHref, i.href)) navItem ??= i
      }),
    )
    return navItem
  }

  get currentHref() {
    return this.location?.start.href
  }

  get currentNavItem() {
    return this.section?.navitem
  }

  get view() {
    return this.rendition?.manager?.views._views[0]
  }

  getNavPath(navItem = this.currentNavItem) {
    const path: INavItem[] = []

    if (this.nav) {
      while (navItem) {
        path.unshift(navItem)
        const parentId = navItem.parent
        if (!parentId) {
          navItem = undefined
        } else {
          const index = this.nav.tocById[parentId]!
          navItem = this.nav.getByIndex(parentId, index, this.nav.toc)
        }
      }
    }

    return path
  }

  searchInSection(keyword = this.keyword, section = this.section) {
    if (!section) return

    const subitems = section.find(keyword) as unknown as IMatch[]
    if (!subitems.length) return

    const navItem = section.navitem
    if (navItem) {
      const path = this.getNavPath(navItem)
      path.pop()
      return {
        id: navItem.href,
        excerpt: navItem.label,
        description: path.map((i) => i.label).join(' / '),
        subitems: subitems.map((i) => ({ ...i, id: i.cfi! })),
        expanded: true,
      }
    }
  }

  search(keyword = this.keyword) {
    // avoid blocking input
    return new Promise<IMatch[] | undefined>((resolve) => {
      requestIdleCallback(() => {
        if (!keyword) {
          resolve(undefined)
          return
        }

        const results: IMatch[] = []

        this.sections?.forEach((s) => {
          const result = this.searchInSection(keyword, s)
          if (result) results.push(result)
        })

        resolve(results)
      })
    })
  }

  private _el?: HTMLDivElement
  onRender?: () => void
  onLocationChanged?: (moved_page:boolean, data: {}) => void
  prev_page_data = {}

  async render(el: HTMLDivElement) {
    if (el === this._el) return
    this._el = ref(el)

    var canWrite = false

    const file = await db?.files.get(this.book.id)
    if (!file) return

    this.epub = ref(await fileToEpub(file.file))

    this.epub?.loaded.navigation.then((nav) => {
      this.nav = nav
    })
    console.log(this.epub)
    this.epub?.loaded.spine.then((spine: any) => {
      const sections = spine.spineItems as ISection[]
      // https://github.com/futurepress/epub.js/issues/887#issuecomment-700736486
      const promises = sections.map((s) =>
        s.load(this.epub?.load.bind(this.epub)),
      )

      Promise.all(promises).then(() => {
        sections.forEach((s) => {
          s.length = s.document.body.textContent?.length ?? 0
          s.images = [...s.document.querySelectorAll('img')].map((el) => el.src)
          this.epub!.loaded.navigation.then(() => {
            s.navitem = this.mapSectionToNavItem(s.href)
          })
        })
        this.sections = ref(sections)
      })
    })
    this.rendition = ref(
      this.epub?.renderTo(el, {
        width: '100%',
        height: '100%',
        allowScriptedContent: true,
      }),
    )
    console.log("Weblogger: Rendition Display location: " + this.location?.start.cfi + " . Book cfi: " + this.book.cfi + ". Question: " +  (this.location?.start.cfi ?? this.book.cfi ?? undefined))
    console.log(this.location?.start.cfi ?? this.book.cfi ?? undefined)
    console.log((this.location?.start.cfi ?? this.book.cfi) ?? undefined)
    this.rendition?.display("epubcfi(/6/2!/4/4/1)")
    console.log(this.rendition?.q)
    this.rendition?.themes.default(defaultStyle)
    this.rendition?.hooks.render.register((contents: Contents, view: View) => {
      console.log('hooks.render', view)
      this.onRender?.()
      })
    this.rendition?.on('relocated', async (loc: Location) => {
      if(canWrite){
        const date = Date.now()
        var timeline_item: TimelineItem = {
        location: loc,
        timestamp: date,
        }
        //console.log("Weblogger: Relocated" + Intl.DateTimeFormat().resolvedOptions().timeZone) 
        console.log('Weblogger: Relocated render: ' + JSON.stringify(loc) + " at " + new Date(date).toLocaleString(
          'es-ES',
          timeConfiguration,
        ))
        console.log("Weblogger: Relocated rendition: " + JSON.stringify(loc))
        this.rendered = true
        if (
          (document.cookie.match(/^(?:.*;)?\s*readerID\s*=\s*([^;]+)(?:.*)?$/) || [
            ,
            null,
          ])[1] != null
        ) {
          console.log("Weblogger: Previous page configuration")
          const response = await db?.words.toArray()
          if (response && response.length != 0) {
            this.prev_page_data = {
              book: this.book.name,
              location: this.timeline[0]?.location!,
              start_timestamp_formatted: new Date(this.timeline[0]?.timestamp!).toLocaleString(
                'es-ES',
                timeConfiguration,
              ),
              start_timestamp: this.timeline[0]?.timestamp!,
              end_timestamp_formatted: new Date(date).toLocaleString(
                'es-ES',
                timeConfiguration,
              ),
              end_timestamp: date,
              page_content: JSON.parse(JSON.stringify(response))
            }
            db?.words.clear()
            console.log("Weblogger: Promise 1 resolved")
            const eyegazes = await db?.eyegazes.filter((obj)=>{return obj.timestamp <= date}).toArray()
            if(eyegazes && eyegazes.length != 0){
              console.log("Weblogger: Saving eyegaze data")
              this.prev_page_data = {
                ...this.prev_page_data,
                eyegaze: {
                  eyegaze_start: eyegazes[0]?.timestamp_formatted,
                  eyegaze_end: eyegazes[eyegazes.length - 1]?.timestamp_formatted,
                  gazes: eyegazes.map(a => {return {...a}}),
                }
              }
              db?.eyegazes.clear()
              const accuracies = await db?.accuracies.filter((obj)=>{return obj.timestamp <= this.timeline[0]?.timestamp!}).toArray()
              if(accuracies && accuracies.length != 0){
                console.log(
                  'Weblogger: Accuracies: ' + accuracies.length,
                )
                const proximal_accuracy = accuracies.reduce(
                  (prev, current) => {
                    return prev.timestamp > current.timestamp ? prev : current
                  }
                )
                this.prev_page_data = {
                  ...this.prev_page_data,
                  accuracy_info: {
                    timestamp_formatted: new Date(proximal_accuracy.timestamp).toLocaleString(
                      'es-ES',
                      timeConfiguration,
                    ),
                    ...proximal_accuracy
                  }
                }
              }
            }
          }
        }
        else{
          db?.words.clear()
          db?.eyegazes.clear()
        }
        this.timeline.unshift(timeline_item)
        db?.timelines.add(timeline_item)
  
        var canvas: HTMLCanvasElement
  
        var rangeCfi = makeRangeCfi(loc.start.cfi, loc.end.cfi)
  
        var epubCFI = new EpubCFI(rangeCfi)
  
        console.log("Weblogger: EpubCFI: " + rangeCfi + ". Offset: " + rangeCfi.split(":")[1])
  
        var found = this.rendition?.manager?.visible().filter(function (view: { index: number }) {
          if(epubCFI.spinePos === view.index) return true;
        });
    
        // Should only every return 1 item
        if (found.length) {
          const contents = found[0].contents
          const window:Window = found[0].window
          //const window: Window = this.rendition?.manager.views._views[0].window
        //const contents: Contents = this.rendition?.manager.views._views[0].contents
        const view_el =  this.rendition?.manager.views._views[0].element as HTMLElement
        const view_rect = view_el.getBoundingClientRect()
  
        //console.log("Weblogger: Content document: " + contents.document.documentElement.innerHTML)
        
        //canvas = document.getElementById("highlightCanvas")! as HTMLCanvasElement;
  
        //console.log("Weblogger: Found element: " + $(document.body)[0] + " and " + $(document.body).find('#highlightCanvas')[0])
  
        //var ctx = ($(document.body).find('#highlightCanvas')[0]! as HTMLCanvasElement).getContext("2d");
        var range = this.rendition?.getRange(rangeCfi)
        //var iframe = document.getElementsByTagName("iframe")[0]
        //var contentDoc = iframe?.contentDocument
        //console.log("Weblogger: Range " + JSON.stringify(range?.getClientRects()))
        var selection = window.getSelection()
        selection?.removeAllRanges();
        //selection?.addRange(range!);
        //console.log("Weblogger: Full range position: " + JSON.stringify(range!.getBoundingClientRect()))
        //console.log("Weblogger: Current selection: " + range!.toString() + ". Number: " + selection?.rangeCount)
        //console.log("Weblogger: Range start node container: " + range!.startContainer.textContent)
        //console.log("Weblogger: Range end node container: " + range!.endContainer.textContent)
        var fragment = range!.cloneContents()
        //console.log("Weblogger: Document fragment number of child elements: " + fragment.childElementCount)
        var div = document.createElement('div');
        div.appendChild(fragment.cloneNode(true));
        console.log("Weblogger: Range's document fragment's inner HTML: "  + div.innerHTML)
        // console.log("Weblogger: Text width: " + contents.textWidth())
        var htmlcollection = fragment.children
        //console.log("Weblogger: Document fragment HTMLCollection length: " + fragment.children.length)
        var serializer = new XMLSerializer()
        var content_location: { word: string | undefined; viewport_location: { x: number; y: number; width: number; height: number } }[] = []
        //console.log("Weblogger: " + serializer.serializeToString(document.body))
        //console.log("Weblogger: Element " + iframe!.tagName + " position: " + JSON.stringify(iframe?.getBoundingClientRect()))
        if(htmlcollection.length == 0){
          if(range?.startContainer === range?.endContainer){
            var start = range!.startOffset,  end = 0, range_el = new Range(), node_ref: Node
            node_ref = range!.startContainer
            var range_string= range?.startContainer.nodeValue!.substring(range.startOffset, range.endOffset)
            var words = range_string!.trim().split(' ')!
            for (var j = 0; j < words.length; j++) {
              var word = words[j]
              end = start + word!.length
              range_el!.setStart(node_ref, start)
              range_el!.setEnd(node_ref, end)
              var rect = range_el!.getBoundingClientRect()
              rect.x = rect.x + view_rect.x
              rect.y = rect.y + view_rect.y
              content_location.push(
                {
                  "word": word,
                  "viewport_location": {
                    "x": rect.x,
                    "y": rect.y,
                    "width": rect.width,
                    "height": rect.height
                  }
                }
              )
              db?.words.add({x:rect.x, y: rect.y, word: word!, width: rect.width, height: rect.height})
              //console.log("Weblogger: Word: " + range_el!.toString() + " .Bounding client normal: " + JSON.stringify(rect))
              start = end + 1;
            }
          }
        }
        var node_text_counter = 0
        for (var i = 0, len = htmlcollection.length; i < len; i++) {
          var element = htmlcollection.item(i)
          //console.log("Weblogger: HTML collection node " + i)
          if(element != null){
            const extract_child_nodes_content = (child_element: Element) =>{
              console.log("Weblogger: Element " + child_element.outerHTML)
              //var iframe = document.getElementsByTagName("iframe")[0]
              var innerDoc = contents.document;
              /**
               * var $el = $(innerDoc).find("body *").filter(function(){
                if(this.outerHTML === child_element?.outerHTML)
                  console.log("Weblogger: Found element " + serializer.serializeToString(this))
                return this.outerHTML === child_element?.outerHTML;
              });
               */
                //var rect_el = $el[0].getBoundingClientRect()
                //console.log("Weblogger: Element " + $el[0].tagName + " position: " + JSON.stringify(rect_el))
                child_element.childNodes.forEach((node, index) => {
                  //console.log("Weblogger: Child node of element " + i + ": " + node)
                  if(node.nodeType == Node.TEXT_NODE && node!.nodeValue!.trim() != ""){
                    var $el = $(innerDoc).find("body *").filter(function(){
                      //if(this.outerHTML === child_element?.outerHTML)
                        //console.log("Weblogger: Found element " + serializer.serializeToString(this))
                      return this.outerHTML === child_element?.outerHTML;
                    })
                    var start = 0,  end = 0, range_el = new Range(), node_ref: Node
                    //console.log("Weblogger: TEXT NODE: " + node!.nodeValue!.trim() + ". Text node counter: " + node_text_counter)
                    var words = node!.nodeValue!.trim().split(' ')
                    if($el[0])
                      node_ref = $el[0]?.childNodes[index]!
                    else{
                      //It is the first text node of the range and doesn't correspond to a complete text node in the original document
                      if(node_text_counter === 0){
                        node_ref = range!.startContainer
                        start = range!.startOffset
                        console.log("Weblogger: Found trimmed start of range")
                      }
                      //It is the last text node of the range and doesn't correspond to a complete text node in the original document
                      else{
                        node_ref = range!.endContainer
                        console.log("Weblogger: Found trimmed end of range")
                      }
                    }
                    for (var j = 0; j < words.length; j++) {
                      var word = words[j]
                      end = start + word!.length
                      range_el!.setStart(node_ref, start)
                      range_el!.setEnd(node_ref, end)
                      var rect = range_el!.getBoundingClientRect()
                      rect.x = rect.x + view_rect.x
                      rect.y = rect.y + view_rect.y
                      content_location.push(
                        {
                          "word": word,
                          "viewport_location": {
                            "x": rect.x,
                            "y": rect.y,
                            "width": rect.width,
                            "height": rect.height
                          }
                        }
                      )
                      db?.words.add({x:rect.x, y: rect.y, word: word!, width: rect.width, height: rect.height})
                      //console.log("Weblogger: Word: " + range_el!.toString() + " .Bounding client normal: " + JSON.stringify(rect))
                      start = end + 1;
                    }
                    node_text_counter++
                  }
                  else if(node.nodeType == Node.ELEMENT_NODE){
                    extract_child_nodes_content(node as Element)
                  }
                })
              }
            extract_child_nodes_content(element) 
          }
          }
          
          /**
           * html2canvas(contents.document.body).then(function (canvas) {
          console.log('Weblogger: Content to blob...')
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const storage = getStorage(app)
                const date = Date.now()
                console.log('Weblogger: Storing blob content...')
                const storageRef = refS(
                  storage,
                  `eye-tracking/${
                    getAuth().currentUser!.uid
                  }/epub-content/${date}.jpeg`,
                )
                uploadBytes(storageRef, blob).then((snapshot) => {
                  getDownloadURL(snapshot.ref).then((value) => {
                    setDoc(
                      doc(
                        dbf,
                        getAuth().currentUser!.uid,
                        'content-capture-' + date,
                      ),
                      {
                        timestamp: new Date(date).toLocaleString(
                          'es-ES',
                          timeConfiguration,
                        ),
                        user_id: getAuth().currentUser!.uid,
                        screenshot: value,
                        content_location: content_location
                      },
                    )
                  })
                })
              }
            },
            'image/jpeg',
            1,
          )
        })
           */
        }
        
  
        
        //console.log("Weblogger: Current redered word in range: " + selection!.getRangeAt(0).toString() + ". Boundaries: " + JSON.stringify(selection!.getRangeAt(0).getBoundingClientRect()))
        
        
        //console.log("Weblogger: Container rect: " + JSON.stringify(el.parentElement!.getBoundingClientRect()))
        //console.log("Weblogger: View rect: " + JSON.stringify(el!.getBoundingClientRect()))
  
        //var map: Mapping = new Mapping(new Layout({layout: this.rendition?.settings.layout!, spread:  this.rendition?.settings.spread!, minSpreadWidth: this.rendition?.settings.minSpreadWidth!, evenSpreads: false}), )
  
        // calculate percentage
        if (this.sections) {
          const start = loc.start
          const i = this.sections.findIndex((s) => s.href === start.href)
          const previousSectionsLength = this.sections
            .slice(0, i)
            .reduce((acc, s) => acc + s.length, 0)
          const previousSectionsPercentage =
            previousSectionsLength / this.totalLength
          const currentSectionPercentage =
            this.sections[i]!.length / this.totalLength
          const displayedPercentage = start.displayed.page / start.displayed.total
  
          const percentage =
            previousSectionsPercentage +
            currentSectionPercentage * displayedPercentage
  
          this.updateBook({ cfi: start.cfi, percentage })
        }
        else
          this.updateBook({ cfi: loc.start.cfi})
        console.log("Weblogger: Rendition Book cfi: " + this.book.cfi)
        console.log("Webglogger: Previous page data: " + JSON.stringify(this.prev_page_data))
        this.onLocationChanged?.(this.moved_page, this.prev_page_data)
      }
      else{
        canWrite = true
      }
      this.moved_page = false
    })

    this.rendition?.on('attached', (...args: any[]) => {
      console.log('attached', args)
    })
    this.rendition?.on('started', (...args: any[]) => {
      console.log("Weblogger: Rendition Started")
      console.log(this.rendition?.q)
      console.log('started', args)
    })
    this.rendition?.on('displayed', (...args: any[]) => {
      console.log("Weblogger: Rendition Displayed")
      console.log(this.rendition?.q)
      console.log('displayed', args)
    })
    this.rendition?.on('rendered', (section: ISection, view: any) => {
      console.log("Weblogger: Rendition Rendered")
      console.log(this.rendition?.q)
      console.log("Weblogger: Annotations " + JSON.stringify(this.book.annotations[this.book.annotations.length -1]))
      this.rendition?.display(
        this.location?.start.cfi ?? this.book.cfi ?? undefined,
      )
      //this.rendition?.display(this.book.annotations[this.book.annotations.length -1]!.cfi)
      console.log("Weblogger: Rendered " + this.rendition?.location)
      console.log('rendered', [section, view])
      this.section = ref(section)
      this.iframe = ref(view.window as Window)
    })
    this.rendition?.on('selected', (...args: any[]) => {
      console.log('selected', args)
    })
    this.rendition?.on('removed', (...args: any[]) => {
      console.log('removed', args)
    })
  }

  constructor(public book: BookRecord) {
    super(book.id, book.name)

    // don't subscribe `db.books` in `constructor`, it will
    // 1. update the unproxied instance, which is not reactive
    // 2. update unnecessary state (e.g. percentage) of all tabs with the same book
  }
}

class PageTab extends BaseTab {
  constructor(public readonly Component: React.FC<any>) {
    super(Component.displayName ?? 'untitled')
  }
}

type Tab = BookTab | PageTab
type TabParam = ConstructorParameters<typeof BookTab | typeof PageTab>[0]

export class Group {
  id = uuidv4()
  tabs: Tab[] = []

  constructor(
    tabs: Array<Tab | TabParam> = [],
    public selectedIndex = tabs.length - 1,
  ) {
    this.tabs = tabs.map((t) => {
      if (t instanceof BookTab || t instanceof PageTab) return t
      const isPage = typeof t === 'function'
      return isPage ? new PageTab(t) : new BookTab(t)
    })
  }

  get selectedTab() {
    return this.tabs[this.selectedIndex]
  }

  get bookTabs() {
    return this.tabs.filter((t) => t instanceof BookTab) as BookTab[]
  }

  removeTab(index: number) {
    const tab = this.tabs.splice(index, 1)
    this.selectedIndex = updateIndex(this.tabs, index)
    return tab[0]
  }

  addTab(param: TabParam | Tab) {
    const isTab = param instanceof BookTab || param instanceof PageTab
    const isPage = typeof param === 'function'

    const id = isTab ? param.id : isPage ? param.displayName : param.id

    const index = this.tabs.findIndex((t) => t.id === id)
    if (index > -1) {
      this.selectTab(index)
      return this.tabs[index]
    }

    const tab = isTab ? param : isPage ? new PageTab(param) : new BookTab(param)

    this.tabs.splice(++this.selectedIndex, 0, tab)
    return tab
  }

  replaceTab(param: TabParam, index = this.selectedIndex) {
    this.addTab(param)
    this.removeTab(index)
  }

  selectTab(index: number) {
    this.selectedIndex = index
  }
}

export class Reader {
  groups: Group[] = []
  focusedIndex = -1

  get focusedGroup() {
    return this.groups[this.focusedIndex]
  }

  get focusedTab() {
    return this.focusedGroup?.selectedTab
  }

  get focusedBookTab() {
    return this.focusedTab instanceof BookTab ? this.focusedTab : undefined
  }

  addTab(param: TabParam | Tab, groupIdx = this.focusedIndex) {
    let group = this.groups[groupIdx]
    if (group) {
      this.focusedIndex = groupIdx
    } else {
      group = this.addGroup([])
    }
    return group?.addTab(param)
  }

  removeTab(index: number, groupIdx = this.focusedIndex) {
    const group = this.groups[groupIdx]
    if (group?.tabs.length === 1) {
      this.removeGroup(groupIdx)
      return group.tabs[0]
    }
    return group?.removeTab(index)
  }

  replaceTab(
    param: TabParam,
    index = this.focusedIndex,
    groupIdx = this.focusedIndex,
  ) {
    const group = this.groups[groupIdx]
    group?.replaceTab(param, index)
  }

  removeGroup(index: number) {
    this.groups.splice(index, 1)
    this.focusedIndex = updateIndex(this.groups, index)
  }

  addGroup(tabs: Array<Tab | TabParam>, index = this.focusedIndex + 1) {
    const group = proxy(new Group(tabs))
    this.groups.splice(index, 0, group)
    this.focusedIndex = index
    return group
  }

  selectGroup(index: number) {
    this.focusedIndex = index
  }

  clear() {
    this.groups = []
    this.focusedIndex = -1
  }

  resize() {
    this.groups.forEach(({ bookTabs }) => {
      bookTabs.forEach(({ rendition }) => {
        try {
          rendition?.resize()
        } catch (error) {
          console.error(error)
        }
      })
    })
  }
}

export const reader = proxy(new Reader())

subscribe(reader, () => {
  console.log(snapshot(reader))
})

export function useReaderSnapshot() {
  return useSnapshot(reader)
}

declare global {
  interface Window {
    reader: Reader
  }
}

if (!IS_SERVER) {
  window.reader = reader
}

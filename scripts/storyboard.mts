// Reads the board in a video's seek-bar thumbnails, the "storyboard": public
// images YouTube makes for every video, a frame every 10 seconds, laid out
// in sheets. They come from the watch page, outside the Data API and its quota.

import jpeg from "jpeg-js"

import { readOccupancy, type BoardFrame } from "./board-reading.mts"

/** Smaller thumbnails, as in videos before 2023, are too blurry to read the board. */
const MIN_FRAME_WIDTH = 320

const HEADERS = {
  // A full browser user agent gets WebP sheets, which jpeg-js can't read.
  "User-Agent": "Mozilla/5.0",
  "Accept-Language": "en-US,en;q=0.9",
  // Skips the cookie consent page served to some regions.
  Cookie: "CONSENT=YES+",
}

type StoryboardLevel = {
  index: number
  frameWidth: number
  frameHeight: number
  frameCount: number
  columns: number
  rows: number
  intervalMs: number
  /** Sheet file name, with "$M" for the sheet number. */
  name: string
  signature: string
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`YouTube returned ${response.status} for ${new URL(url).pathname}`)
  return response
}

/**
 * The storyboard spec: a URL template, then one level per resolution, each
 * "width#height#frames#columns#rows#intervalMs#name#signature".
 */
async function fetchSpec(videoId: string): Promise<{ template: string; levels: StoryboardLevel[] }> {
  const html = await (await fetchOk(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`)).text()
  const raw = html.match(/"playerStoryboardSpecRenderer":\{"spec":"((?:[^"\\]|\\.)+)"/)?.[1]
  if (!raw) throw new Error("no storyboard on the watch page")
  const [template, ...levels] = (JSON.parse(`"${raw}"`) as string).split("|")
  return {
    template,
    levels: levels.map((level, index) => {
      const [width, height, count, columns, rows, interval, name, signature] = level.split("#")
      return {
        index,
        frameWidth: Number(width),
        frameHeight: Number(height),
        frameCount: Number(count),
        columns: Number(columns),
        rows: Number(rows),
        intervalMs: Number(interval),
        name,
        signature,
      }
    }),
  }
}

/** The board in every frame of the video's sharpest storyboard, oldest first. */
export async function readStoryboard(videoId: string): Promise<BoardFrame[]> {
  const { template, levels } = await fetchSpec(videoId)
  const level = levels.at(-1)
  if (!level || level.frameWidth < MIN_FRAME_WIDTH || level.intervalMs <= 0) {
    throw new Error(`storyboard too small (${level?.frameWidth ?? 0}px)`)
  }

  const framesPerSheet = level.columns * level.rows
  const sheetCount = Math.ceil(level.frameCount / framesPerSheet)
  const frames: BoardFrame[] = []
  for (let sheet = 0; sheet < sheetCount; sheet++) {
    const url =
      template.replace("$L", String(level.index)).replace("$N", level.name.replace("$M", String(sheet))) +
      `&sigh=${level.signature}`
    const response = await fetchOk(url)
    const type = response.headers.get("content-type")
    if (type !== "image/jpeg") throw new Error(`storyboard sheet is ${type}, not JPEG`)
    const image = jpeg.decode(new Uint8Array(await response.arrayBuffer()), {
      useTArray: true,
      formatAsRGBA: true,
    })
    for (let cell = 0; cell < framesPerSheet; cell++) {
      const frameIndex = sheet * framesPerSheet + cell
      if (frameIndex >= level.frameCount) break
      const x = (cell % level.columns) * level.frameWidth
      const y = Math.floor(cell / level.columns) * level.frameHeight
      const fits = x + level.frameWidth <= image.width && y + level.frameHeight <= image.height
      frames.push({
        seconds: (frameIndex * level.intervalMs) / 1000,
        occupancy: fits
          ? readOccupancy(image, { x, y, width: level.frameWidth, height: level.frameHeight })
          : null,
      })
    }
  }
  return frames
}

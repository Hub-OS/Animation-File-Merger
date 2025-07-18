import binPack from "bin-pack";
import { BoomSheetsAnimation, BoomSheetsFrame } from "./boomsheets-animations";
import InputSheets from "./input-sheets";

type BinPackItem<Item> = {
  x: number; // x coordinate of the packed box
  y: number; // y coordinate of the packed box
  width: number; // width of the packed box
  height: number; // height of the packed box
  item: Item; // original object that was passed in
};

type BinPackResult<Item> = {
  width: number; // width of the containing box
  height: number; // height of the containing box
  items: BinPackItem<Item>[]; // packed items
};

type FrameBin = {
  overlayed: {
    // we want to store the image, but that blocks us from structuredClone
    // so we store the sheet index instead
    sheetIndex: number;
    frame: BoomSheetsFrame;
  }[];
  outFrame: BoomSheetsFrame;
  duration: number;
  width: number;
  height: number;
};

const padding = 1;

function durationAsSecs(duration: string): number {
  duration = duration.trim();

  if (duration.toLowerCase().endsWith("f")) {
    // assuming 60 fps
    return parseFloat(duration.slice(0, -1)) / 60;
  }

  return parseFloat(duration);
}

export default function overlaySheets(
  canvas: HTMLCanvasElement,
  inputSheets: InputSheets
): BoomSheetsAnimation[] {
  const binMap: { [state: string]: FrameBin[] } = {};

  // clone animations into a single array and create bins
  for (let sheetI = 0; sheetI < inputSheets.sheets.length; sheetI++) {
    const sheet = inputSheets.sheets[sheetI];

    if (!sheet.animations || !sheet.image) {
      continue;
    }

    for (const animation of sheet.animations) {
      let stateBins = binMap[animation.state];

      if (!stateBins) {
        stateBins = [];
        binMap[animation.state] = stateBins;
      }

      let i = 0;

      for (const frame of animation.frames) {
        let remainingDuration = durationAsSecs(frame.duration);

        // overlay this frame as long as we have the duration to do so
        while (remainingDuration > 0) {
          let existingBin = stateBins[i];
          i += 1;

          if (!existingBin) {
            // create a new bin

            const lastOverlayed =
              stateBins[stateBins.length - 1]?.overlayed || [];

            stateBins.push({
              overlayed: [
                // extend the last frame
                ...lastOverlayed.filter(
                  ({ sheetIndex }) => sheetIndex != sheetI
                ),
                {
                  sheetIndex: sheetI,
                  frame,
                },
              ],
              outFrame: {
                x: 0,
                y: 0,
                w: frame.w,
                h: frame.h,
                originx: frame.originx,
                originy: frame.originy,
                flipx: false,
                flipy: false,
                duration: "", // handled later
                points: [],
              },
              duration: remainingDuration,
              width: 0,
              height: 0,
            });
            break;
          }

          // a bin already exists, time to overlay

          if (existingBin.duration > remainingDuration) {
            // split this bin in two, since this overlay only applies to part of this duration
            stateBins.splice(i + 1, 0, structuredClone(existingBin));
            existingBin.duration = remainingDuration;
          }

          remainingDuration -= existingBin.duration;
          existingBin.overlayed.push({ sheetIndex: sheetI, frame });

          // resolve origin
          existingBin.outFrame.originx = Math.max(
            existingBin.outFrame.originx,
            frame.originx
          );
          existingBin.outFrame.originy = Math.max(
            existingBin.outFrame.originy,
            frame.originy
          );
        }
      }
    }
  }

  // resolve outFrame sizes
  const bins: FrameBin[] = Object.values(binMap).flat();

  for (const bin of bins) {
    bin.outFrame;

    for (const { frame } of bin.overlayed) {
      bin.width = Math.max(
        bin.width,
        bin.outFrame.originx - frame.originx + frame.w
      );
      bin.height = Math.max(
        bin.height,
        bin.outFrame.originy - frame.originy + frame.h
      );
    }

    bin.outFrame.w = bin.width;
    bin.outFrame.h = bin.height;
  }

  // pack
  const packResult = binPack(bins) as BinPackResult<FrameBin>;

  // update outFrames and render
  canvas.width = packResult.width;
  canvas.height = packResult.height;

  const ctx = canvas.getContext("2d")!;

  for (const item of packResult.items) {
    const destX = item.x + padding;
    const destY = item.y + padding;

    const { outFrame } = item.item;
    outFrame.x = destX;
    outFrame.y = destY;
    outFrame.duration = item.item.duration.toString();

    for (const { sheetIndex, frame } of item.item.overlayed) {
      const image = inputSheets.sheets[sheetIndex].image;

      if (!image) {
        continue;
      }

      ctx.drawImage(
        image,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        outFrame.x + outFrame.originx - frame.originx,
        outFrame.y + outFrame.originy - frame.originy,
        frame.w,
        frame.h
      );
    }
  }

  // generate animation from bin map
  const animations: BoomSheetsAnimation[] = Object.entries(binMap).map(
    ([state, bins]) => ({
      state,
      frames: bins.map((bin) => bin.outFrame),
    })
  );

  return animations;
}

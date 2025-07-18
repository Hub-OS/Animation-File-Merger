import binPack from "bin-pack";
import { BoomSheetsAnimation, BoomSheetsFrame } from "./boomsheets-animations";
import InputSheets from "./input-sheets";

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
        }
      }

      // repeat the last frame over the remaining outFrames
      const lastFrame = animation.frames[animation.frames.length - 1];

      if (lastFrame) {
        for (; i < stateBins.length; i++) {
          const bin = stateBins[i];

          bin.overlayed.push({ sheetIndex: sheetI, frame: lastFrame });
        }
      }
    }
  }

  // resolve outFrame sizes and origin
  const bins: FrameBin[] = Object.values(binMap).flat();

  for (const bin of bins) {
    // resolve origin
    for (const { frame } of bin.overlayed) {
      bin.outFrame.originx = Math.max(bin.outFrame.originx, frame.originx);
      bin.outFrame.originy = Math.max(bin.outFrame.originy, frame.originy);
    }

    // resolve size
    for (const { frame } of bin.overlayed) {
      bin.outFrame.w = Math.max(
        bin.outFrame.w,
        bin.outFrame.originx - frame.originx + frame.w
      );
      bin.outFrame.h = Math.max(
        bin.outFrame.h,
        bin.outFrame.originy - frame.originy + frame.h
      );
    }

    bin.width = bin.outFrame.w + padding * 2;
    bin.height = bin.outFrame.h + padding * 2;
  }

  // pack
  const packResult = binPack(bins);

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

      const destX = outFrame.x + outFrame.originx - frame.originx;
      const destY = outFrame.y + outFrame.originy - frame.originy;

      ctx.save();
      ctx.translate(destX, destY);

      if (frame.flipx) {
        ctx.translate(frame.w, 0);
        ctx.scale(-1, 1);
      }

      if (frame.flipy) {
        ctx.translate(frame.h, 0);
        ctx.scale(1, -1);
      }

      ctx.drawImage(
        image,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        0,
        0,
        frame.w,
        frame.h
      );

      ctx.restore();
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

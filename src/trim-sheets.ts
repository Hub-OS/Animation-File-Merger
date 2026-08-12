import { BoomSheetsAnimation, BoomSheetsFrame } from "./boomsheets-animations";

function getImageIndex(w: number, x: number, y: number) {
  return (y * w + x) * 4;
}

export default function trimSheets(
  sourceCanvas: HTMLCanvasElement,
  animations: BoomSheetsAnimation[]
) {
  const sourceCtx = sourceCanvas.getContext("2d")!;

  // clone to avoid modifying the source animations
  animations = structuredClone(animations);

  for (const animation of animations) {
    for (const frame of animation.frames) {
      if (frame.w == 0 && frame.h == 0) {
        continue;
      }

      const imageData = sourceCtx.getImageData(
        frame.x,
        frame.y,
        frame.w,
        frame.h
      );

      const dataW = frame.w;
      const dataH = frame.h;
      const originalX = frame.x;
      const originalY = frame.y;

      // trim top
      outer: for (let y = 0; y < dataH; y++) {
        for (let x = 0; x < dataW; x++) {
          const transparent =
            imageData.data[getImageIndex(dataW, x, y) + 3] == 0;

          if (!transparent) {
            break outer;
          }
        }

        frame.y++;
        frame.h--;
      }

      // trim bottom
      const yShift = frame.y - originalY;

      outer: for (let y = dataH - 1; y >= yShift; y--) {
        for (let x = 0; x < dataW; x++) {
          const transparent =
            imageData.data[getImageIndex(dataW, x, y) + 3] == 0;

          if (!transparent) {
            break outer;
          }
        }

        frame.h--;
      }

      // trim left
      outer: for (let x = 0; x < dataW; x++) {
        for (let y = yShift; y < yShift + frame.h; y++) {
          const transparent =
            imageData.data[getImageIndex(dataW, x, y) + 3] == 0;

          if (!transparent) {
            break outer;
          }
        }

        frame.x++;
        frame.w--;
      }

      // trim right
      const xShift = frame.x - originalX;

      outer: for (let x = dataW - 1; x >= xShift; x--) {
        for (let y = yShift; y < yShift + frame.h; y++) {
          const transparent =
            imageData.data[getImageIndex(dataW, x, y) + 3] == 0;

          if (!transparent) {
            break outer;
          }
        }

        frame.w--;
      }

      // update points
      frame.originx -= xShift;
      frame.originy -= yShift;

      for (const point of frame.points) {
        point.x -= xShift;
        point.y -= yShift;
      }
    }
  }

  return animations;
}

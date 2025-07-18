import binPack from "bin-pack";
import { BoomSheetsAnimation, BoomSheetsFrame } from "./boomsheets-animations";
import InputSheets from "./input-sheets";

type FrameBin = {
  image: HTMLImageElement;
  frame: BoomSheetsFrame;
  width: number;
  height: number;
};

const padding = 1;

export default function mergeSheets(
  canvas: HTMLCanvasElement,
  inputSheets: InputSheets
): BoomSheetsAnimation[] {
  const animations: BoomSheetsAnimation[] = [];
  const bins: FrameBin[] = [];

  // clone animations into a single array and create bins
  for (const sheet of inputSheets.sheets) {
    if (!sheet.animations || !sheet.image) {
      continue;
    }

    const clonedSheetAnimations = structuredClone(sheet.animations);
    animations.push(...clonedSheetAnimations);

    for (const animation of clonedSheetAnimations) {
      for (const frame of animation.frames) {
        bins.push({
          image: sheet.image,
          frame,
          width: frame.w + padding * 2,
          height: frame.h + padding * 2,
        });
      }
    }
  }

  // pack
  const packResult = binPack(bins);

  // update frames and render
  canvas.width = packResult.width;
  canvas.height = packResult.height;

  const ctx = canvas.getContext("2d")!;

  for (const item of packResult.items) {
    const frame = item.item.frame;

    const destX = item.x + padding;
    const destY = item.y + padding;

    ctx.drawImage(
      item.item.image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      destX,
      destY,
      frame.w,
      frame.h
    );

    frame.x = destX;
    frame.y = destY;
  }

  return animations;
}

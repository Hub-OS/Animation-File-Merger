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
  image: HTMLImageElement;
  frame: BoomSheetsFrame;
  width: number;
  height: number;
};

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
          width: frame.w + 2,
          height: frame.h + 2,
        });
      }
    }
  }

  // pack
  const packResult = binPack(bins) as BinPackResult<FrameBin>;

  // update frames and render
  canvas.width = packResult.width;
  canvas.height = packResult.height;

  const ctx = canvas.getContext("2d")!;

  for (const item of packResult.items) {
    const frame = item.item.frame;

    ctx.drawImage(
      item.item.image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      item.x + 1,
      item.y + 1,
      frame.w,
      frame.h
    );

    frame.x = item.x;
    frame.y = item.y;
  }

  return animations;
}

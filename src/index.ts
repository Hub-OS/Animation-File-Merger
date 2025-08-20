import { parseSheet, serializeSheet } from "./boomsheets-animations";
import dedupSheet from "./dedup-sheet";
import { loadImageFile, loadTextFile } from "./file-loading";
import InputSheets from "./input-sheets";
import mergeSheets from "./merge-sheets";
import overlaySheets from "./overlay-sheets";
import { updateSheetList } from "./sheet-list-ui";

const inputSheets = new InputSheets();

function logError(error) {
  console.error(error);
  alert(error);
}

document.getElementById("clear-button")!.onclick = function () {
  inputSheets.sheets = [];
  updateSheetList(inputSheets);
};

document.getElementById("overlay-button")!.onclick = function () {
  const canvas = document.querySelector("#output canvas") as HTMLCanvasElement;
  const textarea = document.querySelector(
    "#output textarea"
  ) as HTMLTextAreaElement;

  try {
    const offscreenCanvas = document.createElement("canvas");
    const animations = overlaySheets(offscreenCanvas, inputSheets);
    dedupSheet(canvas, offscreenCanvas, animations);

    const boomsheet = {
      version: inputSheets.resolveOutputVersion(),
      animations,
    };

    textarea.value = serializeSheet(boomsheet);
  } catch (error) {
    logError(error);
  }
};

document.getElementById("merge-button")!.onclick = function () {
  const canvas = document.querySelector("#output canvas") as HTMLCanvasElement;
  const textarea = document.querySelector(
    "#output textarea"
  ) as HTMLTextAreaElement;

  try {
    const offscreenCanvas = document.createElement("canvas");
    const animations = mergeSheets(offscreenCanvas, inputSheets);
    dedupSheet(canvas, offscreenCanvas, animations);

    const boomsheet = {
      version: inputSheets.resolveOutputVersion(),
      animations,
    };

    textarea.value = serializeSheet(boomsheet);
  } catch (error) {
    logError(error);
  }
};

document.body.addEventListener("dragover", (event) => event.preventDefault());
document.body.addEventListener("drop", (event) => {
  const items = event.dataTransfer?.items;

  if (!items) {
    return;
  }

  event.preventDefault();

  const files: File[] = [];

  for (const item of items) {
    const file = item.getAsFile();

    if (file) {
      files.push(file);
    }
  }

  loadFiles(files)
    .catch(logError)
    .finally(() => {
      updateSheetList(inputSheets);
    });
});

function baseName(name: string) {
  return name.slice(0, name.lastIndexOf("."));
}

async function loadFiles(files: File[]) {
  for (const file of files) {
    const name = baseName(file.name);
    const entry = inputSheets.findOrInsert(name);

    if (file.name.endsWith(".png")) {
      try {
        entry.image = await loadImageFile(file);
        entry.imageError = undefined;
      } catch (error) {
        console.error(error);
        entry.imageError = error!.toString();
      }
    } else if (
      file.name.endsWith(".animation") ||
      file.name.endsWith(".anim")
    ) {
      try {
        const text = await loadTextFile(file);

        entry.boomsheet = parseSheet(text);
        entry.animations = entry.boomsheet.animations;
        entry.animationError = undefined;
      } catch (error) {
        console.error(error);
        entry.animationError = error!.toString();
      }
    }
  }
}

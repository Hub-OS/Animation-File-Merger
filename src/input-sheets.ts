import { BoomSheet, BoomSheetsAnimation } from "./boomsheets-animations";

export type InputSheet = {
  name: string;
  image?: HTMLImageElement;
  imageError?: string;
  boomsheet?: BoomSheet;
  animations?: BoomSheetsAnimation[];
  animationError?: string;
};

export default class InputSheets {
  sheets: InputSheet[] = [];

  resolveOutputVersion(): BoomSheet["version"] {
    if (this.sheets.some((sheet) => sheet.boomsheet?.version == "modern")) {
      return "modern";
    }
    return "legacy";
  }

  findOrInsert(name: string) {
    let entry = this.sheets.find((data) => data.name == name);

    if (entry) {
      return entry;
    }

    entry = { name };
    this.sheets.push(entry);

    return entry;
  }

  remove(name: string) {
    const index = this.sheets.findIndex((data) => data.name == name);
    this.sheets.splice(index, 1);
  }
}

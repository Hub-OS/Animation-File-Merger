import InputSheets from "./input-sheets";

const listElement = document.getElementById("sheet-list")!;

export function updateSheetList(inputSheets: InputSheets) {
  const itemTemplate = document.getElementById(
    "sheet-list-item-template"
  ) as HTMLTemplateElement;

  listElement.textContent = "";

  for (const entry of inputSheets.sheets) {
    const itemElement = itemTemplate.content.cloneNode(true) as HTMLElement;

    // set name
    const nameElement = itemElement.querySelector(
      ".sheet-name"
    )! as HTMLElement;
    nameElement.innerText = entry.name;

    // set error
    if (!entry.image || !entry.animations) {
      const errorElement = itemElement.querySelector(
        ".error-text"
      )! as HTMLElement;

      if (entry.animationError) {
        errorElement.innerText = entry.animationError;
      } else if (entry.imageError) {
        errorElement.innerText = entry.imageError;
      } else if (!entry.animations) {
        errorElement.innerText = "Missing .animation file";
      } else if (!entry.image) {
        errorElement.innerText = "Missing image file";
      }
    }

    // remove handler
    const removeEntryElement = itemElement.querySelector(
      ".remove-file-button"
    )! as HTMLElement;
    removeEntryElement.onclick = function () {
      inputSheets.remove(entry.name);
      updateSheetList(inputSheets);
    };

    // append
    listElement.appendChild(itemElement);
  }
}

# Changelog

## 1.0.2

- a new icon, shown on the marketplace card and on the extension's button

## 1.0.1

- the panel now uses Drawdy's own colours and font
- the tools are an icon toolbar (Pencil, Eraser, Fill, Pick and Line), with Mirror and Clear set apart
- restyled dropdowns, and the buttons stay at the bottom of the panel

## 1.0.0

First public release

- paint on a 16 × 16, 24 × 24, 32 × 32, 48 × 48 or 64 × 64 grid and place the art on the board as a crisp image with a transparent background
- PICO-8, Game Boy and NES palettes, plus a custom palette of 16 colours that starts as PICO-8
- pencil, eraser, fill, eyedropper and line tools, a mirror toggle for left-right symmetry, and Clear
- switching palette moves every painted pixel to the nearest colour of the new palette; changing size keeps the top-left corner
- ⌘Z and Ctrl+Z undo grid changes in the panel, up to 100 steps, and ⌘⇧Z or Ctrl+Y redo them
- art is exported at whole pixels per cell, up to 1024 px across, with no smoothing, and placed at 8 board units per cell
- select placed art to edit it in the panel and update it in place, keeping its spot, width, layer, frame, group, opacity and lock
- new art lands beside existing content instead of on top of it, and is selected
- size, palette and custom colours are remembered between sessions; nothing is saved while art from the board is being edited
- the grid shrinks to fit the panel, so the tools, swatches and buttons always stay in view
- Escape closes the panel, and the panel follows the board theme while open
- storage and board permissions are asked when the panel first opens, not when the board loads
- a full board, a denied permission or a board that doesn't answer gets a clear message instead of a stuck button

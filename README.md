# Pixel Art Studio

Draw pixel art on your Drawdy board with retro palettes like PICO-8, Game Boy and NES, and place it as a crisp image with a transparent background. The image remembers its pixels, so you can select it later and keep drawing.

![Opening Pixel Art Studio, painting a small sprite with the pencil and fill, switching to the Game Boy palette, placing it on the board and zooming in to show its crisp pixels.](https://raw.githubusercontent.com/mickyngub/drawdy-pixel-art-studio/main/docs/media/pixel-art-studio.gif)

## What it's for

- **Sprites and icons** for game jams, mockups and retro-themed boards.
- **Stickers and decorations**: a heart, a star or a tiny character that stays sharp at any zoom.
- **Art that stays editable**: select a placed piece months later, change a few pixels and update it in place.

## How to use

1. Click the **Pixel Art Studio** button on the right of the board.
2. Choose a **Size** and a **Palette**, then click a colour in the swatches.
3. Paint on the grid with **Pencil**, **Fill**, **Line** and the other tools.
4. Click **Place on board**. The art lands in view, next to anything already there rather than on top of it.
5. To change it later, select it, click **Edit selected**, change the pixels and click **Update**. **Place new** makes a copy instead, and **Stop editing** goes back to making new art.

## Tools and palettes

- **Pencil** paints cells and **Eraser** clears them. Drag to paint a stroke.
- **Fill** floods the touching area of one colour with the selected colour.
- **Pick** takes a colour from the grid, then switches back to the Pencil.
- **Line** draws a straight line from where you press to where you let go.
- **Mirror** makes the Pencil, Eraser and Line also paint the left-right reflection, for symmetric sprites.
- **Clear** empties the whole grid in one step.
- **Sizes**: 16 × 16, 24 × 24, 32 × 32, 48 × 48 and 64 × 64. Changing the size keeps the top-left corner, cropping the grid or adding empty cells.
- **Palettes**: PICO-8 (16 colours), Game Boy (4), NES (55) and Custom (16 colours of your own, set with **Colour**, starting from PICO-8).
- Switching palette moves every painted pixel to the nearest colour in the new one. ⌘Z brings the old colours back exactly.

## Tips

- ⌘Z or Ctrl+Z in the panel undoes your last change to the grid, up to 100 steps, and ⌘⇧Z or Ctrl+Y redoes it. To undo on the board, click the board first. An update takes two board undo steps to reverse.
- Placed art stays crisp when you zoom in: it is exported at whole pixels per cell, up to 64 px per cell for a 16 × 16 grid, with no smoothing.
- Each cell is 8 board units, so a 16 × 16 sprite is 128 units wide. Resize it on the board as you like; Update keeps the new width.
- Escape closes the panel.

## Privacy

- Your drawing stays in the panel and on your board. The panel loads nothing from the internet, and nothing leaves your browser except the art you place on the board.
- Your size, palette and custom colours are saved in this browser for next time. The pixels themselves live only in the art you place.

## Credits and licence

- PICO-8 palette by [Lexaloffle](https://www.lexaloffle.com/pico-8.php). NES palette from [Lospec](https://lospec.com/palette-list/nintendo-entertainment-system). Game Boy palette: the four greens of the original Game Boy screen.
- The extension's code is [MIT](https://github.com/mickyngub/drawdy-pixel-art-studio/blob/main/LICENSE). Building it yourself? See [DEVELOPMENT.md](https://github.com/mickyngub/drawdy-pixel-art-studio/blob/main/DEVELOPMENT.md).

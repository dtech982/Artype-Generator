# Artype-Generator TLDR
Artyping is a browser-based tool for converting images into typewriter-ready ASCII templates. It preserves proportions, tonal gradients, and character placement, allowing artists to manually recreate images on real typewriters such as the Royal KMM.

# Artyping — Typewriter Template Generator

Artyping is a browser-based tool for converting images into **typewriter-ready ASCII templates**, designed specifically for artists working with **real mechanical typewriters** such as the Royal KMM.

Unlike traditional ASCII art generators, Artyping does **not** automate the final artwork. Instead, it produces a precise, letter-by-letter template that preserves image proportions, tonal gradients, and spacing, allowing the artist to manually type the image with full creative control.

---

## Philosophy

Typewriter art is a **manual craft**, not a digital effect.

Artyping exists to assist planning and composition while respecting the physical and mechanical constraints of real typewriters. The output is a guide, not a finished image. Every final decision — pressure, alignment, correction — remains human.

---

## Features

- Drag & drop or file browser image loading
- Live auto-refresh (no render button)
- Rotation, brightness, and contrast controls
- Optional alpha threshold for transparent images
- Grayscale conversion using perceptual luminance
- Posterization into discrete tonal levels
- Royal KMM–compatible character gradients
- Invert light/dark mapping
- Resolution control without image distortion
- Independent horizontal and vertical spacing
- Editable ASCII preview (click to modify characters)
- Export as `.txt` or `.png`
- Runs entirely in the browser (no backend)

---

## How It Works (High-Level)

1. **Load an image**
   - Drag & drop or browse for a file.

2. **Normalize the image**
   - Rotate
   - Remove transparency (optional)
   - Convert to grayscale
   - Adjust brightness and contrast

3. **Reduce tones**
   - Posterize the image into discrete brightness levels.

4. **Sample into letters**
   - Image is sampled into a grid based on the selected resolution.
   - Aspect ratio is preserved automatically.

5. **Map tones to characters**
   - Each tonal level is replaced with a typewriter-safe character.
   - Mapping is fully editable and invertible.

6. **Preview and refine**
   - ASCII preview updates live.
   - Click individual cells to cycle or customize characters.

7. **Export**
   - Download a text template or reference image.

---

## Character Gradients

Artyping is designed around **Royal KMM–compatible characters**.

Example gradient (light → dark): (space) . : i l I T V X A Z N D M W @


- Primarily letters for consistent impressions
- Symbols used sparingly for extreme tones
- Fully customizable by the user

---

## Controls Overview

### Image Controls
- Rotation
- Brightness
- Contrast
- Alpha threshold
- Invert mapping

### Resolution & Spacing
- Letter count (image resolution)
- Horizontal letter spacing
- Vertical line spacing

> Spacing adjustments affect only output layout — the image itself is never stretched or squished.

### Preview
- Zoom (display only; does not affect output)
- Click-to-edit individual characters

---

## Export Formats

### Text (`.txt`)
- Each row corresponds to a physical typed line
- Ideal for direct reference while typing

### Image (`.png`)
- Clean visual reference
- Useful for printing or archival purposes

---

## Intended Use Cases

- Typewriter portrait planning
- Historical or mechanical typography
- Exhibition preparation
- Educational demonstrations
- Analog–digital hybrid workflows

---

## Technical Notes

- Written in plain HTML, CSS, and JavaScript
- Uses the HTML Canvas API for image processing
- No external dependencies
- No data leaves the browser

---

## Limitations (By Design)

- Does not generate finished ASCII art
- Does not simulate typewriter imperfections
- Assumes monospaced output
- Prioritizes mechanical authenticity over automation

---

## License

MIT License  
Use, modify, and adapt freely — attribution appreciated.

---

## Acknowledgments

Inspired by:
- Mechanical typewriter art traditions
- Early ASCII imaging techniques
- The physical constraints of mid-20th-century machines

---

If you use this tool to create work, consider documenting the process — the machine, the ribbon, and the hands matter just as much as the output.




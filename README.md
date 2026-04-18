# Scripture Web App — KJV Single File Version

A browser-based scripture projection app for church use.

## Overview

This version is designed to work with a **single KJV JSON file** instead of separate book JSON files.

It provides:

- scripture reference parsing
- passage lookup from one local JSON file
- clean projection screen for Zoom or projector sharing
- popup display window
- live sync between control and display windows
- chapter navigation
- page navigation for long passages
- theme controls
- clear, black screen, and white screen display modes

## Bible Data Format

This app expects a JSON file at:

```text
public/data/KJV.json
```

The file should be a JSON object where:

- each **key** is a reference like `Genesis 1:1`
- each **value** is the verse text

Example:

```json
{
  "Genesis 1:1": "In the beginning God created the heaven and the earth.",
  "Genesis 1:2": "And the earth was without form, and void..."
}
```

## Current Data Source

This version is set up for your attached KJV JSON file, which uses reference keys like `"Genesis 1:1"` mapped to verse text.

## Folder Structure

```text
app/
  display/
    page.tsx
  globals.css
  layout.tsx
  page.tsx

components/
  control/
    ControlClient.tsx
    PreviewPanel.tsx
    ReferenceInput.tsx
    ThemeControls.tsx
  display/
    DisplayCanvas.tsx
    DisplayClient.tsx
  ui/
    Button.tsx

lib/
  bookMeta.ts
  getAdjacentChapter.ts
  getChapterMeta.ts
  getPassage.ts
  loadBible.ts
  openDisplayWindow.ts
  paginatePassage.ts
  parseReference.ts
  syncOutput.ts

public/
  data/
    KJV.json

styles/
  README.md

types/
  scripture.ts
```

## Setup

1. Place your Bible file here:

```text
public/data/KJV.json
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open in browser:

- Control screen: `http://localhost:3000`
- Projection screen: `http://localhost:3000/display`

## How It Works

### Control Window
The main page is the operator control screen.

You can:

- type a scripture reference
- preview the passage
- open the projection window
- send the passage to the output screen
- move to previous/next chapter
- move to previous/next page
- change font size, colours, alignment, and line height

### Display Window
The `/display` page is the clean projection screen.

It only shows:

- scripture text
- optional reference footer
- current page state

This is the page you can share in Zoom or send to a projector.

## Supported Reference Formats

Examples:

- `John 3`
- `John 3:16`
- `John 3:16-17`
- `Psalm 23`
- `Romans 8:28-31`

## Current Features

- single-file KJV lookup
- chapter-based navigation
- passage pagination
- output sync with `BroadcastChannel`
- `localStorage` fallback
- output popup window
- projection-only display mode

## Notes

- The whole Bible file is loaded once and cached in memory for reuse.
- This is fine for MVP usage with a local browser-based church presentation tool.
- If needed later, the data can be split into book files for performance optimisation.

## Troubleshooting

### “Could not load KJV.json”
Make sure the file exists at:

```text
public/data/KJV.json
```

### Passage not found
Check that:
- the reference format is correct
- the book name matches the parser aliases
- the requested chapter and verse exist in the JSON

### Popup window does not open
Browsers may block popups unless opened by a direct button click.
Use the **Open Output** button manually.

## Recommended Next Improvements

- better presentation styling
- smoother page-splitting rules
- keyboard shortcuts
- service history / recent passages
- saved themes
- fullscreen presentation controls
- lower-third scripture mode for livestream overlays

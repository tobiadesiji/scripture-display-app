# Scripture Web App — Professional Media Bible Controller

A high-performance, browser-based scripture projection application designed for church services, Zoom broadcasts, and live streaming.

## 🚀 Key Capabilities

- **Multi-Translation Engine**: Integrated support for **KJV, NLT, NIV, AMP, and MSG**.
- **Live Sync Technology**: Real-time state synchronization between the controller and display using session-scoped broadcasting.
- **Mobile Remote**: QR-code-based remote control allowing secondary operators to control the screen from anywhere in the building.
- **Measured Pagination**: Intelligent logic that calculates text height to ensure verses are split perfectly across pages without cutting off text.

---

## 🛠 New Operator Features

### 1. Live Feedback System
- **Dynamic "Live" Button**: The Send button automatically turns green and pulses with a white indicator when the current preview matches exactly what is on the output screen.
- **Integrated Pulse Badge**: A "Live on Screen" indicator now sits beside the Preview heading, giving the operator instant confidence without blocking Bible text or metadata.

### 2. Speed & Efficiency
- **Session History**: A "Recent Passages" bar automatically saves the last 5 unique verses for instant one-click recall during unpredictable sermons.
- **Next Up Visual Cue**: The **Next** button pulses blue when a passage has multiple pages, ensuring the operator knows to continue clicking before the speaker finishes the verse.
- **Keyboard Shortcuts**:
  - `Space`: Send current preview to live output.
  - `Arrow Right / Left`: Navigate through pages or adjacent verses.
  - `Escape`: Emergency Clear (Blanks the screen immediately).

### 3. Screen States
- **Passage Mode**: Standard formatted scripture display.
- **Clear Mode**: Blanks the text while retaining the background.
- **Black/White Modes**: Forces the output to pure black or white for lighting transitions or video fades.

---

## 📁 Folder Structure

```text
app/
  display/
    page.tsx        <-- The clean output/projection page
  page.tsx          <-- The main control center logic

components/
  control/
    ControlClient.tsx   <-- The primary controller logic engine
    PreviewPanel.tsx    <-- Real-time operator preview
    ReferenceInput.tsx  <-- Intelligent scripture search bar
    SettingsPanel.tsx   <-- Deep theme, font, and shadow controls
  ui/
    Button.tsx          <-- Optimized interactive elements

lib/
  nltApi.ts             <-- NLT Translation integration
  apiBible.ts           <-- KJV, NIV, AMP, MSG API integration
  syncOutput.ts         <-- Real-time session broadcasting
  paginatePassageMeasured.ts <-- Core layout & text-fitting engine
  session.ts            <-- Remote session & QR management
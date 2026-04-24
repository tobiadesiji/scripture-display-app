export type Verse = {
  book?: string;
  chapter: number;
  verse: number;
  text: string;
  label?: string;
  endVerse?: number;
};
export type BookMeta = {
  name: string;
  slug: string;
  aliases: string[];
  chapters?: number;
};

export type BibleVersion =
  | "KJV"
  | "NLT"
  | "NIV"
  | "AMP"
  | "MSG"
  | "NKJV"
  | "TPT";

export type ParsedReference = {
  book: string;
  slug: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
};

export type PassageBundle = {
  reference: string;
  translation: BibleVersion;
  verses: Verse[];
  pages: Verse[][];
  currentPageIndex: number;
};

export type ScriptureFontFamily =
  | "inter"
  | "montserrat"
  | "merriweather"
  | "source-sans";

export type ScriptureTextShadow = "none" | "soft" | "medium" | "strong";

export type ScriptureTextOutline = "none" | "thin" | "medium";

export type ThemeSettings = {
  fontSize: number;
  textAlign: "left" | "center";
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  showReference: boolean;
  fontFamily: ScriptureFontFamily;
  textShadow: ScriptureTextShadow;
  textOutline: ScriptureTextOutline;
};

export type OutputState =
  | {
      mode: "passage";
      bundle: PassageBundle;
      theme: ThemeSettings;
    }
  | {
      mode: "text";
      title?: string;
      content: string;
      theme: ThemeSettings;
    }
  | {
      mode: "blank" | "black" | "white";
      theme: ThemeSettings;
    };
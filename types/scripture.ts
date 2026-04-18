export type Verse = {
  book?: string;
  chapter: number;
  verse: number;
  text: string;
};

export type BibleVersion = "KJV" | "NLT";

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

export type ThemeSettings = {
  fontSize: number;
  textAlign: "left" | "center";
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  showReference: boolean;
};

export type OutputState =
  | {
      mode: "passage";
      bundle: PassageBundle;
      theme: ThemeSettings;
    }
  | {
      mode: "blank" | "black" | "white";
      theme: ThemeSettings;
    };
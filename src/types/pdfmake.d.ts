declare module 'pdfmake/build/pdfmake' {
  interface TFontDictionary {
    [fontName: string]: {
      normal: string;
      bold: string;
      italics: string;
      bolditalics: string;
    };
  }

  interface PdfMakeStatic {
    vfs: Record<string, string>;
    fonts: TFontDictionary;
    createPdf(
      docDefinition: unknown,
      tableLayouts?: unknown,
      fonts?: TFontDictionary,
      vfs?: Record<string, string>,
    ): {
      download(filename?: string): void;
      open(): void;
      getBlob(cb: (blob: Blob) => void): void;
      getBase64(cb: (data: string) => void): void;
    };
  }

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfsFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default vfsFonts;
}


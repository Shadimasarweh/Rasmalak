declare module 'pdfmake/build/pdfmake' {
  interface TFontDictionary {
    [fontName: string]: {
      normal: string;
      bold: string;
      italics: string;
      bolditalics: string;
    };
  }

  interface VirtualFileSystem {
    existsSync(filename: string): boolean;
    readFileSync(filename: string, encoding?: string): string;
    writeFileSync(filename: string, content: string, encoding?: string): void;
  }

  interface PdfMakeStatic {
    virtualfs: VirtualFileSystem;
    fonts: TFontDictionary;
    createPdf(
      docDefinition: unknown,
      options?: Record<string, unknown>,
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
  const vfsFonts: Record<string, string>;
  export default vfsFonts;
}

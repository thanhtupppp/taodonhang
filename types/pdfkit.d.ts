declare module "pdfkit" {
  import { Readable } from "stream";

  interface PDFDocumentOptions {
    margin?: number;
    size?: string | [number, number];
  }

  interface PDFPage {
    width: number;
    height: number;
    margins: { left: number; right: number; top: number; bottom: number };
  }

  class PDFDocument extends Readable {
    page: PDFPage;
    y: number;

    constructor(options?: PDFDocumentOptions);
    registerFont(name: string, src: string | Buffer): this;
    font(name: string): this;
    fontSize(size: number): this;
    text(
      text: string,
      x?:
        | number
        | {
            align?: "left" | "center" | "right";
            indent?: number;
            width?: number;
          },
      y?: number,
      options?: {
        align?: "left" | "center" | "right";
        indent?: number;
        width?: number;
      },
    ): this;
    moveDown(lines?: number): this;
    fillColor(color: string): this;
    rect(x: number, y: number, width: number, height: number): this;
    stroke(color?: string): this;
    fillAndStroke(fill?: string, stroke?: string): this;
    addPage(): this;
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    end(): this;
  }

  export default PDFDocument;
}

declare module "pdfkit/js/pdfkit.standalone" {
  import PDFDocument from "pdfkit";
  export default PDFDocument;
}

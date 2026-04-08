declare module "formidable" {
  import type { IncomingMessage } from "http";

  export interface File {
    filepath: string;
    originalFilename?: string | null;
    mimetype?: string | null;
    size: number;
  }

  export class IncomingForm {
    constructor(opts?: any);
    parse(
      req: IncomingMessage,
      callback: (err: any, fields: any, files: any) => void
    ): void;
  }
}

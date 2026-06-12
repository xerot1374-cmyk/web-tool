export type RichTextBlock = {
  type: "paragraph" | "bullet" | "number";
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  textAlign?: "left" | "center" | "right";
};

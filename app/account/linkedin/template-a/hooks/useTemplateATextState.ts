"use client";

import { useMemo, useRef, useState } from "react";
import type { RichTextBlock } from "@/app/components/templates/linkedin-shared/LexicalInlineEditor";
import type { BoxTextStyle, EditorTextField, RichEditField, TextMark } from "../lib/templateA.types";
import { copyTextToClipboard, normalizeUrl } from "../lib/templateA.utils";

export default function useTemplateATextState() {
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [badgeText, setBadgeText] = useState("Your Eye Catching Text");
  const [title, setTitle] = useState("Your Tile Goes Here");
  const [body, _setBody] = useState(
    "The main content. You can edit using the rich text editor.",
  );
  const [caption, _setCaption] = useState("");

  const [titleMarks, setTitleMarks] = useState<TextMark[]>([]);
  const [badgeMarks, setBadgeMarks] = useState<TextMark[]>([]);
  const [companyMarks, setCompanyMarks] = useState<TextMark[]>([]);
  const [bodyMarks, setBodyMarks] = useState<TextMark[]>([]);
  const [captionMarks, setCaptionMarks] = useState<TextMark[]>([]);
  const [titleHtml, setTitleHtml] = useState("");
  const [badgeHtml, setBadgeHtml] = useState("");
  const [companyHtml, setCompanyHtml] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [captionHtml, setCaptionHtml] = useState("");
  const [titleBlocks, setTitleBlocks] = useState<RichTextBlock[]>([]);
  const [badgeBlocks, setBadgeBlocks] = useState<RichTextBlock[]>([]);
  const [companyBlocks, setCompanyBlocks] = useState<RichTextBlock[]>([]);
  const [bodyBlocks, setBodyBlocks] = useState<RichTextBlock[]>([]);
  const [captionBlocks, setCaptionBlocks] = useState<RichTextBlock[]>([]);

  const [link, setLink] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [company, setCompany] = useState("PROTOS-3D Metrology GmbH");
  const [activeField, setActiveField] = useState<EditorTextField>("body");
  const [copied, setCopied] = useState(false);

  const badgeRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const companyRef = useRef<HTMLInputElement | null>(null);
  const captionRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [titleStyle, setTitleStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 34,
    color: "#111827",
    textAlign: "left",
  });

  const [bodyBoxStyle, setBodyBoxStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    textAlign: "left",
  });

  const [captionStyle, setCaptionStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 16,
    color: "#111827",
    textAlign: "left",
  });

  const [badgeStyle, setBadgeStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 20,
    color: "#ffffff",
    textAlign: "left",
  });

  const [companyStyle, setCompanyStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#111827",
    textAlign: "left",
  });

  const [headlineStyle, setHeadlineStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 28,
    color: "#111827",
    textAlign: "left",
  });

  const [sublineStyle, setSublineStyle] = useState<BoxTextStyle>({
    fontFamily: "system-ui",
    fontSize: 18,
    color: "#374151",
    textAlign: "left",
  });

  function setBadgeTextValue(v: string) {
    setBadgeText(v);
    setBadgeMarks([]);
    setBadgeBlocks([]);
    setBadgeHtml("");
  }

  function setTitleValue(v: string) {
    setTitle(v);
    setTitleMarks([]);
    setTitleBlocks([]);
    setTitleHtml("");
  }

  function setCompanyValue(v: string) {
    setCompany(v);
    setCompanyMarks([]);
    setCompanyBlocks([]);
    setCompanyHtml("");
  }

  function setBody(v: string) {
    _setBody(v);
    setBodyMarks([]);
    setBodyBlocks([]);
    setBodyHtml("");
  }

  function setCaption(v: string) {
    _setCaption(v);
    setCaptionMarks([]);
    setCaptionBlocks([]);
    setCaptionHtml("");
  }

  const normalizedLink: string | undefined = useMemo(() => {
    const urls = link
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => normalizeUrl(l))
      .filter((v): v is string => Boolean(v));

    return urls.length ? urls.join("\n") : undefined;
  }, [link]);

  function getRichEditText(field: RichEditField) {
    if (field === "title") return title;
    if (field === "company") return company;
    if (field === "badge") return badgeText;
    return body;
  }

  function getRichEditMarks(field: RichEditField) {
    if (field === "title") return titleMarks;
    if (field === "company") return companyMarks;
    if (field === "badge") return badgeMarks;
    return bodyMarks;
  }

  function getRichEditBlocks(field: RichEditField) {
    if (field === "title") return titleBlocks;
    if (field === "company") return companyBlocks;
    if (field === "badge") return badgeBlocks;
    return bodyBlocks;
  }

  function getRichEditHtml(field: RichEditField) {
    if (field === "title") return titleHtml;
    if (field === "company") return companyHtml;
    if (field === "badge") return badgeHtml;
    return bodyHtml;
  }

  function handleAddLink(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && linkInput.trim()) {
      e.preventDefault();
      setLink((prev) => [...prev, linkInput.trim()]);
      setLinkInput("");
    }
  }

  function handleAddHashtag(e: React.KeyboardEvent<HTMLInputElement>) {
    const value = hashtagInput.trim();

    if (e.key === "Enter" && value) {
      e.preventDefault();
      setHashtags((prev) => [
        ...prev,
        value.startsWith("#") ? value : `#${value}`,
      ]);
      setHashtagInput("");
    }
  }

  async function copyCaption(text: string, fieldRef?: HTMLTextAreaElement | HTMLInputElement | null) {
    const ok = await copyTextToClipboard(text, fieldRef);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return {
    headline,
    setHeadline,
    subline,
    setSubline,
    badgeText,
    setBadgeText,
    setBadgeTextValue,
    title,
    setTitle,
    setTitleValue,
    body,
    _setBody,
    setBody,
    caption,
    _setCaption,
    setCaption,
    titleMarks,
    setTitleMarks,
    titleHtml,
    setTitleHtml,
    titleBlocks,
    setTitleBlocks,
    badgeMarks,
    setBadgeMarks,
    badgeHtml,
    setBadgeHtml,
    badgeBlocks,
    setBadgeBlocks,
    companyMarks,
    setCompanyMarks,
    companyHtml,
    setCompanyHtml,
    companyBlocks,
    setCompanyBlocks,
    bodyMarks,
    setBodyMarks,
    bodyHtml,
    setBodyHtml,
    bodyBlocks,
    setBodyBlocks,
    captionHtml,
    setCaptionHtml,
    captionBlocks,
    setCaptionBlocks,
    captionMarks,
    setCaptionMarks,
    link,
    setLink,
    linkInput,
    setLinkInput,
    hashtags,
    setHashtags,
    hashtagInput,
    setHashtagInput,
    company,
    setCompany,
    setCompanyValue,
    activeField,
    setActiveField,
    copied,
    badgeRef,
    titleRef,
    companyRef,
    captionRef,
    bodyRef,
    titleStyle,
    setTitleStyle,
    bodyBoxStyle,
    setBodyBoxStyle,
    captionStyle,
    setCaptionStyle,
    badgeStyle,
    setBadgeStyle,
    companyStyle,
    setCompanyStyle,
    headlineStyle,
    setHeadlineStyle,
    sublineStyle,
    setSublineStyle,
    normalizedLink,
    getRichEditText,
    getRichEditMarks,
    getRichEditBlocks,
    getRichEditHtml,
    handleAddLink,
    handleAddHashtag,
    copyCaption,
  };
}

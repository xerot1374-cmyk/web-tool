"use client";

import { useMemo, useRef, useState } from "react";
import type { BoxTextStyle, EditorTextField, RichEditField, TextMark } from "../lib/templateA.types";
import { copyTextToClipboard, normalizeUrl } from "../lib/templateA.utils";

export default function useTemplateATextState() {
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [badgeText, setBadgeText] = useState("");
  const [title, setTitle] = useState("");
  const [body, _setBody] = useState("");
  const [caption, _setCaption] = useState("");

  const [titleMarks, setTitleMarks] = useState<TextMark[]>([]);
  const [badgeMarks, setBadgeMarks] = useState<TextMark[]>([]);
  const [companyMarks, setCompanyMarks] = useState<TextMark[]>([]);
  const [bodyMarks, setBodyMarks] = useState<TextMark[]>([]);
  const [captionMarks, setCaptionMarks] = useState<TextMark[]>([]);

  const [link, setLink] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [company, setCompany] = useState("PROTOS-3D Metrology GmbH");
  const [activeField, setActiveField] = useState<EditorTextField>("caption");
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
  }

  function setTitleValue(v: string) {
    setTitle(v);
    setTitleMarks([]);
  }

  function setCompanyValue(v: string) {
    setCompany(v);
    setCompanyMarks([]);
  }

  function setBody(v: string) {
    _setBody(v);
    setBodyMarks([]);
  }

  function setCaption(v: string) {
    _setCaption(v);
    setCaptionMarks([]);
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

  function handleAddLink(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && linkInput.trim()) {
      e.preventDefault();
      setLink((prev) => [...prev, linkInput.trim()]);
      setLinkInput("");
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
    badgeMarks,
    setBadgeMarks,
    companyMarks,
    setCompanyMarks,
    bodyMarks,
    setBodyMarks,
    captionMarks,
    setCaptionMarks,
    link,
    setLink,
    linkInput,
    setLinkInput,
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
    handleAddLink,
    copyCaption,
  };
}

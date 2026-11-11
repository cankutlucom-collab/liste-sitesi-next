"use client";

import { useState } from "react";
import { applyCityTokens } from "../../../../lib/cities";

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function TokenChip({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={copied ? "adm-pattern adm-pattern--copied" : "adm-pattern"}>
      <p className="adm-pattern__text"><mark className="adm-token">{token}</mark></p>
      <button type="button" className="adm-pattern__copy" onClick={copy} aria-label={copied ? `${token} kopyalandı` : `${token} kopyala`}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

/** One chip per token, in a row above the title field. The icon copies only that token. */
export default function PatternRow({ tokens }: { tokens: readonly string[] }) {
  return (
    <div className="adm-patterns">
      {tokens.map((token) => <TokenChip key={token} token={token} />)}
    </div>
  );
}

/** Title and description editors. Tokens stay in the box; the line under each box is the text the page will show. */
export function CityMetaFields({
  title, description, cityName, firmCount, titleLimit, descriptionLimit,
}: {
  title: string;
  description: string;
  cityName: string;
  firmCount: number;
  titleLimit: number;
  descriptionLimit: number;
}) {
  const [titleValue, setTitleValue] = useState(title);
  const [descriptionValue, setDescriptionValue] = useState(description);

  return (
    <>
      <div className="adm-field">
        <label htmlFor="meta-baslik">Sayfa başlığı</label>
        <input id="meta-baslik" name="metaTitle" type="text" maxLength={titleLimit}
          value={titleValue} onChange={(event) => setTitleValue(event.target.value)} />
        <small>{applyCityTokens(titleValue, cityName, firmCount)}</small>
      </div>
      <div className="adm-field">
        <label htmlFor="meta-aciklama">Meta açıklama</label>
        <textarea id="meta-aciklama" name="metaDescription" rows={3} maxLength={descriptionLimit}
          value={descriptionValue} onChange={(event) => setDescriptionValue(event.target.value)} />
        <small>{applyCityTokens(descriptionValue, cityName, firmCount)}</small>
      </div>
    </>
  );
}

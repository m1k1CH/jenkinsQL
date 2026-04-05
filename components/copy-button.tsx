"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function CopyButton({
  value,
  label = "Copy"
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    setFailed(false);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopyText(value);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        fallbackCopyText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        setFailed(true);
        setTimeout(() => setFailed(false), 2000);
      }
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
      type="button"
    >
      {failed ? "Copy failed" : copied ? "Copied" : label}
    </button>
  );
}

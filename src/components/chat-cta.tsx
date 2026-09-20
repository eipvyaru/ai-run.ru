"use client";

import type { MouseEvent, ReactNode } from "react";

type ChatCtaProps = {
  children: ReactNode;
  className?: string;
};

export function ChatCta({ children, className = "button" }: ChatCtaProps) {
  function openChat(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const chat = document.getElementById("secretary");
    if (!chat) return;

    history.replaceState(null, "", "#secretary");
    chat.scrollIntoView({ behavior: "smooth", block: "center" });
    chat.classList.remove("chat-highlight");
    window.requestAnimationFrame(() => chat.classList.add("chat-highlight"));
    window.setTimeout(() => chat.classList.remove("chat-highlight"), 900);

    const input = chat.querySelector<HTMLTextAreaElement>("textarea");
    const focusTarget = input && !input.disabled ? input : chat;
    window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 350);
  }

  return <a className={className} href="#secretary" onClick={openChat}>{children}</a>;
}

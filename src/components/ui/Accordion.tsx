"use client";

import { useState, type ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="divide-border border-border divide-y border-y">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`acc-${item.id}`}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="focus-visible:outline-accent flex w-full items-center justify-between py-4 text-left text-sm font-medium focus-visible:outline-2"
              >
                {item.title}
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
            </h3>
            <div id={`acc-${item.id}`} hidden={!isOpen} className="text-text-muted pb-4 text-sm">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

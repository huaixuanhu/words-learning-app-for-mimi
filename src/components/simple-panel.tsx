import type { ReactNode } from "react";

type SimplePanelProps = {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function SimplePanel({ title, children, aside }: SimplePanelProps) {
  return (
    <section className="mimi-panel p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-[#203229]">{title}</h2>
        {aside ? <div className="shrink-0 text-[#5f6d62]">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

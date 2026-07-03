import type { ReactNode } from "react";

type SimplePanelProps = {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function SimplePanel({ title, children, aside }: SimplePanelProps) {
  return (
    <section className="rounded-md border border-[#dfddd6] bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

import type { ReactNode } from "react";

export function SelectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="selection-card">
      <header>
        <h2>{title}</h2>
      </header>
      <fieldset>{children}</fieldset>
    </section>
  );
}

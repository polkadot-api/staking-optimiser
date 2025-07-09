import { useId, type FC, type PropsWithChildren, type ReactNode } from "react";

export const Card: FC<
  PropsWithChildren<{
    title?: ReactNode;
  }>
> = ({ title, children }) => {
  const titleId = useId();

  return (
    <article
      className="p-4 shadow rounded-xl bg-card text-card-foreground"
      role="region"
      aria-labelledby={titleId}
    >
      <h3 id={titleId} className="font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </article>
  );
};

import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    plane: (
      <>
        <path d="m12 3 2.8 7.5L22 15v2l-8-2 .8 5-2.8-1-2.8 1 .8-5-8 2v-2l7.2-4.5z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    star: (
      <path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    book: (
      <>
        <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8v10H3z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      </>
    ),
  };
  return (
    <svg
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.plane}
    </svg>
  );
}
export const Stars = ({ count = 0 }: { count?: number }) => (
  <span className="stars" aria-label={`${count} of 3 stars`}>
    {[1, 2, 3].map((n) => (
      <Icon
        key={n}
        name="star"
        size={15}
        style={{
          fill: n <= count ? "currentColor" : "none",
          opacity: n <= count ? 1 : 0.28,
        }}
      />
    ))}
  </span>
);

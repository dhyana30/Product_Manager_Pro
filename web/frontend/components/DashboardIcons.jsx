/**
 * Small inline SVG icons used by the dashboard.
 * Kept local (no @shopify/polaris-icons dependency) — each renders at 1em
 * and inherits color from its parent via `currentColor`.
 */

const base = {
  width: "1em",
  height: "1em",
  display: "inline-block",
  flexShrink: 0,
  verticalAlign: "middle",
};

export function IconChevronRight({ size = 16, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <path
        d="M7.5 4.5L13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowUpRight({ size = 14, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <path
        d="M6 14L14 6M14 6H7.5M14 6v6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTrendUp({ size = 12, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <path
        d="M3 13.5L8 8.5l3.5 3.5L17 6M17 6h-4.5M17 6v4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheckCircle({ size = 20, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.12" />
      <path
        d="M6.5 10.2l2.2 2.2 4.8-4.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUpload({ size = 18, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <path
        d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4.5 15h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDownload({ size = 18, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <path
        d="M10 4v9m0 0l3.5-3.5M10 13L6.5 9.5M4.5 15h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconInfo({ size = 14, ...rest }) {
  return (
    <svg
      style={{ ...base, width: size, height: size }}
      viewBox="0 0 20 20"
      fill="none"
      {...rest}
    >
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9.25v4.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.75" r="0.9" fill="currentColor" />
    </svg>
  );
}

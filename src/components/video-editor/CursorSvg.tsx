interface CursorSvgProps {
  size?: number;
  className?: string;
}

export function CursorSvg({ size = 24, className }: CursorSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
      }}
    >
      {/* Classic pointer cursor shape - tip at origin (0,0) */}
      <path
        d="M0 0 L0 17.59 L4.86 12.73 L12.08 12.73 L0 0 Z"
        fill="black"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

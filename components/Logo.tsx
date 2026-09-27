export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="WEFIT logo">
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#fafafa" />
      <path
        d="M14 32 20 16h4l3.2 9.4L30.5 16H34l-8.2 16h-3.6L19 22.6 15.8 32H14Z"
        fill="#09090b"
      />
      <circle cx="34.5" cy="31.5" r="2.6" fill="#09090b" />
    </svg>
  );
}

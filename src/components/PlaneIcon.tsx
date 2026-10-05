// One plane <symbol> sits in the map layer (Background). Every icon reuses it.
export function PlaneIcon(props: { size: number; className?: string }) {
  return (
    <svg
      className={props.className ? `plane ${props.className}` : "plane"}
      aria-hidden="true"
      focusable="false"
      width={props.size}
      height={props.size}
    >
      <use href="#plane" />
    </svg>
  );
}

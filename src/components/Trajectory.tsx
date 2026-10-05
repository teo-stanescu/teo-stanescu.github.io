import { PlaneIcon } from "./PlaneIcon";

export function Trajectory() {
  return (
    <>
    <svg
      className="trajectory"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 2 100"
      preserveAspectRatio="none"
    >
      <path className="track" d="M1 0V100" pathLength="1" vectorEffect="non-scaling-stroke" />
      <path className="drawn" d="M1 0V100" pathLength="1" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="tip-plane">
      <PlaneIcon size={16} />
    </div>
    </>
  );
}

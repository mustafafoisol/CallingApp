import type { SVGProps } from "react";

const ICON_SIZE = 17;
const VIEW_BOX = "0 0 18 18";
const STROKE_WIDTH = 1.6;
const DEFAULT_STROKE = "#5C544D";
const DELETE_STROKE = "#D4583F";

type IconProps = SVGProps<SVGSVGElement>;

function MessageActionIcon({
  path,
  stroke = DEFAULT_STROKE,
  ...props
}: IconProps & { path: string; stroke?: string }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox={VIEW_BOX}
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d={path}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <MessageActionIcon
      path="M8 4L3 9l5 5M3 9h7a5 5 0 015 5"
      {...props}
    />
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <MessageActionIcon
      path="M10 4l5 5-5 5M15 9H8a5 5 0 00-5 5"
      {...props}
    />
  );
}

export function EditIcon(props: IconProps) {
  return (
    <MessageActionIcon
      path="M11.5 3.5l3 3L7 14l-3.5.5L4 11z"
      {...props}
    />
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <MessageActionIcon
      path="M4 5h10M7 5V3.5h4V5M5.5 5l.7 9h5.6l.7-9"
      stroke={DELETE_STROKE}
      {...props}
    />
  );
}
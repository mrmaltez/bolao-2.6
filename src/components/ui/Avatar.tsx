import Image from "next/image";
import clsx from "clsx";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm:  { px: 36,  text: "text-sm" },
  md:  { px: 48,  text: "text-base" },
  lg:  { px: 64,  text: "text-xl" },
  xl:  { px: 88,  text: "text-3xl" },
};

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: AvatarProps) {
  const { px, text } = SIZE_MAP[size];
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      className={clsx(
        "relative flex-shrink-0 rounded-full border-[1.5px] border-gold-500/50 shadow-sm overflow-hidden",
        className
      )}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`Avatar de ${name}`}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className={clsx(
            "w-full h-full flex items-center justify-center bg-dark-card",
            text
          )}
        >
          <span className="text-gold-400 font-semibold select-none">
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}

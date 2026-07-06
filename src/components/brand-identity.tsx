import Image from "next/image";

type BrandIdentityProps = {
  variant: "sidebar" | "mobile";
};

export function BrandIdentity({ variant }: BrandIdentityProps) {
  if (variant === "sidebar") {
    return (
      <div className="mimi-brand-card grid gap-3 rounded-md border border-[#afbea9]/30 bg-white/[0.06] p-3 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div className="relative aspect-square overflow-hidden rounded-md border border-[#afbea9]/28 bg-[#24372f]">
          <Image
            src="/brand/mimi-cats.png"
            alt="咪咪的猫咪头像"
            fill
            sizes="188px"
            className="object-cover"
            loading="eager"
          />
        </div>
        <p className="mimi-cjk text-base font-semibold leading-tight text-[#fbf7ee]">咪咪 Vocabulary</p>
      </div>
    );
  }

  return (
    <div className="mimi-brand-card flex items-center gap-3 rounded-md border border-[#afbea9]/24 bg-white/[0.06] px-2 py-2">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-[#afbea9]/28 bg-[#24372f]">
        <Image
          src="/brand/mimi-cats.png"
          alt="咪咪的猫咪头像"
          fill
          sizes="44px"
          className="object-cover"
          loading="eager"
        />
      </div>
      <span className="mimi-cjk text-base font-semibold leading-tight text-[#fbf7ee]">咪咪 Vocabulary</span>
    </div>
  );
}

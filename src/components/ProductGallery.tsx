"use client";

// Фото товара: листаются свайпом, снизу — точки-индикаторы.

import { useRef, useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  title,
  emoji,
  dimmed,
}: {
  images: string[];
  title: string;
  emoji: string;
  dimmed: boolean;
}) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const tone = dimmed ? "grayscale opacity-60" : "";

  if (images.length === 0) {
    return (
      <div className="aspect-square sm:aspect-[4/3] rounded-2xl bg-neutral-100 flex items-center justify-center text-8xl select-none">
        <span className={tone}>{emoji}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl bg-white"
      >
        {images.map((src, i) => (
          <div key={src} className="relative shrink-0 w-full aspect-square sm:aspect-[4/3] snap-center">
            <Image
              src={src}
              alt={i === 0 ? title : ""}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 640px, 100vw"
              className={`object-contain ${tone}`}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              aria-label={`Фото ${i + 1}`}
              onClick={() =>
                strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" })
              }
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-5 bg-emerald-500" : "w-2 bg-neutral-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

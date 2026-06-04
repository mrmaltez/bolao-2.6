"use client";

import { useState } from "react";
import { ZikaModal } from "./ZikaModal";

interface ZikaButtonProps {
  profiles: { id: string; username: string; avatar_url: string | null }[];
  currentUserId: string;
}

export function ZikaButton({ profiles, currentUserId }: ZikaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-400 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.15)] flex items-center justify-center gap-2 text-xs"
      >
        <span className="text-lg">🧿</span> Zique a Mossada
      </button>

      {isOpen && (
        <ZikaModal
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

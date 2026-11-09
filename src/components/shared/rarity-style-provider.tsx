"use client";

import { createContext, useContext } from "react";

export type RarityStyleConfig = {
  rarity: number;
  borderType: "PRESET" | "GRADIENT" | "IMAGE";
  borderConfig: {
    colors: string[];
    angle: number;
  } | null;
  borderImageUrl: string | null;
};

const RarityStyleContext = createContext<RarityStyleConfig[]>([]);

export function RarityStyleProvider({
  styles,
  children,
}: {
  styles: RarityStyleConfig[];
  children: React.ReactNode;
}) {
  return (
    <RarityStyleContext.Provider value={styles}>
      {children}
    </RarityStyleContext.Provider>
  );
}

export function useRarityStyles() {
  return useContext(RarityStyleContext);
}
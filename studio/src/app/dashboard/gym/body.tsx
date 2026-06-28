"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";

interface MuscleBodySelectorProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function MuscleBodySelector({ selectedId, onSelect }: MuscleBodySelectorProps) {
  const { t } = useTranslation();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const muscleGroups = [
    "chest", "back", "shoulders", "biceps", "triceps",
    "forearms", "abs", "traps", "glutes", "hamstrings", "quads",
  ];

  // Load SVG once
  useEffect(() => {
    fetch("/body-03.svg")
      .then((res) => res.text())
      .then(setSvgContent)
      .catch((e) => console.error("Failed to load SVG:", e));
  }, []);

  // Effect to make SVG responsive and add event listeners
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    // Make responsive
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = '100%';

    muscleGroups.forEach((id) => {
      const group = svg.querySelector<SVGGElement>(`g#${id}`);
      if (group) {
        // Store original fill color if not already stored
        if (!group.hasAttribute("data-original-fill")) {
          const path = group.querySelector("path, circle, rect, ellipse");
          group.setAttribute("data-original-fill", path?.getAttribute("fill") || "#cbd5e1");
        }

        const originalFill = group.getAttribute("data-original-fill")!;
        const isSelected = selectedId === id;

        // Set initial color
        group.querySelectorAll("path, circle, rect, ellipse").forEach((el) => {
          el.setAttribute("fill", isSelected ? "#ef4444" : originalFill);
          (el as HTMLElement).style.transition = 'fill 0.2s ease';
        });

        // Use a clean clone for event listeners to avoid stacking them
        const clonedGroup = group.cloneNode(true) as SVGGElement;
        group.parentNode?.replaceChild(clonedGroup, group);

        clonedGroup.addEventListener("click", () => {
          onSelect(id);
        });

        clonedGroup.addEventListener("mouseenter", () => {
          if (selectedId !== id) {
            clonedGroup.querySelectorAll("path, circle, rect, ellipse").forEach((el) => el.setAttribute("fill", "#f87171"));
          }
        });

        clonedGroup.addEventListener("mouseleave", () => {
          if (selectedId !== id) {
            clonedGroup.querySelectorAll("path, circle, rect, ellipse").forEach((el) => el.setAttribute("fill", originalFill));
          }
        });
      }
    });

  }, [svgContent, selectedId, onSelect]);

  if (!svgContent) {
    return (
      <div className="flex justify-center items-center h-[50vh] md:h-[60vh] text-muted-foreground">
        {t('loadingBodySvg')}
      </div>
    );
  }

  return (
    <div className="p-2 pb-5 w-full h-[50vh] md:h-[60vh] space-y-4">
      <div className="relative w-full h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 w-full h-full"
          ref={svgContainerRef}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}

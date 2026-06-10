import { useEffect, useRef } from "react";

const EFFECTS: Record<string, () => Promise<any>> = {
  fog: () => import("vanta/dist/vanta.fog.min"),
  waves: () => import("vanta/dist/vanta.waves.min"),
  birds: () => import("vanta/dist/vanta.birds.min"),
  net: () => import("vanta/dist/vanta.net.min"),
  stars: () => import("vanta/dist/vanta.stars.min"),
  globe: () => import("vanta/dist/vanta.globe.min"),
  clouds: () => import("vanta/dist/vanta.clouds.min"),
  dots: () => import("vanta/dist/vanta.dots.min"),
  halo: () => import("vanta/dist/vanta.halo.min"),
  rings: () => import("vanta/dist/vanta.rings.min"),
  topology: () => import("vanta/dist/vanta.topology.min"),
};

interface VantaBackgroundProps {
  effect: string;
  options?: Record<string, any>;
}

export default function VantaBackground({ effect, options }: VantaBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function init() {
      if (!container) return;

      if (vantaRef.current) {
        try { vantaRef.current.destroy(); } catch {}
        vantaRef.current = null;
      }

      const loader = EFFECTS[effect];
      if (!loader) return;

      const THREE = await import("three");
      if (cancelled) return;

      const mod = await loader();
      if (cancelled) return;

      const effectFn = mod.default || mod;
      if (typeof effectFn !== "function") return;

      vantaRef.current = effectFn({
        el: container,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        ...options,
      });
    }

    void init();

    return () => {
      cancelled = true;
      if (vantaRef.current) {
        try { vantaRef.current.destroy(); } catch {}
        vantaRef.current = null;
      }
    };
  }, [effect, options]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

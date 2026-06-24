/**
 * Ambient type declaration for the bare `framer` import used by every
 * library component. The runtime implementation is provided by the bundler
 * alias (-> ./src/framer-shim.ts) outside Framer, and by Framer itself inside.
 */
declare module "framer" {
  export const ControlType: Record<string, string>;
  export function addPropertyControls(
    component: unknown,
    controls: Record<string, unknown>
  ): void;
  export const RenderTarget: {
    current: () => string;
    canvas: string;
    export: string;
    preview: string;
    thumbnail: string;
  };
  export function useIsStaticRenderer(): boolean;
}

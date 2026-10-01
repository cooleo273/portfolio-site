import type { system } from "@/content/site";

export type NodeId = keyof typeof system.nodes;
export type Shape = "screen" | "tower" | "box" | "small" | "stack" | "cylinder" | "coin";

/** Where each system node sits in the scene (x right, z toward the viewer) and how it looks. */
export const NODE_LAYOUT: Record<NodeId, { pos: [number, number]; shape: Shape; color: string }> = {
  web: { pos: [-5.6, 0.2], shape: "screen", color: "#5BE7FF" },
  api: { pos: [-2.2, 0], shape: "tower", color: "#EDEFE8" },
  auth: { pos: [0.6, -2.8], shape: "box", color: "#B69CFF" },
  escrow: { pos: [1.2, 0.4], shape: "box", color: "#FFD84B" },
  disputes: { pos: [-0.6, 3.4], shape: "small", color: "#FF8A5B" },
  ledger: { pos: [4.2, -0.4], shape: "stack", color: "#C6F432" },
  db: { pos: [4.4, -3.8], shape: "cylinder", color: "#5BE7FF" },
  stripe: { pos: [6.6, 2.6], shape: "coin", color: "#B69CFF" },
  chapa: { pos: [3.6, 4.2], shape: "coin", color: "#C6F432" },
};

export const EDGES: [NodeId, NodeId][] = [
  ["web", "api"],
  ["api", "auth"],
  ["auth", "db"],
  ["api", "escrow"],
  ["disputes", "escrow"],
  ["escrow", "ledger"],
  ["ledger", "db"],
  ["escrow", "stripe"],
  ["escrow", "chapa"],
];

export const edgeKey = (a: NodeId, b: NodeId) => `${a}>${b}`;

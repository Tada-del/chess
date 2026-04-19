export const TIME_CONTROL_PRESETS = [
  { key: "bullet", label: "Bullet 1+0", initialSeconds: 60, incrementSeconds: 0 },
  { key: "blitz", label: "Blitz 3+2", initialSeconds: 180, incrementSeconds: 2 },
  { key: "rapid", label: "Rapid 10+5", initialSeconds: 600, incrementSeconds: 5 },
  { key: "classical", label: "Classical 30+0", initialSeconds: 1800, incrementSeconds: 0 },
] as const;

export const STOCKFISH_MIN_ELO = 100;
export const STOCKFISH_MAX_ELO = 3200;
export const STOCKFISH_ELO_STEP = 100;

export const AI_PERSONALITIES = [
  {
    key: "stockfish",
    label: "Stockfish",
    description: "Pure engine strength with configurable Elo.",
    eloShift: 0,
  },
  {
    key: "claude",
    label: "Claude",
    description: "Balanced and strategic, prioritizes safety.",
    eloShift: -250,
  },
  {
    key: "gemini",
    label: "Gemini",
    description: "Dynamic and tactical with creative attacks.",
    eloShift: -150,
  },
  {
    key: "copilot",
    label: "Copilot",
    description: "Practical and resourceful under pressure.",
    eloShift: -350,
  },
  {
    key: "chatgpt",
    label: "ChatGPT",
    description: "Flexible and initiative-focused play.",
    eloShift: -200,
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    description: "Precise and endgame-centric choices.",
    eloShift: -100,
  },
] as const;

export type AIPersonalityKey = (typeof AI_PERSONALITIES)[number]["key"];

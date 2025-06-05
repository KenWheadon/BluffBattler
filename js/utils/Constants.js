/**
 * Bluff Battle - Game Constants (Fixed)
 * Centralized configuration for all game values
 */

// Card Types
const CARD_TYPES = {
  ROCK: "rock",
  PAPER: "paper",
  SCISSORS: "scissors",
};

// Card Type Display Information
const CARD_INFO = {
  [CARD_TYPES.ROCK]: {
    name: "Rock",
    icon: "🪨",
    defeats: CARD_TYPES.SCISSORS,
    defeatedBy: CARD_TYPES.PAPER,
  },
  [CARD_TYPES.PAPER]: {
    name: "Paper",
    icon: "📄",
    defeats: CARD_TYPES.ROCK,
    defeatedBy: CARD_TYPES.SCISSORS,
  },
  [CARD_TYPES.SCISSORS]: {
    name: "Scissors",
    icon: "✂️",
    defeats: CARD_TYPES.PAPER,
    defeatedBy: CARD_TYPES.ROCK,
  },
};

// Game Configuration
const GAME_CONFIG = {
  GRID_WIDTH: 5,
  GRID_HEIGHT: 3,
  TOTAL_POSITIONS: 15,
  CARDS_PER_HAND: 5,
  VICTORY_POINTS: 10,
  MIN_VICTORY_LEAD: 1,
};

// Scoring Values
const SCORING = {
  ADVANCEMENT: 1, // Points for moving to empty position
  CONTROL: 1, // Points for controlling adjacent positions
  BATTLE_WIN: 1, // Points for winning battles
  CHALLENGE_PENALTY: 1, // Points lost for wrong challenge
};

// Player Types
const PLAYER_TYPES = {
  HUMAN: "human",
  AI: "ai",
};

// Game States
const GAME_STATES = {
  MENU: "menu",
  LOADING: "loading",
  PLAYING: "playing",
  PAUSED: "paused",
  ROUND_END: "round_end",
  GAME_OVER: "game_over",
  TUTORIAL: "tutorial",
};

// Turn Phases
const TURN_PHASES = {
  SETUP: "setup",
  PLACEMENT: "placement",
  BATTLE: "battle",
  SCORING: "scoring",
};

// Player Actions
const PLAYER_ACTIONS = {
  SELECT_CARD: "select_card",
  SELECT_POSITION: "select_position",
  MAKE_CLAIM: "make_claim",
  CHALLENGE_CLAIM: "challenge_claim",
  CONFIRM_PLAY: "confirm_play",
  CANCEL_PLAY: "cancel_play",
};

// Battle Results
const BATTLE_RESULTS = {
  WIN: "win",
  LOSE: "lose",
  ADVANCE: "advance", // Move to empty position
};

// Challenge Results
const CHALLENGE_RESULTS = {
  SUCCESSFUL: "successful", // Challenger was right about bluff
  FAILED: "failed", // Challenger was wrong
  TRUTHFUL: "truthful", // Claim was honest
};

// Grid Position States
const POSITION_STATES = {
  EMPTY: "empty",
  OCCUPIED: "occupied",
  SELECTED: "selected",
  HIGHLIGHTED: "highlighted",
};

// Card States
const CARD_STATES = {
  IN_HAND: "in_hand",
  SELECTED: "selected",
  PLACED: "placed",
  REVEALED: "revealed",
};

// UI States
const UI_STATES = {
  IDLE: "idle",
  CARD_SELECTED: "card_selected",
  POSITION_SELECTED: "position_selected",
  CLAIM_PENDING: "claim_pending",
  WAITING_OPPONENT: "waiting_opponent",
  BATTLE_ANIMATION: "battle_animation",
};

// Event Types (FIXED - removed duplicate PHASE_CHANGE)
const EVENTS = {
  // Game Events
  GAME_START: "game_start",
  GAME_END: "game_end",
  GAME_PAUSE: "game_pause",
  GAME_RESUME: "game_resume",

  // Round Events
  ROUND_START: "round_start",
  ROUND_END: "round_end",

  // Turn Events
  TURN_START: "turn_start",
  TURN_END: "turn_end",
  PHASE_CHANGE: "phase_change",

  // Player Actions
  CARD_SELECTED: "card_selected",
  POSITION_SELECTED: "position_selected",
  CLAIM_MADE: "claim_made",
  CHALLENGE_MADE: "challenge_made",
  PLAY_CONFIRMED: "play_confirmed",
  PLAY_CANCELLED: "play_cancelled",

  // Battle Events
  BATTLE_START: "battle_start",
  BATTLE_RESULT: "battle_result",
  BATTLE_END: "battle_end",

  // Score Events
  SCORE_UPDATE: "score_update",
  POINTS_AWARDED: "points_awarded",

  // Challenge Events
  CHALLENGE_WINDOW_OPEN: "challenge_window_open",
  CHALLENGE_WINDOW_CLOSED: "challenge_window_closed",

  // UI Events
  UI_UPDATE: "ui_update",
  MODAL_SHOW: "modal_show",
  MODAL_HIDE: "modal_hide",
  LOG_MESSAGE: "log_message",

  // Error Events
  ERROR: "error",
  WARNING: "warning",
};

// AI Difficulty Levels
const AI_DIFFICULTY = {
  EASY: {
    name: "Easy",
    bluffRate: 0.2,
    challengeRate: 0.3,
    memoryDepth: 3,
    adaptationRate: 0.1,
  },
  MEDIUM: {
    name: "Medium",
    bluffRate: 0.4,
    challengeRate: 0.5,
    memoryDepth: 5,
    adaptationRate: 0.2,
  },
  HARD: {
    name: "Hard",
    bluffRate: 0.6,
    challengeRate: 0.7,
    memoryDepth: 8,
    adaptationRate: 0.3,
  },
};

// Animation Durations (in milliseconds)
const ANIMATIONS = {
  CARD_FLIP: 300,
  CARD_MOVE: 500,
  BATTLE_RESOLVE: 800,
  SCORE_UPDATE: 400,
  MODAL_FADE: 200,
  BUTTON_PRESS: 100,
  GRID_HIGHLIGHT: 150,
};

// Audio Settings
const AUDIO = {
  MASTER_VOLUME: 0.7,
  SFX_VOLUME: 0.8,
  MUSIC_VOLUME: 0.3,
  SOUNDS: {
    CARD_PLACE: "card_place.mp3",
    CARD_FLIP: "card_flip.mp3",
    BATTLE_WIN: "battle_win.mp3",
    BATTLE_LOSE: "battle_lose.mp3",
    CHALLENGE_SUCCESS: "challenge_success.mp3",
    CHALLENGE_FAIL: "challenge_fail.mp3",
    SCORE_POINT: "score_point.mp3",
    ROUND_END: "round_end.mp3",
    GAME_WIN: "game_win.mp3",
    GAME_LOSE: "game_lose.mp3",
    BUTTON_CLICK: "button_click.mp3",
    UI_HOVER: "ui_hover.mp3",
  },
};

// Local Storage Keys
const STORAGE_KEYS = {
  GAME_SAVE: "bluff_battle_save",
  SETTINGS: "bluff_battle_settings",
  STATISTICS: "bluff_battle_stats",
  AI_MEMORY: "bluff_battle_ai_memory",
  TUTORIAL_COMPLETE: "bluff_battle_tutorial",
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_CARD_SELECTION: "Please select a valid card from your hand",
  INVALID_POSITION: "Please select an empty position on the grid",
  NO_CLAIM_SELECTED: "Please select a claim type for your card",
  POSITION_OCCUPIED: "This position is already occupied",
  CARD_NOT_SELECTED: "Please select a card first",
  SAVE_FAILED: "Failed to save game progress",
  LOAD_FAILED: "Failed to load saved game",
  AUDIO_FAILED: "Audio system initialization failed",
  NETWORK_ERROR: "Network connection error",
};

// Success Messages
const SUCCESS_MESSAGES = {
  GAME_SAVED: "Game progress saved successfully",
  SETTINGS_SAVED: "Settings saved successfully",
  CHALLENGE_SUCCESS: "Challenge successful! Opponent was bluffing.",
  CHALLENGE_FAILED: "Challenge failed. Opponent was truthful.",
  ROUND_WON: "Round won!",
  GAME_WON: "Congratulations! You won the game!",
  GAME_LOST: "Game over. Better luck next time!",
};

// Tutorial Steps
const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Bluff Battle!",
    content: "Learn the art of strategic deception in this tactical card game.",
    target: null,
  },
  {
    id: "objective",
    title: "Game Objective",
    content:
      "Be the first player to reach 10 points with a lead of at least 1 point.",
    target: ".score-display",
  },
  {
    id: "cards",
    title: "Your Cards",
    content:
      "You have Rock, Paper, and Scissors cards. Each type defeats another in classic fashion.",
    target: ".player-hand",
  },
  {
    id: "grid",
    title: "The Battlefield",
    content: "Place your cards on this 5x3 grid. Position matters for battles!",
    target: ".game-grid",
  },
  {
    id: "claims",
    title: "Making Claims",
    content:
      "When placing a card, you must claim what type it is. You can lie!",
    target: ".claim-buttons",
  },
  {
    id: "challenges",
    title: "Challenging Opponents",
    content: "Think your opponent is bluffing? Challenge their claim!",
    target: ".challenge-btn",
  },
  {
    id: "battles",
    title: "Battle Resolution",
    content:
      "After placement, cards battle automatically based on their actual types.",
    target: ".game-grid",
  },
  {
    id: "scoring",
    title: "Scoring Points",
    content:
      "Earn points for advancing, controlling positions, and winning battles.",
    target: ".score-display",
  },
];

// Performance Monitoring
const PERFORMANCE = {
  FPS_TARGET: 60,
  MEMORY_LIMIT_MB: 100,
  LOAD_TIME_TARGET_MS: 3000,
  ANIMATION_BUDGET_MS: 16.67, // 60fps = 16.67ms per frame
  MAX_EVENT_LISTENERS: 50,
};

// Validation Rules
const VALIDATION = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 2,
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 50,
  MIN_CARD_COUNT: 1,
  MAX_CARD_COUNT: 10,
  VALID_GRID_SIZES: [
    { width: 5, height: 3 },
    { width: 3, height: 5 },
    { width: 4, height: 4 },
  ],
};

// Development and Debug
const DEBUG = {
  ENABLED: false, // Set to true for development
  LOG_LEVEL: "info", // 'debug', 'info', 'warn', 'error'
  SHOW_AI_THINKING: false,
  REVEAL_CARDS: false,
  SKIP_ANIMATIONS: false,
  AUTO_PLAY: false,
};

// Export all constants
// Note: In a browser environment without modules, these will be global variables
if (typeof module !== "undefined" && module.exports) {
  // Node.js environment
  module.exports = {
    CARD_TYPES,
    CARD_INFO,
    GAME_CONFIG,
    SCORING,
    PLAYER_TYPES,
    GAME_STATES,
    TURN_PHASES,
    PLAYER_ACTIONS,
    BATTLE_RESULTS,
    CHALLENGE_RESULTS,
    POSITION_STATES,
    CARD_STATES,
    UI_STATES,
    EVENTS,
    AI_DIFFICULTY,
    ANIMATIONS,
    AUDIO,
    STORAGE_KEYS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    TUTORIAL_STEPS,
    PERFORMANCE,
    VALIDATION,
    DEBUG,
  };
}

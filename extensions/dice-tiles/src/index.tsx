import { Action, ActionPanel, Detail, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";

const NB_DICE = 2;
const FACES = 6;
const NB_TILES = 10;
const HP_INIT = 30;

const REWARD_EMOJIS = ["❤️", "💖", "💎", "🏆", "🎖️", "👑"];
const REWARD_THRESHOLDS = [0, 5, 10, 20, 40, 80, 160];
const RANDOM_EMOJIS = ["💎", "🏆", "🌟", "🚀", "🎖️", "🛡️", "🎉", "🔥", "✨", "🥳"];

export default function Command() {
  const [tiles, setTiles] = useState<number[]>(Array.from({ length: NB_TILES }, (_, i) => i + 1));
  const [hp, setHp] = useState(HP_INIT);
  const [lastRoll, setLastRoll] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("Press Enter to roll the dice 🎲");
  const [gameOver, setGameOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [victories, setVictories] = useState<number>(0);
  const [defeats, setDefeats] = useState<number>(0);
  const [randomLifePattern, setRandomLifePattern] = useState<string[]>([]);

  const diceEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];

  useEffect(() => {
    (async () => {
      const v = await LocalStorage.getItem("victories");
      const d = await LocalStorage.getItem("defeats");
      const vNum = v ? Number(v) : 0;
      setVictories(vNum);
      setDefeats(d ? Number(d) : 0);

      if (vNum >= 500) {
        const pattern = Array.from({ length: HP_INIT }, () => RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]);
        setRandomLifePattern(pattern);
      }
    })();
  }, []);

  const saveVictories = async (v: number) => {
    setVictories(v);
    await LocalStorage.setItem("victories", String(v));
    if (v >= 500 && randomLifePattern.length === 0) {
      const pattern = Array.from({ length: HP_INIT }, () => RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]);
      setRandomLifePattern(pattern);
    }
  };

  const saveDefeats = async (d: number) => {
    setDefeats(d);
    await LocalStorage.setItem("defeats", String(d));
  };

  const getLifeEmoji = () => {
    if (victories >= 500) return randomLifePattern.length ? randomLifePattern[0] : RANDOM_EMOJIS[0];
    let idx = REWARD_THRESHOLDS.findIndex((t) => victories < t) - 1;
    if (idx < 0) idx = 0;
    if (idx >= REWARD_EMOJIS.length) idx = REWARD_EMOJIS.length - 1;
    return REWARD_EMOJIS[idx];
  };

  const renderHP = () => {
    if (victories >= 500 && randomLifePattern.length)
      return randomLifePattern.slice(0, Math.min(hp, HP_INIT)).join("") + ` (${hp})`;
    return getLifeEmoji().repeat(Math.min(hp, HP_INIT)) + ` (${hp})`;
  };

  const rollDice = () => {
    if (gameOver) return;
    const res = Array.from({ length: NB_DICE }, () => Math.floor(Math.random() * FACES) + 1);
    setLastRoll(res);
    setSelected([]);
    setMessage(`${diceEmojis[res[0]]}  \n${diceEmojis[res[1]]}`);
  };

  const toggleSelection = (n: number) => {
    if (!tiles.includes(n) || gameOver) return;
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const validateSelection = async () => {
    if (!lastRoll.length || gameOver) return;

    const diceSum = lastRoll.reduce((a, b) => a + b, 0);
    const selectedSum = selected.reduce((a, b) => a + b, 0);

    if (selectedSum === diceSum) {
      setTiles((t) => t.filter((x) => !selected.includes(x)));
      if (tiles.length - selected.length === 0) {
        const newVictories = victories + 1;
        await saveVictories(newVictories);
        setMessage(`🎉 Victory! Cleared all tiles! Total victories: ${newVictories} ${getLifeEmoji()}`);
      } else {
        setMessage(`✅ Good combination! You matched ${selectedSum} 🎯`);
      }
    } else {
      const newHp = Math.max(0, hp - diceSum);
      setHp(newHp);
      setMessage(`❌ Bad combination (${selectedSum} ≠ ${diceSum}) → -${diceSum} HP 💔`);
      if (newHp === 0) {
        await saveDefeats(defeats + 1);
        setGameOver(true);
        setMessage(`💀 Defeat! Total defeats: ${defeats + 1}. Press Enter to restart 🕹️`);
      }
    }

    setSelected([]);
    setLastRoll([]);
  };

  const resetGame = () => {
    setHp(HP_INIT);
    setTiles(Array.from({ length: NB_TILES }, (_, i) => i + 1));
    setLastRoll([]);
    setSelected([]);
    setGameOver(false);
    setShowHelp(false);
    setMessage("New game 🎲 Press Enter to roll the dice!");
  };

  const handleMainAction = () => {
    if (showHelp) setShowHelp(false);
    else if (gameOver) resetGame();
    else if (lastRoll.length === 0) rollDice();
    else validateSelection();
  };

  const renderTiles = () => tiles.map((n) => (selected.includes(n) ? `[${n}]` : `${n}`)).join(" ");

  const nextRewardIndex = REWARD_THRESHOLDS.findIndex((t) => victories < t);
  let rewardTeaser = "";
  if (victories < 500) {
    if (nextRewardIndex >= 0 && nextRewardIndex < REWARD_THRESHOLDS.length) {
      const remaining = REWARD_THRESHOLDS[nextRewardIndex] - victories;
      rewardTeaser = `Next reward in ${remaining} victories 🥳`;
    } else if (victories < 500) {
      rewardTeaser = `Next reward in ${500 - victories} victories 🚀`;
    }
  } else {
    rewardTeaser = "🎇 MAX LEVEL REACHED!";
  }

  const helpMarkdown = `
# 🎲 Dice Tiles - Help

**Rules:**  
- Press Enter to roll dice.  
- Select tiles that sum up to dice roll.  
- Shift + [1-0] to select/deselect tiles.  
- Correct sum → tiles removed ✅  
- Wrong sum → lose HP ❌  
- HP 0 → Defeat 💀  
- Clear all tiles → Victory 🎉  
- Shift + R → Reset game

**Shortcuts:**  
- Shift + 1…0 → Select/Deselect tiles  
- Enter → Roll/Validate/Restart  
- Shift + R → Reset  
- Shift + H → Toggle Help

**Links:**  
- [GitHub Repository](https://github.com/Jumitti/dice-tiles)  
- [Buy Me a Coffee ☕](https://www.buymeacoffee.com/Jumitti)
`;

  const markdown = showHelp
    ? helpMarkdown
    : `
# 🎲 Dice Tiles

**HP: ${renderHP()}**  
**Victories: ${victories}** | **Defeats: ${defeats}**  
${rewardTeaser}

${hp <= 0 ? "💀 Defeat!" : tiles.length === 0 ? `🎉 Victory! ${getLifeEmoji()}` : message}

---

**Remaining tiles:**
\`\`\`
${renderTiles()}
\`\`\`

---

Press Shift + H for Help and Rules
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Main Action" onAction={handleMainAction} />
          <Action title="Toggle Help" onAction={() => setShowHelp(!showHelp)} shortcut={{ key: "h", modifiers: ["shift"] }} />
          {Array.from({ length: NB_TILES }, (_, i) => (
            <Action
              key={i + 1}
              title={`Select/Deselect ${i + 1}`}
              onAction={() => toggleSelection(i + 1)}
              shortcut={{ key: i === 9 ? "0" : `${i + 1}`, modifiers: ["shift"] }}
            />
          ))}
          <Action title="Reset Game" onAction={resetGame} shortcut={{ key: "r", modifiers: ["shift"] }} />
        </ActionPanel>
      }
    />
  );
}

import {useEffect, useState} from "react";
import "./PerformerName.css";

interface PerformerNameProps {
  playerSignal?: string; // "BLUE" | "YELLOW" | "RED"
  isVisible: boolean;
}

const PERFORMER_NAMES: {[key: string]: string} = {
  RED: "Wagyu & JOJI",
  BLUE: "HTK",
  YELLOW: "Carrot",
};

// アニメーション設定
const CHAR_DELAY = 100; // 各文字のアニメーション開始遅延（ミリ秒）

export const PerformerName = ({
  playerSignal,
  isVisible,
}: PerformerNameProps) => {
  const [visibleChars, setVisibleChars] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!playerSignal || !isVisible) {
      setVisibleChars(new Set());
      return;
    }

    const performerName = PERFORMER_NAMES[playerSignal];
    if (!performerName) {
      setVisibleChars(new Set());
      return;
    }

    // リセット
    setVisibleChars(new Set());

    // 各文字を順番に表示
    const chars = performerName.split("");
    const timers: number[] = [];

    chars.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setVisibleChars((prev) => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      }, CHAR_DELAY * index);

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [playerSignal, isVisible]);

  if (!playerSignal || !isVisible) {
    return null;
  }

  const performerName = PERFORMER_NAMES[playerSignal];

  if (!performerName) {
    return null;
  }

  const chars = performerName.split("");

  return (
    <div className="performer-name-container">
      <p className="performer-color-label">{playerSignal}</p>
      <p className="performer-name-text">
        {chars.map((char, index) => (
          <span
            key={index}
            className={`performer-char ${
              visibleChars.has(index) ? "performer-char-visible" : ""
            }`}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </p>
    </div>
  );
};


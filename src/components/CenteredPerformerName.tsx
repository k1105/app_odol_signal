import {useEffect, useState, useMemo} from "react";
import "./CenteredPerformerName.css";

interface CenteredPerformerNameProps {
  playerSignal?: string; // "BLUE" | "YELLOW" | "RED"
}

const PERFORMER_NAMES: {[key: string]: string} = {
  RED: "Wagyu\n&\nJOJI",
  BLUE: "HTK",
  YELLOW: "Carrot",
};

// アニメーション設定
const INITIAL_DELAY = 1000; // 信号受信後の初期待機時間（ミリ秒）
const CHAR_DELAY = 100; // 各文字のアニメーション開始遅延（ミリ秒）
const HOLD_DURATION = 5000; // 全文字表示後の保持時間（ミリ秒）
const EXIT_DELAY = 100; // 各文字が抜けていく間隔（ミリ秒）

// テーマカラー
const THEME_COLORS: {[key: string]: string} = {
  BLUE: "rgb(100, 150, 255)",
  YELLOW: "rgb(255, 255, 0)",
  RED: "rgb(255, 0, 0)",
};

type CharState = "hidden" | "visible" | "exiting";

export const CenteredPerformerName = ({
  playerSignal,
}: CenteredPerformerNameProps) => {
  const [charStates, setCharStates] = useState<Map<number, CharState>>(
    new Map()
  );
  const [isActive, setIsActive] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!playerSignal) {
      setIsActive(false);
      setShouldShow(false);
      setCharStates(new Map());
      return;
    }

    const performerName = PERFORMER_NAMES[playerSignal];
    if (!performerName) {
      setIsActive(false);
      setShouldShow(false);
      setCharStates(new Map());
      return;
    }

    // リセット
    setIsActive(true);
    setShouldShow(false); // 最初は非表示
    setCharStates(new Map());

    // 改行を除いた文字列の長さを計算
    const chars = performerName.split("");
    const visibleChars = chars.filter((char) => char !== "\n");
    const totalChars = visibleChars.length;

    const timers: number[] = [];

    // 1秒待機後にコンポーネントを表示し、アニメーションを開始
    const showTimer = window.setTimeout(() => {
      setShouldShow(true);

      // ブラウザがDOMをレンダリングした後にアニメーションを開始
      // requestAnimationFrameを2回使用して、次のレンダリングフレームを確実に待つ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 各文字のアニメーションを順番に開始
          visibleChars.forEach((_, index) => {
            const timer = window.setTimeout(() => {
              setCharStates((prev) => {
                const newMap = new Map(prev);
                newMap.set(index, "visible");
                return newMap;
              });
            }, CHAR_DELAY * index);

            timers.push(timer);
          });
        });
      });
    }, INITIAL_DELAY);
    timers.push(showTimer);

    // 最後の文字が表示されてから5秒後に抜けていくアニメーション開始
    // requestAnimationFrameの遅延は無視できるほど小さいため、CHAR_DELAYのみで計算
    const fadeInCompleteTime = INITIAL_DELAY + CHAR_DELAY * (totalChars - 1);
    const exitStartTime = fadeInCompleteTime + HOLD_DURATION;

    visibleChars.forEach((_, index) => {
      const exitTimer = window.setTimeout(() => {
        setCharStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(index, "exiting");
          return newMap;
        });
      }, exitStartTime + EXIT_DELAY * index);

      timers.push(exitTimer);
    });

    // 全ての文字が抜けた後、非表示にする
    const hideTimer = window.setTimeout(() => {
      setIsActive(false);
      setShouldShow(false);
      setCharStates(new Map());
    }, exitStartTime + EXIT_DELAY * totalChars + 500);

    timers.push(hideTimer);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [playerSignal]);

  // 文字配列とインデックスマッピングをメモ化
  const {chars, charIndexMap} = useMemo(() => {
    if (!playerSignal) {
      return {chars: [], charIndexMap: new Map<number, number>()};
    }

    const performerName = PERFORMER_NAMES[playerSignal];
    if (!performerName) {
      return {chars: [], charIndexMap: new Map<number, number>()};
    }

    const charsArray = performerName.split("");
    const indexMap = new Map<number, number>();
    let visibleIndex = 0;

    charsArray.forEach((char, originalIndex) => {
      if (char !== "\n") {
        indexMap.set(originalIndex, visibleIndex);
        visibleIndex++;
      }
    });

    return {chars: charsArray, charIndexMap: indexMap};
  }, [playerSignal]);

  if (!playerSignal || !isActive || !shouldShow) {
    return null;
  }

  const themeColor = THEME_COLORS[playerSignal] || "white";

  if (chars.length === 0) {
    return null;
  }

  return (
    <div className="centered-performer-name-container">
      <div className="centered-performer-name-text" style={{color: themeColor}}>
        {chars.map((char, index) => {
          if (char === "\n") {
            return <br key={`br-${index}`} />;
          }

          const visibleCharIndex = charIndexMap.get(index);
          if (visibleCharIndex === undefined) {
            return null;
          }

          // 文字状態を取得（存在しない場合は "hidden"）
          const state = charStates.get(visibleCharIndex) ?? "hidden";

          return (
            <span
              key={`char-${index}`}
              className={`centered-performer-char centered-performer-char-${state}`}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      </div>
    </div>
  );
};

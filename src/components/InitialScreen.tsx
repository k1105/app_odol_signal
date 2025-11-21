import {useEffect, useState} from "react";
import instructionGif from "/assets/instruction.gif";
import initialscreenOverlay from "/assets/frame/initialscreen_overlay.png";
import "./InitialScreen.css";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InitialScreenProps {
  isVisible: boolean;
  onRequestPermissions?: () => void;
  showPermissionRequest?: boolean;
  errorMessage?: string | null;
  errorTitle?: string | null;
  errorSolution?: string[] | null;
  debugInfo?: string | null;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({
  isVisible,
  onRequestPermissions,
  showPermissionRequest = false,
  errorMessage = null,
  errorTitle = null,
  errorSolution = null,
  debugInfo = null,
}) => {
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showManualInstallGuide, setShowManualInstallGuide] = useState(false);

  // 画面サイズの監視
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerHeight < 600);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // PWAインストールプロンプトの処理
  useEffect(() => {
    // PWAが既にインストールされているかチェック
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone ===
        true;

    console.log("[InitialScreen] PWA環境チェック:", {
      isStandalone,
      displayMode: window.matchMedia("(display-mode: standalone)").matches,
      navigatorStandalone: (
        window.navigator as unknown as {standalone?: boolean}
      ).standalone,
    });

    if (isStandalone) {
      console.log(
        "[InitialScreen] PWA環境で動作中 - インストールプロンプトを表示しません"
      );
      setIsInstalled(true);
      return;
    }

    // beforeinstallpromptイベントをリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log(
        "[InitialScreen] beforeinstallpromptイベントを受信しました",
        e
      );
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      console.log("[InitialScreen] deferredPromptを設定しました", {
        platforms: promptEvent.platforms,
      });
      // プロンプトの表示は、isVisibleとdeferredPromptの両方が揃った時に別のuseEffectで処理
    };

    // appinstalledイベントをリッスン
    const handleAppInstalled = () => {
      console.log("[InitialScreen] appinstalledイベントを受信しました");
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // イベントリスナーを登録（isVisibleに関係なく登録）
    console.log(
      "[InitialScreen] beforeinstallpromptイベントリスナーを登録しました"
    );
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // beforeinstallpromptイベントが一定時間内に発火しない場合、
  // 手動インストール方法を案内するUIを表示する
  // ただし、deferredPromptがある場合は自動プロンプトを優先する
  useEffect(() => {
    if (isInstalled || deferredPrompt || showInstallPrompt) return; // deferredPromptがある場合は手動案内を表示しない

    const manualInstallTimer = setTimeout(() => {
      if (!isInstalled && !deferredPrompt && !showInstallPrompt) {
        console.log(
          "[InitialScreen] beforeinstallpromptイベントが発火しなかったため、手動インストール案内を表示します"
        );
        setShowManualInstallGuide(true);
      }
    }, 5000); // 5秒後にチェック

    return () => {
      clearTimeout(manualInstallTimer);
    };
  }, [isInstalled, deferredPrompt, showInstallPrompt]);

  // isVisibleがtrueになった時に、既にdeferredPromptがある場合はプロンプトを表示
  useEffect(() => {
    console.log("[InitialScreen] isVisible/deferredPrompt/isInstalled状態:", {
      isVisible,
      hasDeferredPrompt: !!deferredPrompt,
      isInstalled,
    });

    if (isVisible && deferredPrompt && !isInstalled && !showInstallPrompt) {
      console.log(
        "[InitialScreen] 条件を満たしたため、インストールプロンプトを表示します"
      );
      // 少し遅延させてからプロンプトを表示（ユーザー体験のため）
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
        setShowManualInstallGuide(false); // 自動プロンプトが表示される場合は手動案内を非表示
      }, 1000);
      return () => clearTimeout(timer);
    }

    // isVisibleがtrueで、deferredPromptがない場合、手動インストール案内を表示
    // ただし、deferredPromptが後から設定される可能性があるため、少し待つ
    if (
      isVisible &&
      !deferredPrompt &&
      !isInstalled &&
      !showInstallPrompt &&
      !showManualInstallGuide
    ) {
      const timer = setTimeout(() => {
        // 再度チェックして、deferredPromptがまだない場合のみ表示
        if (!deferredPrompt && !showInstallPrompt) {
          setShowManualInstallGuide(true);
        }
      }, 3000); // 3秒後に手動案内を表示（deferredPromptの設定を待つ）
      return () => clearTimeout(timer);
    }
  }, [
    isVisible,
    deferredPrompt,
    isInstalled,
    showInstallPrompt,
    showManualInstallGuide,
  ]);

  // showInstallPromptの状態を監視
  useEffect(() => {
    console.log("[InitialScreen] showInstallPrompt状態:", showInstallPrompt);
  }, [showInstallPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn("deferredPromptが存在しません");
      return;
    }

    try {
      // プロンプトを表示
      await deferredPrompt.prompt();
      const {outcome} = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("PWAがインストールされました");
        setIsInstalled(true);
      } else {
        console.log("PWAのインストールがキャンセルされました");
      }
    } catch (error) {
      console.error("PWAインストールプロンプトの表示に失敗しました:", error);
    } finally {
      // プロンプトは一度しか使用できないため、クリアする
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  // アニメーション効果
  useEffect(() => {
    if (isVisible) {
      // ロゴのフェードインとスケールアニメーション
      setLogoOpacity(0);
      setLogoScale(0.8);

      setTimeout(() => {
        setLogoOpacity(1);
        setLogoScale(1);
      }, 100);
    } else {
      // フェードアウト
      setLogoOpacity(0);
      setLogoScale(0.8);
    }
  }, [isVisible]);

  // isVisibleがfalseでも、PWAインストールプロンプトは表示できるようにする
  // ただし、メインコンテンツはisVisibleがtrueの時のみ表示
  if (!isVisible && !showInstallPrompt) return null;

  const getPermissionBottom = () => {
    if (showInstallPrompt) {
      return isSmallScreen ? "max(80px, 10svh)" : "max(120px, 15svh)";
    }
    return isSmallScreen ? "max(20px, 3svh)" : "max(60px, 8svh)";
  };

  return (
    <div className="initial-screen">
      {/* オーバーレイ画像 - isVisibleがtrueの時のみ表示 */}
      {isVisible && (
        <img
          src={initialscreenOverlay}
          alt="Overlay"
          className="initial-screen-overlay"
        />
      )}
      {/* メインコンテンツ - isVisibleがtrueの時のみ表示 */}
      {isVisible && (
        <div className="main-content">
          <div
            className="logo-container"
            style={{
              transform: `scale(${logoScale})`,
              opacity: logoOpacity,
            }}
          >
            <img
              src={instructionGif}
              alt="Instruction"
              className="logo-image"
            />
          </div>

          <p className="description-text">
            <span
              style={{
                fontSize: "4rem",
                fontFamily: '"Noto Serif JP", serif',
                lineHeight: "0.5rem",
                position: "relative",
                top: "0.15em",
              }}
            >
              パ
            </span>
            フォーマンス中、
            <br />
            場内には超音波信号が飛び交います。
            <br />
            信号を受信すると、この画面を開く
            <br />
            全てのスマホが一斉に変化します。
          </p>

          {/* 権限要求ボタン - instruction.gifの直下に配置 */}
          {showPermissionRequest && onRequestPermissions && (
            <button
              className="permission-button-simple"
              onClick={onRequestPermissions}
              style={{
                opacity: logoOpacity,
              }}
            >
              マイクとカメラのアクセスを許可
            </button>
          )}

          <div className="performer-text">
            {/* <p>
            Performer
            <br />
            ●: HTK ●: Carrot ●: Wagyu & JOJI
          </p>
          <p>
            VJ / Development <br />
            Kanata Yamagishi
          </p> */}
            <p>11.22.2025 at Sakabito</p>
          </div>
        </div>
      )}

      {/* エラーメッセージの表示 - 画面下部に配置（isVisibleがtrueの時のみ表示） */}
      {isVisible && showPermissionRequest && errorMessage && (
        <div
          className="permission-error-ui"
          style={{
            bottom: getPermissionBottom(),
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 59, 48, 0.15)",
              border: "1px solid rgba(255, 59, 48, 0.5)",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{fontSize: "24px", flexShrink: 0}}>⚠️</div>
              <div style={{flex: 1, minWidth: 0}}>
                {/* エラータイトル */}
                {errorTitle && (
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    {errorTitle}
                  </h4>
                )}

                {/* エラーメッセージ */}
                <p
                  style={{
                    margin: "0 0 12px 0",
                    color: "#fff",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {errorMessage}
                </p>

                {/* 対処方法 */}
                {errorSolution && errorSolution.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "6px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      📱 対処方法：
                    </p>
                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                        color: "#fff",
                        fontSize: "13px",
                        lineHeight: "1.8",
                      }}
                    >
                      {errorSolution.map((step, index) => (
                        <li key={index} style={{marginBottom: "4px"}}>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* デバッグ情報 */}
                {debugInfo && (
                  <>
                    <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      style={{
                        marginTop: "12px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "4px",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {showDebugInfo ? "技術情報を隠す" : "技術情報を表示"}
                    </button>
                    {showDebugInfo && (
                      <pre
                        style={{
                          marginTop: "8px",
                          padding: "8px",
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                          borderRadius: "4px",
                          fontSize: "11px",
                          lineHeight: "1.4",
                          color: "#ccc",
                          overflow: "auto",
                          maxHeight: "120px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {debugInfo}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWAインストール促進UI（自動プロンプト） */}
      {showInstallPrompt && !isInstalled && (
        <div className="install-ui">
          <div className="install-header">
            <div className="install-icon">📱</div>
            <div className="install-content">
              <h3>アプリをインストール</h3>
              <p>ホーム画面に追加して、より快適に使用できます</p>
            </div>
          </div>
          <div className="install-buttons">
            <button className="install-button" onClick={handleInstallClick}>
              インストール
            </button>
            <button
              className="dismiss-button"
              onClick={() => {
                setShowInstallPrompt(false);
                setShowManualInstallGuide(true); // 手動案内を表示
              }}
            >
              後で
            </button>
          </div>
        </div>
      )}

      {/* 手動インストール案内UI（beforeinstallpromptが発火しない場合） */}
      {/* deferredPromptがある場合は自動プロンプトを優先するため、手動案内は非表示 */}
      {showManualInstallGuide &&
        !isInstalled &&
        !showInstallPrompt &&
        !deferredPrompt && (
          <div className="install-ui">
            <div className="install-header">
              <div className="install-icon">📱</div>
              <div className="install-content">
                <h3>アプリをインストール</h3>
                <p style={{fontSize: "13px", lineHeight: "1.6"}}>
                  {/iPhone|iPad|iPod/.test(navigator.userAgent) ? (
                    <>
                      Safariのメニューから
                      <br />
                      「ホーム画面に追加」を選択してください
                    </>
                  ) : /Android/.test(navigator.userAgent) ? (
                    <>
                      ブラウザのメニューから
                      <br />
                      「ホーム画面に追加」を選択してください
                    </>
                  ) : (
                    <>
                      ブラウザのメニューから
                      <br />
                      「インストール」または「アプリとしてインストール」を選択してください
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="install-buttons">
              <button
                className="dismiss-button"
                onClick={() => setShowManualInstallGuide(false)}
                style={{width: "100%"}}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

import {useEffect, useState} from "react";
import odolLogo from "/assets/odol_logo.png";
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
  const [textOpacity, setTextOpacity] = useState(0);
  const [pulseOpacity, setPulseOpacity] = useState(0);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

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
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone ===
        true
    ) {
      setIsInstalled(true);
      return;
    }

    // beforeinstallpromptイベントをリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 少し遅延させてからプロンプトを表示
      setTimeout(() => setShowInstallPrompt(true), 1000);
    };

    // appinstalledイベントをリッスン
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWAがインストールされました");
      setIsInstalled(true);
    } else {
      console.log("PWAのインストールがキャンセルされました");
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
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

      // テキストのフェードイン
      setTimeout(() => {
        setTextOpacity(1);
      }, 800);

      // パルス効果の開始
      setTimeout(() => {
        setPulseOpacity(1);
      }, 1200);
    } else {
      // フェードアウト
      setLogoOpacity(0);
      setTextOpacity(0);
      setPulseOpacity(0);
      setLogoScale(0.8);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // 動的な位置調整 - svhを使用してモバイルブラウザの動的ビューポートに対応
  const getDescriptionBottom = () => {
    if (showPermissionRequest || showInstallPrompt) {
      return isSmallScreen ? "max(120px, 15svh)" : "max(200px, 20svh)";
    }
    return isSmallScreen ? "max(40px, 5svh)" : "max(60px, 8svh)";
  };

  const getPermissionBottom = () => {
    if (showInstallPrompt) {
      return isSmallScreen ? "max(80px, 10svh)" : "max(120px, 15svh)";
    }
    return isSmallScreen ? "max(20px, 3svh)" : "max(60px, 8svh)";
  };

  return (
    <div className="initial-screen">
      {/* 背景のグラデーション効果 */}
      <div className="background-gradient" />

      {/* パルス効果 */}
      <div
        className="pulse-effect"
        style={{
          animation:
            pulseOpacity > 0 ? "pulse 2s ease-in-out infinite" : "none",
          opacity: pulseOpacity,
        }}
      />

      {/* メインコンテンツ */}
      <div className="main-content">
        <div
          className="logo-container"
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          <img src={odolLogo} alt="Odol Signal Logo" className="logo-image" />
        </div>

        {/* 信号待機インジケーター */}
        <div className="signal-indicator" style={{opacity: textOpacity}}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="signal-dot" />
          ))}
        </div>

        {/* 説明テキスト */}
        <div
          className="description-text"
          style={{
            bottom: getDescriptionBottom(),
            opacity: textOpacity * 0.7,
          }}
        >
          <p>
            音声信号を受信すると
            <br />
            リアルタイムでエフェクトが適用されます
          </p>
        </div>
      </div>

      {/* 権限要求UI */}
      {showPermissionRequest && onRequestPermissions && (
        <div
          className="permission-ui"
          style={{
            bottom: getPermissionBottom(),
          }}
        >
          <div className="permission-header">
            <div className="permission-icon">📹</div>
            <div className="permission-content">
              <h3>カメラとマイクの許可</h3>
              <p>このサイトではカメラとマイクを使用します</p>
            </div>
          </div>

          {/* エラーメッセージの表示 */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: "rgba(255, 59, 48, 0.15)",
                border: "1px solid rgba(255, 59, 48, 0.5)",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "12px",
                marginBottom: "8px",
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
          )}

          <button className="permission-button" onClick={onRequestPermissions}>
            {errorMessage ? "再試行" : "許可する"}
          </button>
        </div>
      )}

      {/* PWAインストール促進UI */}
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
              onClick={() => setShowInstallPrompt(false)}
            >
              後で
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

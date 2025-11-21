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
}) => {
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(0);

  // PWA関連のステート
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false); // iOS用ガイド表示フラグ

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // 画面サイズの監視
  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerHeight < 600);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // PWAインストールプロンプトの監視
  useEffect(() => {
    // 既にPWAモードかチェック
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone ===
        true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // ブラウザの自動プロンプトをキャンセル
      setDeferredPrompt(e as BeforeInstallPromptEvent); // イベントを保持
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosGuide(false);
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

  // インストールボタンクリック時のハンドラ
  const handleInstallClick = async () => {
    // 1. Chrome / Android / Edge (native prompt supported)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt(); // ネイティブのインストールダイアログを表示
        const {outcome} = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.error("Install prompt error:", error);
      }
    }
    // 2. iOS / Safari (native prompt NOT supported)
    else {
      // iOSや非対応ブラウザの場合、手動インストールのガイドを表示
      setShowIosGuide(true);
    }
  };

  // アニメーション効果
  useEffect(() => {
    if (isVisible) {
      setLogoOpacity(0);
      setLogoScale(0.8);
      setTimeout(() => {
        setLogoOpacity(1);
        setLogoScale(1);
      }, 100);
    }
  }, [isVisible]);

  if (!isVisible && isInstalled) return null;

  const getPermissionBottom = () => {
    // インストールボタン等がある場合は少し上にずらす
    const baseOffset = !isInstalled
      ? isSmallScreen
        ? 140
        : 180
      : isSmallScreen
      ? 20
      : 60;
    return `${baseOffset}px`;
  };

  // iOSかどうか判定（ガイド表示用）
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="initial-screen">
      {isVisible && (
        <img
          src={initialscreenOverlay}
          alt="Overlay"
          className="initial-screen-overlay"
        />
      )}

      {isVisible && (
        <div className="main-content">
          <div
            className="logo-container"
            style={{transform: `scale(${logoScale})`, opacity: logoOpacity}}
          >
            <img
              src={instructionGif}
              alt="Instruction"
              className="logo-image"
            />
          </div>

          <p className="description-text">
            <span className="description-initial">パ</span>
            フォーマンス中、
            <br />
            場内には超音波信号が飛び交います。
            <br />
            信号を受信すると、この画面を開く
            <br />
            全てのスマホが一斉に変化します。
          </p>

          {showPermissionRequest && onRequestPermissions && (
            <button
              className="permission-button-simple"
              onClick={onRequestPermissions}
              style={{opacity: logoOpacity}}
            >
              マイクとカメラのアクセスを許可
            </button>
          )}

          <div className="performer-text">
            <p>11.22.2025 at Sakabito</p>
          </div>
        </div>
      )}

      {/* エラーメッセージ UI */}
      {isVisible && showPermissionRequest && errorMessage && (
        <div
          className="permission-error-ui"
          style={{bottom: getPermissionBottom()}}
        >
          {/* ...既存のエラーUI（省略なしでそのまま使用してください）... */}
          <div
            style={{
              backgroundColor: "rgba(255, 59, 48, 0.15)",
              border: "1px solid rgba(255, 59, 48, 0.5)",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "left",
            }}
          >
            {/* 既存のコードと同じ内容を記述 */}
            <div style={{display: "flex", gap: "12px"}}>
              <div style={{fontSize: "24px"}}>⚠️</div>
              <div>
                <h4 style={{margin: "0 0 8px 0", color: "#fff"}}>
                  {errorTitle}
                </h4>
                <p style={{margin: 0, color: "#fff", fontSize: "14px"}}>
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 【改善ポイント】
        PWAインストールボタン 
        deferredPromptがある(=Chrome/Android) または iOSの場合に表示 
        インストール済みの場合は表示しない
      */}
      {isVisible &&
        !isInstalled &&
        (deferredPrompt || isIOS) &&
        !showIosGuide && (
          <div className="pwa-install-float">
            <button className="pwa-install-btn" onClick={handleInstallClick}>
              <span className="icon">📱</span> アプリをインストールして参加
            </button>
          </div>
        )}

      {/* iOS用 インストールガイドオーバーレイ */}
      {showIosGuide && (
        <div
          className="ios-install-guide"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="ios-guide-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>ホーム画面に追加</h3>
            <p>
              このアプリはホーム画面に追加することで
              <br />
              本来のパフォーマンスを発揮します。
            </p>
            <ol>
              <li>
                画面下部（または上部）のシェアボタン{" "}
                <span style={{fontSize: "1.2em"}}>Actions</span> をタップ
              </li>
              <li>「ホーム画面に追加」を選択</li>
              <li>右上の「追加」をタップ</li>
            </ol>
            <button onClick={() => setShowIosGuide(false)}>閉じる</button>
          </div>
          <div className="ios-guide-arrow">⬇</div>
        </div>
      )}
    </div>
  );
};

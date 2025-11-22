import {useEffect, useRef} from "react";

// システム設定
const CONFIG = {
  BASE_FREQ: 18000, // 基本周波数
  FREQ_RANGE: 1000, // 周波数範囲
  NUM_CHANNELS: 16, // チャンネル数
  SIGNAL_DURATION: 1.0, // 信号長（秒）
  SAMPLE_RATE: 44100, // サンプリングレート
  FFT_SIZE: 1024, // FFT サイズ
  DETECTION_THRESHOLD: 0.2, // 検出閾値
  SMOOTHING: 0.8, // スムージング係数
};

export interface AudioAnalysisDiagnostics {
  audioContextState: string | null;
  sampleRate: number | null;
  fftSize: number | null;
  channelIntensities: number[]; // 16チャンネルの強度
  detectedChannel: number | null;
  maxIntensity: number;
  detectionThreshold: number;
  isCooldown: boolean;
  lastSignalTime: number | null;
  isDetectionLoopRunning: boolean;
  filterFrequency: number | null;
  filterGain: number | null;
  bufferLength: number | null;
  overallMaxIntensity: number;
}

interface AudioReceiverProps {
  onEffectDetected: (effectId: number) => void;
  availableEffects: number; // 利用可能なエフェクトの数を追加
  onNoSignalDetected?: () => void; // 信号が検出されていない状態を通知
  permissionsGranted?: boolean; // 権限が許可されているかどうか
  audioStream?: MediaStream | null; // 外部から渡されたマイクストリーム
  onAudioLevelChange?: (level: number) => void; // 音声レベルの変更を通知
  onDiagnosticsChange?: (diagnostics: AudioAnalysisDiagnostics) => void; // 診断情報の変更を通知
}

// WebKitAudioContextの型定義
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function AudioReceiver({
  onEffectDetected,
  availableEffects,
  onNoSignalDetected,
  permissionsGranted = false,
  audioStream = null,
  onAudioLevelChange,
  onDiagnosticsChange,
}: AudioReceiverProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastDetectedEffectRef = useRef<number>(-1);
  const effectCooldownRef = useRef<boolean>(false);
  const noSignalTimerRef = useRef<number | null>(null);
  const lastSignalTimeRef = useRef<number>(Date.now());
  const diagnosticsRef = useRef<AudioAnalysisDiagnostics>({
    audioContextState: null,
    sampleRate: null,
    fftSize: null,
    channelIntensities: Array(16).fill(0),
    detectedChannel: null,
    maxIntensity: 0,
    detectionThreshold: CONFIG.DETECTION_THRESHOLD,
    isCooldown: false,
    lastSignalTime: null,
    isDetectionLoopRunning: false,
    filterFrequency: null,
    filterGain: null,
    bufferLength: null,
    overallMaxIntensity: 0,
  });

  // マイクアクセス要求
  const requestMicrophoneAccess = async () => {
    try {
      let stream: MediaStream;

      // 外部から渡されたストリームがある場合はそれを使用
      if (audioStream) {
        stream = audioStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: CONFIG.SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      // AudioContextの作成
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: CONFIG.SAMPLE_RATE,
      });

      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      // フィルターの設定
      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = "highpass";
      // パラメータの設定
      const filter = filterRef.current;
      filter.Q.value = 1;
      filter.frequency.value = 10000;
      filter.gain.value = 40;

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = CONFIG.FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = CONFIG.SMOOTHING;

      microphoneRef.current.connect(filterRef.current);
      filterRef.current.connect(analyserRef.current);

      // 初期診断情報を更新
      updateDiagnostics();

      return true;
    } catch (error) {
      console.error("マイクアクセスエラー:", error);
      return false;
    }
  };

  // 周波数計算
  const getFrequencyForChannel = (channel: number) => {
    const step = CONFIG.FREQ_RANGE / CONFIG.NUM_CHANNELS;
    return CONFIG.BASE_FREQ + (CONFIG.NUM_CHANNELS - channel) * step;
  };

  // 診断情報を更新して通知
  const updateDiagnostics = () => {
    if (!onDiagnosticsChange) return;

    const diagnostics: AudioAnalysisDiagnostics = {
      audioContextState: audioContextRef.current?.state || null,
      sampleRate: audioContextRef.current?.sampleRate || null,
      fftSize: analyserRef.current?.fftSize || null,
      channelIntensities: diagnosticsRef.current.channelIntensities,
      detectedChannel: diagnosticsRef.current.detectedChannel,
      maxIntensity: diagnosticsRef.current.maxIntensity,
      detectionThreshold: CONFIG.DETECTION_THRESHOLD,
      isCooldown: effectCooldownRef.current,
      lastSignalTime: lastSignalTimeRef.current,
      isDetectionLoopRunning: detectionIntervalRef.current !== null,
      filterFrequency: filterRef.current?.frequency.value || null,
      filterGain: filterRef.current?.gain.value || null,
      bufferLength: analyserRef.current?.frequencyBinCount || null,
      overallMaxIntensity: diagnosticsRef.current.overallMaxIntensity,
    };

    diagnosticsRef.current = diagnostics;
    onDiagnosticsChange(diagnostics);
  };

  // 検出ループ開始
  const startDetectionLoop = () => {
    if (!analyserRef.current) {
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    detectionIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let maxIntensity = 0;
      let detectedChannel = -1;
      let overallMaxIntensity = 0;
      const channelIntensities = Array(CONFIG.NUM_CHANNELS).fill(0);

      // 全体的な音声レベルをチェック
      for (let i = 0; i < bufferLength; i++) {
        const intensity = dataArray[i] / 255.0;
        if (intensity > overallMaxIntensity) {
          overallMaxIntensity = intensity;
        }
      }

      // 音声レベルをコールバックで通知
      if (onAudioLevelChange) {
        onAudioLevelChange(overallMaxIntensity);
      }

      // 音声レベルが一定以上の場合のみログを出力（デバッグ用）
      if (overallMaxIntensity > 0.01) {
        // console.log(
        //   `AudioReceiver: 全体的な音声レベル: ${overallMaxIntensity.toFixed(3)}`
        // );
      }

      // 各チャンネルの強度をチェック
      for (let channel = 0; channel < CONFIG.NUM_CHANNELS; channel++) {
        const frequency = getFrequencyForChannel(channel);
        const binIndex = Math.round(
          (frequency * CONFIG.FFT_SIZE) / CONFIG.SAMPLE_RATE
        );

        if (binIndex < bufferLength) {
          let intensity = 0;
          const range = 2;
          for (let i = -range; i <= range; i++) {
            const idx = binIndex + i;
            if (idx >= 0 && idx < bufferLength) {
              intensity += dataArray[idx];
            }
          }
          intensity = intensity / (range * 2 + 1) / 255.0;
          channelIntensities[channel] = intensity;

          if (
            intensity >= CONFIG.DETECTION_THRESHOLD &&
            intensity > maxIntensity
          ) {
            maxIntensity = intensity;
            detectedChannel = channel;
          }
        }
      }

      // 診断情報を更新
      diagnosticsRef.current.channelIntensities = channelIntensities;
      diagnosticsRef.current.detectedChannel =
        detectedChannel !== -1 ? detectedChannel : null;
      diagnosticsRef.current.maxIntensity = maxIntensity;
      diagnosticsRef.current.overallMaxIntensity = overallMaxIntensity;
      updateDiagnostics();

      // エフェクト検出処理
      if (detectedChannel !== -1 && !effectCooldownRef.current) {
        console.log(
          `AudioReceiver: チャンネル ${detectedChannel} を検出 (強度: ${maxIntensity.toFixed(
            3
          )})`
        );

        // 信号を検出した時刻を更新
        lastSignalTimeRef.current = Date.now();

        // 利用可能なエフェクトの範囲内かチェック
        // 信号9-11は特別な信号として常に処理する
        if (
          detectedChannel < availableEffects ||
          (detectedChannel >= 9 && detectedChannel <= 11)
        ) {
          console.log(`AudioReceiver: エフェクト ${detectedChannel} を実行`);
          onEffectDetected(detectedChannel);
          lastDetectedEffectRef.current = detectedChannel;
        } else {
          console.log(
            `AudioReceiver: 未対応のチャンネル ${detectedChannel} (利用可能: ${availableEffects})`
          );
        }

        // クールダウン設定
        effectCooldownRef.current = true;
        setTimeout(() => {
          effectCooldownRef.current = false;
          updateDiagnostics();
        }, 500);
      }

      // 信号が検出されていない状態のチェック
      const timeSinceLastSignal = Date.now() - lastSignalTimeRef.current;
      if (timeSinceLastSignal > 2000 && onNoSignalDetected) {
        // 2秒間信号がない場合
        // 既存のタイマーをクリア
        if (noSignalTimerRef.current) {
          clearTimeout(noSignalTimerRef.current);
        }

        // 新しいタイマーを設定（連続呼び出しを防ぐため）
        noSignalTimerRef.current = window.setTimeout(() => {
          onNoSignalDetected();
        }, 100);
      }
    }, 50);
  };

  // 受信開始
  const startReceiving = async () => {
    if (!audioContextRef.current) {
      const success = await requestMicrophoneAccess();
      if (!success) {
        return;
      }
    }

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    updateDiagnostics();
    startDetectionLoop();
  };

  // 受信停止
  const stopReceiving = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (noSignalTimerRef.current) {
      clearTimeout(noSignalTimerRef.current);
      noSignalTimerRef.current = null;
    }

    effectCooldownRef.current = false;
    lastDetectedEffectRef.current = -1;
  };

  // 自動的に受信を開始
  useEffect(() => {
    console.log("AudioReceiver: 受信開始");

    // 権限が許可されている場合のみ受信開始
    if (!permissionsGranted) {
      return;
    }

    const timer = setTimeout(() => {
      startReceiving();
    }, 100);
    // 少し遅延させてから受信開始

    // クリーンアップ
    return () => {
      console.log("AudioReceiver: クリーンアップ");
      clearTimeout(timer);
      stopReceiving();
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // startReceivingとstopReceivingはrefベースの関数なので、依存配列に含める必要はない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsGranted, audioStream]);

  return null; // UIを表示しない
}

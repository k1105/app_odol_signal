// utils/sparkleConfig.ts
import type {SparkleConfig} from "./sparkleShader";

export const sparklePresets: Record<
  "subtle" | "moderate" | "heavy" | "extreme",
  SparkleConfig
> = {
  subtle: {
    starCount: 1,
    minSize: 0.3,
    maxSize: 1.0,
    spawnProbability: 0.3,
  },
  moderate: {
    starCount: 3,
    minSize: 0.3,
    maxSize: 1.2,
    spawnProbability: 0.5,
  },
  heavy: {
    starCount: 5,
    minSize: 0.3,
    maxSize: 1.2,
    spawnProbability: 0.7,
  },
  extreme: {
    starCount: 10,
    minSize: 0.3,
    maxSize: 1.5,
    spawnProbability: 0.9,
  },
};

export const getSparkleConfigForEffect = (effectId: number): SparkleConfig => {
  switch (effectId) {
    case 0:
      return sparklePresets.moderate;
    default:
      return sparklePresets.moderate;
  }
};

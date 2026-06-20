import { SetMetadata } from '@nestjs/common';

/** Gate a route behind a daily quota (videos/generations) — see UsageLimitGuard. */
export const USAGE_ACTION = 'usageAction';
export type UsageActionType = 'extract' | 'generate';
export const UsageAction = (action: UsageActionType) =>
  SetMetadata(USAGE_ACTION, action);

/** Gate a route behind a boolean plan feature — see FeatureGuard. */
export const REQUIRES_FEATURE = 'requiresFeature';
export const RequiresFeature = (feature: string) =>
  SetMetadata(REQUIRES_FEATURE, feature);

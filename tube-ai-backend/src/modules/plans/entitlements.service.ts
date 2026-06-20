import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PlansService } from './plans.service';
import { Entitlements } from '../../schemas/plan.schema';

/** Safe fallback if no plan is found (should never happen after seed). */
const FALLBACK: Entitlements = {
  videosPerDay: 3,
  generationsPerDay: 15,
  maxVideoDurationSec: 1800,
  librarySize: 50,
  allowedOutputs: ['summary_short', 'chapter_notes', 'quiz', 'flashcards'],
  translation: false,
  playlist: false,
  pdfExport: false,
  aiChat: false,
  removeWatermark: false,
  prioritySupport: false,
};

/**
 * The single source of truth for "what is this user allowed to do" (§20).
 * Every guard/feature check resolves through here.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly users: UsersService,
    private readonly plans: PlansService,
  ) {}

  async forUser(userId: string): Promise<Entitlements> {
    const user = await this.users.findById(userId);
    const key = user?.planKey ?? 'free';
    const plan = (await this.plans.getByKey(key)) ?? (await this.plans.getDefault());
    return (plan?.entitlements as Entitlements) ?? FALLBACK;
  }

  /** True if the plan unlocks a given output ContentType. */
  allowsOutput(ent: Entitlements, contentType: string): boolean {
    return ent.allowedOutputs.includes('all') || ent.allowedOutputs.includes(contentType);
  }

  isUnlimited(value: number): boolean {
    return value === -1;
  }
}

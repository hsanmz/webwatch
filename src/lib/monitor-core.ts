export type StatusEvaluation = {
  status: string;
  consecutiveFailures: number;
  becameDown: boolean;
  becameUp: boolean;
};

export function evaluateStatus(input: {
  currentStatus: string;
  isUp: boolean;
  consecutiveFailures: number;
  failThreshold: number;
}): StatusEvaluation {
  const { currentStatus, isUp, consecutiveFailures, failThreshold } = input;
  const failures = isUp ? 0 : consecutiveFailures + 1;

  let status = currentStatus;
  let becameDown = false;
  let becameUp = false;

  if (!isUp && failures >= failThreshold && currentStatus !== "down") {
    status = "down";
    becameDown = true;
  } else if (isUp) {
    becameUp = currentStatus === "down";
    status = "up";
  }

  return { status, consecutiveFailures: failures, becameDown, becameUp };
}

export function isInCooldown(
  lastNotifiedAt: string | null,
  now: number,
  cooldownMs: number,
): boolean {
  return lastNotifiedAt != null && now - new Date(lastNotifiedAt).getTime() < cooldownMs;
}

export function shouldWarnSsl(input: {
  daysLeft: number;
  lastWarnedAt: string | null;
  now: number;
  warnThresholdDays?: number;
  repeatAfterMs?: number;
}): boolean {
  const { daysLeft, lastWarnedAt, now } = input;
  const threshold = input.warnThresholdDays ?? 7;
  const repeat = input.repeatAfterMs ?? 24 * 60 * 60 * 1000;

  if (daysLeft <= 0 || daysLeft > threshold) return false;
  if (lastWarnedAt != null && now - new Date(lastWarnedAt).getTime() < repeat) return false;
  return true;
}

import { ConfigService } from '@nestjs/config';

// env `ADMIN_USER_IDS`(쉼표 구분 UUID) 파싱 유틸. AdminGuard와 profiles.me
// 응답의 isAdmin 필드에서 공용. env 미설정이면 빈 Set → 어드민 부재로 간주.
//
// Set 캐시 없이 매 호출마다 파싱 — 요청 단위 오버헤드 미미하고, env가
// 런타임에 바뀌는 상황은 없지만 테스트 편의성 유지.

export function parseAdminUserIds(config: ConfigService): Set<string> {
  const raw = config.get<string>('ADMIN_USER_IDS') ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(
  config: ConfigService,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return parseAdminUserIds(config).has(userId);
}

import { SetMetadata } from '@nestjs/common';

// Mark a controller or handler as reachable without a Supabase session.
// The SupabaseAuthGuard reads this metadata via Reflector and skips
// verification when present. Use sparingly — /health-style endpoints only.

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Nickname allows Korean, English letters, digits, and underscore. 2~20 chars.
// Reject leading/trailing whitespace by rejecting whitespace entirely in the
// pattern — makes uniqueness checks stable.
export class UpsertProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[\p{L}\p{N}_]+$/u, {
    message: 'nickname must contain only letters, digits, or underscore',
  })
  nickname!: string;
}

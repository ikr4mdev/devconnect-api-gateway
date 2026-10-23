import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString({
    message:
      'Something went wrong with your reset link. Please request a new one.',
  })
  @Length(32, 64, {
    message:
      'This reset link is invalid. Please request a new one and try again.',
  })
  @Matches(/^[0-9a-fA-F]+$/, {
    message:
      'This reset link is invalid. Please request a new one and try again.',
  })
  token!: string;

  @IsString({ message: 'Please enter a password.' })
  @MinLength(8, {
    message: 'Your password needs to be at least 8 characters long.',
  })
  @MaxLength(128, {
    message: 'Your password is too long. Please use 128 characters or fewer.',
  })
  newPassword!: string;
}

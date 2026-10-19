import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'The verification token must be text.' })
  @IsNotEmpty({ message: 'Please provide a verification token.' })
  @Length(32, 64, {
    message:
      'The verification token appears to be invalid. Please check the link in your email and try again.',
  })
  @Matches(/^[0-9a-fA-F]+$/, {
    message:
      'The verification token contains invalid characters. Please use the exact link from your email.',
  })
  token!: string;
}

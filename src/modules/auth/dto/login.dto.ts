import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsString({ message: 'Password must be string.' })
  @MinLength(1, { message: 'Password is required.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  password!: string;
}

import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsString({ message: 'Password must be string.' })
  @MinLength(8, { message: 'Password is too short (minimum 8 characters).' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  password!: string;
}

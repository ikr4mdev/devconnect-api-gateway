import * as path from 'path';

process.env.JWT_PUBLIC_KEY_PATH = path.resolve(
  __dirname,
  '../../devconnect-auth-service/.keys/jwt-public.pem',
);

process.env.JWT_AUDIENCE = 'gateway';
process.env.JWT_ISSUER = 'devconnect';

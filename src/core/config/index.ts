export { gatewayConfig } from './gateway.config';

// jest.mock('../../../core', () => {
//   const testKeys = generateKeyPairSync('rsa', {
//     modulusLength: 2048,
//     publicKeyEncoding: { type: 'spki', format: 'pem' },
//     privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
//   });

//   return {
//     gatewayConfig: {
//       jwtPublicKey: testKeys.publicKey,
//       audience: 'gateway',
//       issuer: 'devconnect',
//     },
//   };
// });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  cognitoIssuer: process.env.COGNITO_ISSUER ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  awsRegion: process.env.AWS_REGION ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

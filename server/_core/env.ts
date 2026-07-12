export const ENV = {
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  cognitoIssuer: process.env.COGNITO_ISSUER ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  awsRegion: process.env.AWS_REGION ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

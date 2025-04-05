import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

export function initS3ClientWrapper({ bucketName, options }: { bucketName?: string; options?: S3ClientConfig; } = {}) {
	const s3CLient = new S3Client(options);

	return {
		upload: () => {
			s3CLient;
		}
	};
}
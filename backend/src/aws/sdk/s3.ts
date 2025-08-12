import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function initS3ClientWrapper({ bucketName, config }: {
	bucketName: string;
	config?: S3ClientConfig;
}) {
	const s3ClientInstance = new S3Client(config);

	return {
		uploadFile: ({ fileName }: { fileName: string; }) => {
			return s3ClientInstance.send(new PutObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
		},
		getFile: async ({ fileName }: { fileName: string; }) => {
			return await s3ClientInstance.send(new GetObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
		},
		generateSignedUrl: async ({ fileName, commandType, expiresIn = 3600 }: {
			fileName: string;
			expiresIn?: number;
			commandType: 'read' | 'create' | 'delete';
		}) => {
			const input = { Key: fileName, Bucket: bucketName };
			const s3GetCommand = new GetObjectCommand({ ...input });
			const s3UploadCommand = new PutObjectCommand({ ...input });
			const s3DeleteCommand = new DeleteObjectCommand({ ...input });
			return await getSignedUrl(s3ClientInstance, commandType === 'create' ? s3UploadCommand : commandType === 'read' ? s3GetCommand : s3DeleteCommand, { expiresIn });
		},
		deleteFile: async ({ fileName }: { fileName: string; }) => {
			const { DeleteMarker } = await s3ClientInstance.send(new DeleteObjectCommand({
				Key: fileName,
				Bucket: bucketName
			}));
			return DeleteMarker;
		}

	};
}
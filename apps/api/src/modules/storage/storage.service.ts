import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadUrlInput {
  key: string;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly bucket?: string;
  private readonly s3Client?: S3Client;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('R2_BUCKET');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return;
    }

    this.bucket = bucket;
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createSignedUploadUrl(input: UploadUrlInput): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      throw new InternalServerErrorException(
        'Cloudflare R2 configuration is missing',
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }

  async createSignedDownloadUrl(key: string): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      throw new InternalServerErrorException(
        'Cloudflare R2 configuration is missing',
      );
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }
}

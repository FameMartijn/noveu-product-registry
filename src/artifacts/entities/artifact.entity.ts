import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Release } from '../../releases/entities/release.entity';

export enum ArtifactPlatform {
  WORDPRESS = 'wordpress',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  ANDROID = 'android',
  IOS = 'ios',
  UNIVERSAL = 'universal',
}

export enum ArtifactArchitecture {
  X64 = 'x64',
  ARM64 = 'arm64',
  UNIVERSAL = 'universal',
  NA = 'na',
}

@Entity('artifacts')
export class Artifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  releaseId: string;

  @ManyToOne(() => Release, r => r.artifacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseId' })
  release: Release;

  @Column({ type: 'enum', enum: ArtifactPlatform })
  platform: ArtifactPlatform;

  @Column({ type: 'enum', enum: ArtifactArchitecture, default: ArtifactArchitecture.NA })
  architecture: ArtifactArchitecture;

  @Column()
  filename: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  sha256: string;

  @Column({ nullable: true })
  downloadUrl: string;

  @Column({ nullable: true })
  storageKey: string;

  @Column()
  mimeType: string;

  @Column({ default: 0 })
  downloadCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

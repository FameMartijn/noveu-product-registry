import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Artifact } from '../../artifacts/entities/artifact.entity';

export enum ReleaseChannel {
  STABLE = 'stable',
  BETA = 'beta',
  ALPHA = 'alpha',
}

export enum ReleaseStatus {
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
  YANKED = 'yanked',
}

export enum SourceType {
  GITHUB = 'github',
  MINIO = 'minio',
  EXTERNAL_URL = 'external_url',
}

@Entity('releases')
@Unique(['productId', 'version', 'channel'])
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productId: string;

  @ManyToOne(() => Product, p => p.releases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  version: string;

  @Column({ type: 'enum', enum: ReleaseChannel, default: ReleaseChannel.STABLE })
  channel: ReleaseChannel;

  @Column({ type: 'enum', enum: ReleaseStatus, default: ReleaseStatus.PUBLISHED })
  status: ReleaseStatus;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ type: 'timestamp' })
  publishedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'enum', enum: SourceType })
  sourceType: SourceType;

  @Column({ nullable: true })
  githubRepo: string;

  @Column({ nullable: true })
  minioBucket: string;

  @Column({ nullable: true })
  externalBaseUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Artifact, a => a.release)
  artifacts: Artifact[];
}

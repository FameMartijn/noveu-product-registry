import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Release } from '../../releases/entities/release.entity';

export enum DistributionType {
  WORDPRESS_PLUGIN = 'wordpress_plugin',
  DESKTOP_APP = 'desktop_app',
  MOBILE_APP = 'mobile_app',
  WEB_TOOL = 'web_tool',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DistributionType })
  distributionType: DistributionType;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ nullable: true })
  requiredLicenseTier: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Release, r => r.product)
  releases: Release[];
}

import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('stripe_events')
export class StripeEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'varchar', length: 80, name: 'event_type' })
  eventType!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'processed_at' })
  processedAt!: Date;
}

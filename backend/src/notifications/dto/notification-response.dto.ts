export type NotificationTypeDto =
  | 'SCHEDULE_DRAFT_GENERATED'
  | 'SCHEDULE_PUBLISHED'
  | 'SWAP_DECISION'
  | 'SHIFT_CLAIM_DECISION'
  | 'AVAILABILITY_REMINDER';

export class NotificationResponseDto {
  id!: string;
  type!: NotificationTypeDto;
  message!: string;
  read!: boolean;
  createdAt!: string;
}

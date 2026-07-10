import { IsIn, IsOptional } from 'class-validator';

export class ListSwapsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'ACCEPTED', 'REJECTED', 'APPROVED'])
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED';
}

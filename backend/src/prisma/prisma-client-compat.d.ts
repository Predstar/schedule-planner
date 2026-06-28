import '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    availability: any;
    availabilityEntry: any;
    shift: any;
    schedule: any;
    assignment: any;
  }
}

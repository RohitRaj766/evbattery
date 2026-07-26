/**
 * operators/operator.repository.ts
 */

import { Role } from '@prisma/client';
import { prisma } from '../../config/database.config';
import { CreateOperatorDto } from './operator.schema';

export const OperatorRepository = {
  /** Create a new operator */
  create: (data: CreateOperatorDto) =>
    prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: Role.OPERATOR,
        password: null,
        googleId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),

  /** Find operator by email */
  findByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
    }),

  /** Find operator by phone */
  findByPhone: (phone: string) =>
    prisma.user.findUnique({
      where: { phone },
    }),

  /** Find all operators */
  findAll: () =>
    prisma.user.findMany({
      where: { role: Role.OPERATOR },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
};

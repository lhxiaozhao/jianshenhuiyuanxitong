import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

export async function listTrainers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trainers = await User.findAll({
      where: { role: 'trainer', status: 1 },
      attributes: ['id', 'username', 'name', 'storeId'],
      order: [['id', 'ASC']],
    });
    res.json({ list: trainers });
  } catch (err) {
    next(err);
  }
}

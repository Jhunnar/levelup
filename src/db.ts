import Dexie, { type Table } from 'dexie'
import type {
  Profile,
  Exercise,
  Session,
  Routine,
  BodyLog,
  Measurement,
  ProgressPhoto,
  Goal,
  XpEvent,
  AchievementUnlock,
} from './types'
import { seedIfEmpty } from './seed'

export class LevelUpDB extends Dexie {
  profiles!: Table<Profile, string>
  exercises!: Table<Exercise, string>
  sessions!: Table<Session, string>
  routines!: Table<Routine, string>
  bodyLogs!: Table<BodyLog, string>
  measurements!: Table<Measurement, string>
  photos!: Table<ProgressPhoto, string>
  goals!: Table<Goal, string>
  xpEvents!: Table<XpEvent, string>
  unlocks!: Table<AchievementUnlock, string>

  constructor() {
    super('levelup')
    this.version(1).stores({
      profiles: 'id',
      exercises: 'id, group, custom',
      sessions: 'id, profileId, startedAt, finishedAt',
      routines: 'id, profileId',
      bodyLogs: 'id, profileId, date, [profileId+date]',
      measurements: 'id, profileId, date',
      photos: 'id, profileId, date',
      goals: 'id, profileId',
      xpEvents: 'id, profileId, date',
      unlocks: 'id, profileId, achievementId, [profileId+achievementId]',
    })
  }
}

export const db = new LevelUpDB()

let seeding: Promise<void> | null = null
export function initDB(): Promise<void> {
  seeding ??= seedIfEmpty(db)
  return seeding
}

import type { LevelUpDB } from './db'
import type { Exercise, MuscleGroup, Profile } from './types'
import { nowISO } from './types'

const CATALOG: Record<MuscleGroup, string[]> = {
  Pecho: [
    'Press banca con barra',
    'Press banca inclinado con barra',
    'Press banca con mancuernas',
    'Press inclinado con mancuernas',
    'Press declinado',
    'Press en máquina',
    'Aperturas con mancuernas',
    'Aperturas en máquina (contractora)',
    'Cruces en polea',
    'Fondos en paralelas (pecho)',
    'Flexiones',
    'Pullover con mancuerna',
  ],
  Espalda: [
    'Dominadas',
    'Dominadas asistidas',
    'Jalón al pecho',
    'Jalón con agarre cerrado',
    'Remo con barra',
    'Remo con mancuerna',
    'Remo en polea baja',
    'Remo en máquina',
    'Remo T',
    'Peso muerto',
    'Rack pull',
    'Pull-over en polea',
    'Face pull',
    'Hiperextensiones',
  ],
  Hombro: [
    'Press militar con barra',
    'Press militar con mancuernas',
    'Press Arnold',
    'Press en máquina (hombro)',
    'Elevaciones laterales',
    'Elevaciones laterales en polea',
    'Elevaciones frontales',
    'Pájaros (deltoides posterior)',
    'Deltoides posterior en máquina',
    'Encogimientos (trapecio)',
    'Remo al mentón',
  ],
  'Bíceps': [
    'Curl con barra',
    'Curl con barra Z',
    'Curl con mancuernas',
    'Curl alterno',
    'Curl martillo',
    'Curl inclinado',
    'Curl concentrado',
    'Curl en predicador (Scott)',
    'Curl en polea',
  ],
  'Tríceps': [
    'Press francés',
    'Extensión de tríceps en polea',
    'Extensión con cuerda',
    'Extensión sobre la cabeza',
    'Fondos en paralelas (tríceps)',
    'Fondos entre bancos',
    'Patada de tríceps',
    'Press cerrado',
  ],
  'Cuádriceps': [
    'Sentadilla con barra',
    'Sentadilla frontal',
    'Sentadilla goblet',
    'Sentadilla hack',
    'Prensa de piernas',
    'Extensión de cuádriceps',
    'Zancadas con mancuernas',
    'Zancadas con barra',
    'Sentadilla búlgara',
    'Step-up al cajón',
  ],
  Femoral: [
    'Peso muerto rumano',
    'Peso muerto con mancuernas',
    'Curl femoral tumbado',
    'Curl femoral sentado',
    'Buenos días',
    'Curl nórdico',
  ],
  'Glúteo': [
    'Hip thrust',
    'Puente de glúteo',
    'Patada de glúteo en polea',
    'Abducción en máquina',
    'Peso muerto sumo',
    'Frog pumps',
  ],
  Gemelo: [
    'Elevación de talones de pie',
    'Elevación de talones sentado',
    'Elevación de talones en prensa',
  ],
  Core: [
    'Plancha',
    'Plancha lateral',
    'Crunch abdominal',
    'Crunch en polea',
    'Elevación de piernas colgado',
    'Elevación de piernas tumbado',
    'Rueda abdominal',
    'Russian twist',
    'Ab crunch en máquina',
    'Pallof press',
  ],
  'Full body': [
    'Clean and press',
    'Kettlebell swing',
    'Burpees',
    'Farmer walk',
    'Thruster',
    'Battle ropes',
  ],
  Cardio: [
    'Cinta de correr',
    'Bicicleta estática',
    'Elíptica',
    'Remo (máquina de cardio)',
    'Escaleras',
    'Comba',
    'Assault bike',
  ],
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// IDs deterministas + bulkPut: la siembra es idempotente aunque se ejecute
// dos veces en paralelo (StrictMode) o en futuras versiones del catálogo.
export async function seedIfEmpty(db: LevelUpDB): Promise<void> {
  const now = nowISO()

  if ((await db.profiles.count()) === 0) {
    const profiles: Profile[] = [
      { id: 'p-jhunar', name: 'Jhunar', emoji: '⚔️', createdAt: now, updatedAt: now },
      { id: 'p-riaku', name: 'Riaku', emoji: '🐉', createdAt: now, updatedAt: now },
    ]
    await db.profiles.bulkPut(profiles)
  }

  if ((await db.exercises.where('custom').equals(0).count()) === 0) {
    const list: Exercise[] = []
    for (const [group, names] of Object.entries(CATALOG) as [MuscleGroup, string[]][]) {
      for (const name of names) {
        list.push({ id: `ex-${slug(name)}`, name, group, custom: 0, updatedAt: now })
      }
    }
    await db.exercises.bulkPut(list)
  }
}

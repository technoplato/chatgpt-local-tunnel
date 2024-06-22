import * as fs from 'fs'
import * as path from 'path'
import {
  __unsafe_getAllOwnEventDescriptors,
  type ActorRefFrom,
} from 'xstate'
import { logger } from '../logging.ts'
import {
  coordinatorMachine,
  GptCoordinatorMachineId,
} from '../gptCoordinator/coordinator.machine.ts'

export const getPersistentSnapshot = (userId: string) => {
  const snapshotPath = `sessions/${userId}`
  if (fs.existsSync(snapshotPath)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
    return snapshot
  }
  return null
}

export const savePersistentSnapshot = (
  userId: string,
  snapshot: any,
) => {
  const snapshotPath = path.join('sessions', userId)
  const dir = path.dirname(snapshotPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8')
}

import * as fs from 'fs'

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
  const snapshotPath = `sessions/${userId}`
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8')
}

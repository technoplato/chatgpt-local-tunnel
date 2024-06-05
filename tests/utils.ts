import { exec } from 'child_process'

// Define the AppleScript to clear the terminal
const appleScript = `
tell application "Terminal"
    activate
    tell application "System Events"
        keystroke "k" using {command down}
    end tell
end tell
`

// Function to execute the AppleScript
export function clearTerminal() {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing AppleScript: ${error}`)
        return
      }

      if (stderr) {
        reject(`Error output: ${stderr}`)
        return
      }

      resolve(`Output: ${stdout}`)
    })
  })
}

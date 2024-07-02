/**
 * Debounce function
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), waitFor)
  }
}

// Capitalize the first letter of a string
export function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

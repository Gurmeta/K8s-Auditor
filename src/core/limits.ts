export const MAX_INPUT_BYTES = 300 * 1024

export interface TooLarge {
  bytes: number
  limit: number
}

const encoder = new TextEncoder()

/** Returns the size details when the text is over the input limit, otherwise null. */
export function checkInputSize(text: string, limit: number = MAX_INPUT_BYTES): TooLarge | null {
  // A UTF-16 code unit encodes to at most 3 bytes, so short strings can skip the encoding pass.
  if (text.length * 3 <= limit) return null
  const bytes = encoder.encode(text).length
  return bytes > limit ? { bytes, limit } : null
}

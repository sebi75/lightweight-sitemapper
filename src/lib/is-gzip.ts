/**
 *
 * @param buffer
 * @returns {boolean}
 */
export default function isGzip(buffer: Buffer) {
  if (!buffer || buffer.length < 3) {
    return false;
  }

  return buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08;
}

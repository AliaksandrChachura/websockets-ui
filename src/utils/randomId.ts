import { randomBytes } from 'crypto';

const generateRandomId = (length: number = 16): string => {
  return randomBytes(length).toString('hex');
}

export { generateRandomId }

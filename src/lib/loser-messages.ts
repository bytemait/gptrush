import { randomInt } from 'node:crypto';

const secondPlace = [
  'Second place. Second best college of IPU. Sensing a pattern?',
  'Faster than your DSA sheet progress, still one second short.',
  'The riksha from Rithala would\'ve been faster than your fingers, apparently.',
  'One scan away from credits, one metro line away from civilization. Rough week.',
];

const thirdPlace = [
  'Bronze. Same colour as the auditorium wifi bars, mostly.',
  'You beat everyone except the two people who beat you. Groundbreaking stuff.',
  '3rd place — bilkul mid-sem result jaisa. Na fail, na flex-worthy.',
];

const firstFewSeconds = [
  'Itni punctuality 75% attendance mein dikhata toh professor bhi khush ho jate.',
  'Your thumb moved faster than MAIT moves an exam date. Still not enough.',
  'Close enough to smell the credits, far enough to not taste them.',
  'You\'d have made it if you weren\'t still buffering from Rohini\'s signal.',
];

const fifteenToThirtySeconds = [
  'At this point you\'re just here for the group photo.',
  'Half a minute late — bilkul waise hi jaise attendance lag chuki class mein ghusna.',
  'You scanned it like it was an exam clashing with the fest — reluctantly, and too late.',
  'Apni Kaksha bhi itni der se join karta hai kya?',
];

const thirtyToFortyFiveSeconds = [
  'Somewhere between "I tried" and "I was busy filming it for LinkedIn first."',
  'Congratulations, you outlasted the auditorium\'s wifi patience, just not the other 200 people.',
  'You basically did a 20-minute riksha ride\'s worth of waiting in one QR scan.',
  'At this rank, the real treasure was the data pack you burned trying to load this page.',
  'Last but not last-last. MAIT\'s version of a participation trophy.',
];

export type LossMessage = { message: string | null; tier: 'second' | 'third' | 'first-few-seconds' | '15-30-seconds' | '30-45-seconds' | null };

export function chooseLossMessage(rank: number, gapMicroseconds: number): LossMessage {
  let choices: string[];
  let tier: LossMessage['tier'];
  if (rank === 1) { choices = secondPlace; tier = 'second'; }
  else if (rank === 2) { choices = thirdPlace; tier = 'third'; }
  else if (gapMicroseconds < 15_000_000) { choices = firstFewSeconds; tier = 'first-few-seconds'; }
  else if (gapMicroseconds < 30_000_000) { choices = fifteenToThirtySeconds; tier = '15-30-seconds'; }
  else if (gapMicroseconds <= 45_000_000) { choices = thirtyToFortyFiveSeconds; tier = '30-45-seconds'; }
  else return { message: null, tier: null };
  return { message: choices[randomInt(choices.length)], tier };
}

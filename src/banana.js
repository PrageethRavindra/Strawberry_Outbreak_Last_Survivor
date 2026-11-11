const BANANA_URL = 'https://marcconrad.com/uob/banana/api.php?out=json';

async function getPuzzle(fetcher = fetch) {
  const response = await fetcher(BANANA_URL, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Banana API request failed');
  const payload = await response.json();
  if (!Number.isInteger(payload.solution) || payload.solution < 0 || payload.solution > 9)
    throw new Error('Invalid Banana API solution');
  const image = new URL(payload.question);
  if (image.protocol !== 'https:' || !['sanfoh.com', 'www.sanfoh.com', 'marcconrad.com', 'www.marcconrad.com'].includes(image.hostname))
    throw new Error('Unexpected Banana puzzle image URL');
  return { question: image.href, solution: payload.solution };
}
module.exports = { getPuzzle };
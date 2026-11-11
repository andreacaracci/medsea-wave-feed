/* Optional static-portal reader. No build, backend, keys or external libraries.
 * Handles both raw .json.gz and responses already decompressed by HTTP.
 */
export async function loadMarineJson(url, {signal} = {}) {
  const response = await fetch(url, {signal, cache: 'no-cache'});
  if (!response.ok) throw new Error(`Marine history HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let text;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot read gzip archives. Use a browser with DecompressionStream support.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(bytes);
  }
  const data = JSON.parse(text);
  if (data.measurement_type !== 'numerical_model_forecast_not_observation') {
    throw new Error('Unexpected marine data type');
  }
  return data;
}

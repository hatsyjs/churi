import { ChURIPrimitive } from './ch-uri-value.js';
import { PredefinedChURIExt } from './ext/predefined.ch-uri-ext.js';
import { URIChargeBuilder } from './uri-charge-builder.js';
import { URIChargeParser } from './uri-charge-parser.js';
import { URICharge } from './uri-charge.js';

const URIChargeBuilder$instance = /*#__PURE__*/ new URIChargeBuilder<any>();

let URIChargeParser$default: URIChargeParser<any, any> | undefined;

export function createURIChargeParser<TValue>(
  options?: Partial<URIChargeParser.Options<TValue, URICharge<TValue>>>,
): URIChargeParser<TValue, URICharge<TValue>> {
  const { rx = URIChargeBuilder$instance as URIChargeBuilder<TValue>, ext = PredefinedChURIExt } =
    options ?? {};

  if (!options) {
    return (URIChargeParser$default ??= new URIChargeParser({
      rx,
      ext,
    })) as URIChargeParser<TValue, URICharge<TValue>>;
  }

  return new URIChargeParser({ rx, ext }) as URIChargeParser<TValue, URICharge<TValue>>;
}

export function parseURICharge<TValue = ChURIPrimitive>(
  input: string,
  options?: Partial<URIChargeParser.Options<TValue, URICharge<TValue>>>,
): URIChargeParser.Result<URICharge<TValue>> {
  return createURIChargeParser<TValue>(
    options as URIChargeParser.Options<TValue, URICharge<TValue>>,
  ).parse(input);
}

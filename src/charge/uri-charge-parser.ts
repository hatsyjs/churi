import { asis } from '@proc7ts/primitives';
import { ChURIArrayConsumer } from './ch-uri-array-consumer.js';
import { ChURIObjectConsumer } from './ch-uri-object-consumer.js';
import { ChURIValueBuilder } from './ch-uri-value-builder.js';
import { ChURIValueConsumer } from './ch-uri-value-consumer.js';
import { ChURIPrimitive, ChURIValue } from './ch-uri-value.js';

let URIChargeParser$default: URIChargeParser | undefined;

export class URIChargeParser<
  in out TValue extends ChURIPrimitive = ChURIPrimitive,
  out TCharge = ChURIValue,
> {

  static get default(): URIChargeParser {
    return (URIChargeParser$default ??= new URIChargeParser());
  }

  static get<TValue extends ChURIPrimitive, TCharge>(
    options: URIChargeParser.Options<TValue, TCharge>,
  ): URIChargeParser<ChURIPrimitive, TCharge>;

  static get(options?: URIChargeParser.Options.Default): URIChargeParser;

  static get<TValue extends ChURIPrimitive, TCharge>(
    options?: URIChargeParser.Options<TValue, TCharge>,
  ): URIChargeParser<TValue, TCharge> {
    return options
      ? new URIChargeParser(options as URIChargeParser.Options.WithConsumer<TValue, TCharge>)
      : (URIChargeParser.default as URIChargeParser<any, TCharge>);
  }

  readonly #consumer: ChURIValueConsumer<TValue, TCharge>;

  constructor(
    ...options: ChURIValue extends TCharge
      ? [URIChargeParser.Options<TValue, TCharge>?]
      : [URIChargeParser.Options.WithConsumer<TValue, TCharge>]
  );

  constructor(options?: URIChargeParser.Options<TValue, TCharge>) {
    this.#consumer = options?.consumer ?? ChURIValueBuilder$instance;
  }

  parse(input: string): URIChargeParser.Result<TCharge> {
    const keyEnd = input.search(PARENT_PATTERN);

    if (keyEnd < 0) {
      return {
        charge: this.#consumer.set(decodeURIComponent(input), 'string'),
        end: input.length,
      };
    }

    if (input[keyEnd] === ')') {
      // String charge.
      return {
        charge: this.#consumer.set(decodeURIComponent(input.slice(0, keyEnd)), 'string'),
        end: keyEnd,
      };
    }

    if (keyEnd) {
      // Object charge.
      const firstValueOffset = keyEnd + 1;
      const objectConsumer = this.#consumer.startObject();
      const end =
        firstValueOffset
        + parseURIChargeObject(
          decodeURIComponent(input.slice(0, keyEnd)),
          objectConsumer,
          input.slice(firstValueOffset),
        );

      return {
        end,
        charge: objectConsumer.endObject(),
      };
    }

    // Array charge.
    const arrayConsumer = this.#consumer.startArray();
    const end = 1 + parseURIChargeArray(arrayConsumer, input.slice(1));

    return {
      end,
      charge: arrayConsumer.endArray(),
    };
  }

}

export namespace URIChargeParser {
  export type Options<TValue, TCharge> = Options.WithConsumer<TValue, TCharge> | Options.Default;
  export namespace Options {
    export interface Base<in out TValue, out TCharge> {
      readonly consumer?: ChURIValueConsumer<TValue, TCharge> | undefined;
    }
    export interface WithConsumer<in out TValue, TCharge> extends Base<TValue, TCharge> {
      readonly consumer: ChURIValueConsumer<TValue, TCharge>;
    }
    export interface Default extends Base<never, never> {
      readonly consumer?: undefined;
    }
  }
  export interface Result<out TCharge = ChURIValue> {
    readonly charge: TCharge;
    readonly end: number;
  }
}

const ChURIValueBuilder$instance = /*#__PURE__*/ new ChURIValueBuilder<any>();

const PARENT_PATTERN = /[()]/;

function parseURIChargeObject<TValue>(
  key: string,
  consumer: ChURIObjectConsumer<TValue>,
  firstValueInput: string,
): number {
  const to = new ChURIPropertyTarget(key, consumer);

  // Opening parent after key.
  // Parse first property value.
  const firstValueEnd = parseURIChargeValue(to, firstValueInput) + 1; // After closing parent.

  if (firstValueEnd >= firstValueInput.length) {
    // End of input.
    return firstValueInput.length;
  }
  if (firstValueInput[firstValueEnd] === ')') {
    return firstValueEnd;
  }

  // Parse the rest of the object properties.
  return firstValueEnd + parseURIChargeProperties(to, firstValueInput.slice(firstValueEnd));
}

function parseURIChargeProperties<TValue>(
  to: ChURIPropertyTarget<TValue>,
  input: string /* never empty */,
): number {
  let toArray: ChURIElementTarget<TValue> | undefined;
  let offset = 0;

  for (;;) {
    const keyEnd = input.search(PARENT_PATTERN);

    if (keyEnd < 0) {
      toArray?.endArray();
      to.forKey(decodeURIComponent(input)).addSuffix();

      return offset + input.length;
    }

    if (keyEnd) {
      // New key specified explicitly.
      // Otherwise, the previous one reused. Thus, `key(value1)(value2)` is the same as `key(value1)key(value2)`.
      to = to.forKey(decodeURIComponent(input.slice(0, keyEnd)));
      if (toArray) {
        // End preceding array.
        toArray.endArray();
        toArray = undefined;
      }
    }

    if (input[keyEnd] === ')') {
      toArray?.endArray();
      if (keyEnd) {
        to.addSuffix();
      }

      return offset + keyEnd;
    }
    if (!keyEnd && !toArray) {
      // Convert property to array if not converted yet, and continue appending to it.
      toArray = new ChURIElementTarget(to.startArray());
    }

    input = input.slice(keyEnd + 1);
    offset += keyEnd + 1;

    const nextKeyStart = parseURIChargeValue(toArray ?? to, input) + 1;

    if (nextKeyStart >= input.length) {
      toArray?.endArray();

      return offset + input.length;
    }

    input = input.slice(nextKeyStart);
    offset += nextKeyStart;
  }
}

function parseURIChargeArray<TValue>(
  consumer: ChURIArrayConsumer<TValue>,
  firstValueInput: string,
): number {
  const to = new ChURIElementTarget(consumer);

  // Opening parent without preceding key.
  // Parse first element value.
  const firstValueEnd = parseURIChargeValue(to, firstValueInput) + 1; // After closing parent.

  if (firstValueEnd >= firstValueInput.length) {
    // End of input.
    return firstValueInput.length;
  }
  if (firstValueInput[firstValueEnd] === ')') {
    // No more fields.
    return firstValueEnd;
  }

  // Parse the rest of array elements.
  return firstValueEnd + parseURIChargeElements(to, firstValueInput.slice(firstValueEnd));
}

function parseURIChargeElements<TValue>(
  to: ChURIElementTarget<TValue>,
  input: string /* never empty */,
): number {
  let offset = 0;

  for (;;) {
    const keyEnd = input.search(PARENT_PATTERN);

    if (keyEnd < 0) {
      // Suffix treated as trailing object element with suffix.
      // Thus, `(value)suffix` is the same as `(value)(suffix())`.
      const suffixConsumer = to.startObject();

      suffixConsumer.addSuffix(decodeURIComponent(input));
      suffixConsumer.endObject();

      return offset + input.length;
    }

    if (keyEnd) {
      // New key specified explicitly.
      // Add trailing object element and pass the rest of the input there.
      // Thus, `(value1)key(value2)` is the same as `(value1)(key(value2))`.
      const key = decodeURIComponent(input.slice(0, keyEnd));
      const firstValueOffset = keyEnd + 1;
      const objectConsumer = to.startObject();
      const objectEnd =
        offset
        + firstValueOffset
        + parseURIChargeObject(key, objectConsumer, input.slice(firstValueOffset));

      objectConsumer.endObject();

      return objectEnd;
    }

    if (input[0] === ')') {
      return offset;
    }

    input = input.slice(1);
    ++offset;

    const nextKeyStart = parseURIChargeValue(to, input) + 1;

    if (nextKeyStart >= input.length) {
      return offset + input.length;
    }

    input = input.slice(nextKeyStart);
    offset += nextKeyStart;
  }
}

function parseURIChargeValue<TValue>(to: ChURITarget<TValue>, input: string): number {
  const valueEnd = input.search(PARENT_PATTERN);

  if (valueEnd < 0) {
    // Up to the end of input.
    decodeURIChargeValue(to, input);

    return input.length;
  }
  if (input[valueEnd] === ')') {
    // Up to closing parent.
    decodeURIChargeValue(to, input.slice(0, valueEnd));

    return valueEnd;
  }

  // Opening parent.
  if (valueEnd) {
    // Start nested object and parse first property.
    const firstKey = decodeURIComponent(input.slice(0, valueEnd));
    const firstValueOffset = valueEnd + 1;
    const objectConsumer = to.startObject();
    const objectEnd =
      firstValueOffset
      + parseURIChargeObject(firstKey, objectConsumer, input.slice(firstValueOffset));

    objectConsumer.endObject();

    return objectEnd;
  }

  // Empty key. Start nested array and parse first element.

  const arrayConsumer = to.startArray();
  const arrayEnd = parseURIChargeArray(arrayConsumer, input.slice(1)) + 1;

  arrayConsumer.endArray();

  return arrayEnd;
}

function decodeURIChargeValue<TValue>(to: ChURITarget<TValue>, input: string): void {
  if (!input) {
    // Empty string treated as empty object.
    to.startObject().endObject();
  } else {
    const decoder = URI_CHARGE_DECODERS[input[0]];

    if (decoder) {
      decoder(to, input);
    } else {
      decodeStringURICharge(to, input);
    }
  }
}

const URI_CHARGE_DECODERS: {
  [firstChar: string]: <TValue>(to: ChURITarget<TValue>, input: string) => void;
} = {
  '!': decodeExclamationPrefixedURICharge,
  '-': decodeMinusSignedURICharge,
  0: decodeUnsignedURICharge,
  1: decodeNumberURICharge,
  2: decodeNumberURICharge,
  3: decodeNumberURICharge,
  4: decodeNumberURICharge,
  5: decodeNumberURICharge,
  6: decodeNumberURICharge,
  7: decodeNumberURICharge,
  8: decodeNumberURICharge,
  9: decodeNumberURICharge,
  "'": decodeQuotedURICharge,
};

function decodeExclamationPrefixedURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  if (input.length === 1) {
    to.set(true, 'boolean');
  } else {
    decodeStringURICharge(to, input);
  }
}

function decodeMinusSignedURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  if (input.length === 1) {
    to.set(false, 'boolean');
  } else if (input === '--') {
    to.startArray().endArray();
  } else {
    const secondChar = input[1];

    if (secondChar >= '0' && secondChar <= '9') {
      decodeNumericURICharge(to, input, 1, negate);
    } else {
      decodeStringURICharge(to, input);
    }
  }
}

function decodeNumberURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  to.set(Number(input), 'number');
}

function decodeQuotedURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  to.set(decodeURIComponent(input.slice(1)), 'string');
}

function decodeStringURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  to.set(decodeURIComponent(input), 'string');
}

function decodeUnsignedURICharge<TValue>(to: ChURITarget<TValue>, input: string): void {
  decodeNumericURICharge(to, input, 0, asis);
}

function negate<T extends number | bigint>(value: T): T {
  return -value as T;
}

function decodeNumericURICharge<TValue>(
  to: ChURITarget<TValue>,
  input: string,
  offset: number,
  sign: <T extends number | bigint>(value: T) => T,
): void {
  if (input[offset + 1] === 'n') {
    to.set(sign(input.length < offset + 3 ? 0n : BigInt(input.slice(offset + 2))), 'bigint');
  } else {
    to.set(sign(input.length < offset + 3 ? 0 : Number(input.slice(offset))), 'number');
  }
}

type ChURITarget<TValue> = ChURIValueConsumer<TValue>;

class ChURIPropertyTarget<TValue>
  extends ChURIValueConsumer<TValue>
  implements ChURITarget<TValue> {

  readonly #key: string;
  readonly #consumer: ChURIObjectConsumer<TValue>;

  constructor(key: string, consumer: ChURIObjectConsumer<TValue>) {
    super();
    this.#key = key;
    this.#consumer = consumer;
  }

  forKey(key: string): ChURIPropertyTarget<TValue> {
    return new ChURIPropertyTarget(key, this.#consumer);
  }

  set(value: ChURIValue<TValue>, type: string): void {
    this.#consumer.put(this.#key, value, type);
  }

  addSuffix(): void {
    this.#consumer.addSuffix(this.#key);
  }

  startObject(): ChURIObjectConsumer<TValue> {
    return this.#consumer.startObject(this.#key);
  }

  startArray(): ChURIArrayConsumer<TValue> {
    return this.#consumer.startArray(this.#key);
  }

}

class ChURIElementTarget<TValue> extends ChURIValueConsumer<TValue> implements ChURITarget<TValue> {

  readonly #consumer: ChURIArrayConsumer<TValue>;

  constructor(consumer: ChURIArrayConsumer<TValue>) {
    super();
    this.#consumer = consumer;
  }

  set(value: ChURIValue<TValue>, type: string): void {
    this.#consumer.add(value, type);
  }

  startObject(): ChURIObjectConsumer<TValue> {
    return this.#consumer.startObject();
  }

  startArray(): ChURIArrayConsumer<TValue> {
    return this.#consumer.startArray();
  }

  endArray(): void {
    this.#consumer.endArray();
  }

}

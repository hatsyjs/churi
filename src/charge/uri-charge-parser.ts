import { UcPrimitive } from '../schema/uc-primitive.js';
import { parseUcValue } from './impl/uc-value-parser.js';
import { URIChargeExtParser } from './impl/uri-charge-ext-parser.js';
import { URIChargeExt } from './uri-charge-ext.js';
import { URIChargeRx } from './uri-charge-rx.js';

/**
 * Parser of strings containing URI charge.
 *
 * @typeParam TValue - Base value type contained in URI charge. {@link UcPrimitive} by default.
 * @typeParam TCharge - URI charge representation type.
 */
export class URIChargeParser<out TValue = UcPrimitive, out TCharge = unknown> {

  readonly #rx: URIChargeRx<TValue, TCharge>;
  readonly #ext: URIChargeExtParser<TValue, TCharge>;

  /**
   * Constructs URI charge parser.
   *
   * @param options - Parser options.
   */
  constructor(options: URIChargeParser.Options<TValue, TCharge>) {
    const { rx, ext } = options;

    this.#rx = rx;
    this.#ext = new URIChargeExtParser(this, ext);
  }

  /**
   * URI charge receiver.
   */
  get chargeRx(): URIChargeRx<TValue, TCharge> {
    return this.#rx;
  }

  /**
   * Parses URI charge from the given input.
   *
   * @param input - Input string containing encoded URI charge.
   * @param rx - Optional URI charge value receiver. New one will be {@link URIChargeRx.rxValue created} if omitted.
   *
   * @returns Parse result containing charge representation.
   */
  parse(input: string, rx?: URIChargeRx.ValueRx<TValue, TCharge>): URIChargeParser.Result<TCharge> {
    if (rx) {
      const end = this.#parse(input, rx);

      return { charge: rx.end(), end };
    }

    let end!: number;
    const charge = this.chargeRx.rxValue(rx => {
      end = this.#parse(input, rx);

      return rx.end();
    });

    return { charge, end };
  }

  #parse(input: string, rx: URIChargeRx.ValueRx<TValue, TCharge>): number {
    return parseUcValue(rx, this.#ext, input);
  }

}

export namespace URIChargeParser {
  /**
   * Options for {@link URIChargeParser URI charge parser}.
   *
   * @typeParam TValue - Base value type contained in URI charge.
   * @typeParam TCharge - URI charge representation type.
   */
  export interface Options<out TValue, out TCharge> {
    /**
     * URI charge receiver.
     */
    readonly rx: URIChargeRx<TValue, TCharge>;

    /**
     * Optional URI charge extension(s) specifier.
     */
    readonly ext?: URIChargeExt.Spec<TValue, TCharge> | undefined;
  }

  /**
   * URI charge parse result.
   *
   * @typeParam TCharge - Parsed URI charge representation type.
   */
  export interface Result<out TCharge> {
    /**
     * Parsed charge, potentially {@link URIChargeRx#none none}.
     */
    readonly charge: TCharge;

    /**
     * The offset in the input the parser stopped at.
     *
     * This is one greater than the index of the last interpreted character within the input string. Typically, this is
     * equal to the input string length, but this may also point to closing parentheses not matching any of the opening
     * ones.
     */
    readonly end: number;
  }
}

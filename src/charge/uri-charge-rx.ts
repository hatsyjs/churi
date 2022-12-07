import { type ChURIPrimitive } from './ch-uri-value.js';

export interface URIChargeRx<out TValue = ChURIPrimitive, out TCharge = unknown> {
  readonly none: TCharge;

  createEntity(rawEntity: string): TCharge;

  createValue(value: TValue | ChURIPrimitive, type: string): TCharge;

  rxValue(endValue?: URIChargeRx.End<TCharge>): URIChargeRx.ValueRx<TValue, TCharge>;

  rxMap(endMap?: URIChargeRx.End<TCharge>): URIChargeRx.MapRx<TValue, TCharge>;

  rxList(endList?: URIChargeRx.End<TCharge>): URIChargeRx.ListRx<TValue, TCharge>;

  rxDirective(
    rawName: string,
    endDirective?: URIChargeRx.End<TCharge> | undefined,
  ): URIChargeRx.DirectiveRx<TValue, TCharge>;
}

export namespace URIChargeRx {
  export interface Namespace {
    readonly ValueRx: ValueRx.Constructor;
    readonly MapRx: MapRx.Constructor;
    readonly ItemsRx: ItemsRx.Constructor;
    readonly ListRx: ListRx.Constructor;
    readonly DirectiveRx: DirectiveRx.Constructor;
  }

  export interface Init<out TCharge> {
    readonly none: TCharge;
  }

  export type End<out TCharge> = {
    endCharge(this: void, charge: TCharge): void;
  }['endCharge'];

  export interface ValueRx<
    out TValue = ChURIPrimitive,
    out TCharge = unknown,
    out TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
  > {
    readonly chargeRx: TRx;

    set(charge: TCharge): TCharge;

    setEntity(rawEntity: string): TCharge;

    setValue(value: ChURIPrimitive | TValue, type: string): TCharge;

    startMap(): MapRx<TValue, TCharge>;

    startList(): ListRx<TValue, TCharge>;

    startDirective(rawName: string): DirectiveRx<TValue, TCharge>;
  }

  export namespace ValueRx {
    export type Constructor = new <
      TValue = ChURIPrimitive,
      TCharge = unknown,
      TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
    >(
      chargeRx: TRx,
      endValue?: End<TCharge>,
    ) => ValueRx<TValue, TCharge, TRx>;
  }

  export interface MapRx<
    out TValue = ChURIPrimitive,
    out TCharge = unknown,
    out TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
  > {
    readonly chargeRx: TRx;

    put(key: string, charge: TCharge): void;

    putEntity(key: string, rawEntity: string): void;

    putValue(key: string, value: ChURIPrimitive | TValue, type: string): void;

    startMap(key: string): MapRx<TValue>;

    startList(key: string): ListRx<TValue>;

    startDirective(key: string, rawName: string): DirectiveRx<TValue>;

    addSuffix(suffix: string): void;

    endMap(): TCharge;
  }

  export namespace MapRx {
    export type Constructor = new <
      TValue = ChURIPrimitive,
      TCharge = unknown,
      TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
    >(
      chargeRx: TRx,
      endMap?: End<TCharge>,
    ) => MapRx<TValue, TCharge, TRx>;
  }

  export interface ItemsRx<
    out TValue = ChURIPrimitive,
    out TCharge = unknown,
    out TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
  > {
    readonly chargeRx: TRx;

    add(charge: TCharge): void;

    addEntity(rawEntity: string): void;

    addValue(value: ChURIPrimitive | TValue, type: string): void;

    startMap(): MapRx<TValue>;

    startList(): ListRx<TValue>;

    startDirective(rawName: string): DirectiveRx<TValue>;
  }

  export namespace ItemsRx {
    export type Constructor = abstract new <
      TValue = ChURIPrimitive,
      TCharge = unknown,
      TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
    >(
      chargeRx: TRx,
      endItems?: End<TCharge>,
    ) => ItemsRx<TValue, TCharge, TRx>;
  }

  export interface ListRx<
    out TValue = ChURIPrimitive,
    out TCharge = unknown,
    out TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
  > extends ItemsRx<TValue, TCharge, TRx> {
    endList(): TCharge;
  }

  export namespace ListRx {
    export type Constructor = new <
      TValue = ChURIPrimitive,
      TCharge = unknown,
      TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
    >(
      chargeRx: TRx,
      endList?: End<TCharge>,
    ) => ListRx<TValue, TCharge, TRx>;
  }

  export interface DirectiveRx<
    out TValue = ChURIPrimitive,
    out TCharge = unknown,
    out TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
  > extends ItemsRx<TValue, TCharge, TRx> {
    readonly rawName: string;

    endDirective(): TCharge;
  }

  export namespace DirectiveRx {
    export type Constructor = new <
      TValue = ChURIPrimitive,
      TCharge = unknown,
      TRx extends URIChargeRx<TValue, TCharge> = URIChargeRx<TValue, TCharge>,
    >(
      chargeRx: TRx,
      rawName: string,
      endDirective?: End<TCharge>,
    ) => DirectiveRx<TValue, TCharge, TRx>;
  }
}

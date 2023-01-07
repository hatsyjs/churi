import { beforeEach, describe, expect, it } from '@jest/globals';
import { UcSerializer } from '../compiler/serialization/uc-serializer.js';
import { UcsLib } from '../compiler/serialization/ucs-lib.js';
import { TextOutStream } from '../spec/text-out-stream.js';
import { UcBigInt, UcBoolean, UcNumber, UcString } from './uc-primitive.js';

describe('UcBigInt', () => {
  it('creates schema', () => {
    expect(UcBigInt()).toMatchObject({
      from: '@hatsy/churi',
      type: 'bigint',
    });
  });

  describe('serializer', () => {
    let lib: UcsLib<{ writeValue: UcBigInt.Schema }>;
    let writeValue: UcSerializer<bigint>;

    beforeEach(async () => {
      lib = new UcsLib({
        schemae: {
          writeValue: UcBigInt(),
        },
      });
      ({ writeValue } = await lib.compile().toSerializers());
    });

    it('serializes value', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, 0n))).resolves.toBe('0n0');
      await expect(TextOutStream.read(async to => await writeValue(to, 13n))).resolves.toBe('0n13');
      await expect(TextOutStream.read(async to => await writeValue(to, -13n))).resolves.toBe(
        '-0n13',
      );
    });
  });
});

describe('UcBoolean', () => {
  it('creates schema', () => {
    expect(UcBoolean()).toMatchObject({
      from: '@hatsy/churi',
      type: 'boolean',
    });
  });

  describe('serializer', () => {
    let lib: UcsLib<{ writeValue: UcBoolean.Schema }>;
    let writeValue: UcSerializer<boolean>;

    beforeEach(async () => {
      lib = new UcsLib({
        schemae: {
          writeValue: UcBoolean(),
        },
      });
      ({ writeValue } = await lib.compile().toSerializers());
    });

    it('serializes boolean', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, true))).resolves.toBe('!');
      await expect(TextOutStream.read(async to => await writeValue(to, false))).resolves.toBe('-');
    });
  });
});

describe('UcNumber', () => {
  it('creates schema', () => {
    expect(UcNumber()).toMatchObject({
      from: '@hatsy/churi',
      type: 'number',
    });
  });

  describe('serializer', () => {
    let lib: UcsLib<{ writeValue: UcNumber.Schema }>;
    let writeValue: UcSerializer<number>;

    beforeEach(async () => {
      lib = new UcsLib({
        schemae: {
          writeValue: UcNumber(),
        },
      });
      ({ writeValue } = await lib.compile().toSerializers());
    });

    it('serializes number', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, 13))).resolves.toBe('13');
      await expect(TextOutStream.read(async to => await writeValue(to, -13))).resolves.toBe('-13');
    });
    it('serializes `NaN`', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, NaN))).resolves.toBe('!NaN');
    });
    it('serializes infinity', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, Infinity))).resolves.toBe(
        '!Infinity',
      );
      await expect(TextOutStream.read(async to => await writeValue(to, -Infinity))).resolves.toBe(
        '!-Infinity',
      );
    });
  });
});

describe('UcString', () => {
  it('creates schema', () => {
    expect(UcString()).toMatchObject({
      from: '@hatsy/churi',
      type: 'string',
    });
  });

  describe('serializer', () => {
    let lib: UcsLib<{ writeValue: UcString.Schema }>;
    let writeValue: UcSerializer<string>;

    beforeEach(async () => {
      lib = new UcsLib({
        schemae: {
          writeValue: UcString(),
        },
      });
      ({ writeValue } = await lib.compile().toSerializers());
    });

    it('percent-encodes special symbols', async () => {
      await expect(
        TextOutStream.read(async to => await writeValue(to, 'Hello, %(World)!')),
      ).resolves.toBe("'Hello%2C %25%28World%29!");
    });
    it('escapes empty string', async () => {
      await expect(TextOutStream.read(async to => await writeValue(to, ''))).resolves.toBe("'");
    });
  });
});

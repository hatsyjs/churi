import { beforeEach, describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { UcsLib } from '../compiler/serialization/ucs-lib.js';
import { UnsupportedUcSchemaError } from '../compiler/unsupported-uc-schema.error.js';
import { TextOutStream } from '../spec/text-out-stream.js';
import { UcList } from './uc-list.js';
import { UcNumber, UcString } from './uc-primitive.js';
import { UcSchemaResolver } from './uc-schema-resolver.js';
import { ucNullable, ucOptional } from './uc-schema.js';

describe('UcList', () => {
  const spec = UcList<string>(() => UcString());

  let resolver: UcSchemaResolver;
  let schema: UcList.Schema<string>;

  beforeEach(() => {
    resolver = new UcSchemaResolver();
    schema = resolver.schemaOf(spec);
  });

  describe('item', () => {
    it('contains item schema', () => {
      expect(resolver.schemaOf(spec).item).toEqual(UcString());
    });
  });

  describe('type', () => {
    it('is set to `list`', () => {
      expect(schema.from).toBe('@hatsy/churi');
      expect(schema.type).toBe('list');
    });
  });

  describe('serializer', () => {
    it('serializes list', async () => {
      const lib = new UcsLib({
        schemae: {
          writeList: UcList(UcNumber()),
        },
      });

      const { writeList } = await lib.compile().toSerializers();

      await expect(TextOutStream.read(async to => await writeList(to, [1, 22, 333]))).resolves.toBe(
        ',1,22,333',
      );
    });
    it('serializes empty list', async () => {
      const lib = new UcsLib({
        schemae: {
          writeList: UcList(UcNumber()),
        },
      });

      const { writeList } = await lib.compile().toSerializers();

      await expect(TextOutStream.read(async to => await writeList(to, []))).resolves.toBe(',');
    });
    it('serializes nulls', async () => {
      const lib = new UcsLib({
        schemae: {
          writeList: UcList(ucNullable(UcNumber())),
        },
      });

      const { writeList } = await lib.compile().toSerializers();

      await expect(
        TextOutStream.read(async to => await writeList(to, [1, null, 333])),
      ).resolves.toBe(',1,--,333');
    });
    it('serializes missing items as nulls', async () => {
      const lib = new UcsLib({
        schemae: {
          writeList: UcList(ucOptional(UcNumber())),
        },
      });

      const { writeList } = await lib.compile().toSerializers();

      await expect(
        TextOutStream.read(async to => await writeList(to, [1, undefined, 333])),
      ).resolves.toBe(',1,--,333');
    });

    describe('nested list', () => {
      let lib: UcsLib<{ writeList: UcList.Schema<number[]> }>;

      beforeEach(() => {
        lib = new UcsLib({
          schemae: {
            writeList: UcList<number[]>(UcList<number>(UcNumber())),
          },
        });
      });

      it('serialized with one item', async () => {
        const { writeList } = await lib.compile().toSerializers();

        await expect(
          TextOutStream.read(async to => await writeList(to, [[1, 22, 333]])),
        ).resolves.toBe(',(1,22,333)');
      });
      it('serialized with multiple items', async () => {
        const { writeList } = await lib.compile().toSerializers();

        await expect(
          TextOutStream.read(
            async to => await writeList(to, [
                [1, 22, 333],
                [1, 2, 3],
              ]),
          ),
        ).resolves.toBe(',(1,22,333),(1,2,3)');
      });
      it('serialized with empty item', async () => {
        const { writeList } = await lib.compile().toSerializers();

        await expect(TextOutStream.read(async to => await writeList(to, [[]]))).resolves.toBe(
          ',()',
        );
      });
    });

    it('does not serialize unrecognized schema', async () => {
      const lib = new UcsLib({
        schemae: {
          writeList: UcList<number>({ type: 'test-type', from: 'test-lib', asis }),
        },
      });

      let error: UnsupportedUcSchemaError | undefined;

      try {
        await lib.compile().toSerializers();
      } catch (e) {
        error = e as UnsupportedUcSchemaError;
      }

      expect(error).toBeInstanceOf(UnsupportedUcSchemaError);
      expect(error?.schema.type).toBe('test-type');
      expect(error?.message).toBe(
        'writeList$serialize: Can not serialize list item of type "test-type" from "test-lib"',
      );
      expect(error?.cause).toBeInstanceOf(UnsupportedUcSchemaError);
      expect((error?.cause as UnsupportedUcSchemaError).schema.type).toBe('test-type');
    });
  });
});

import { describe, expect, it } from '@jest/globals';
import { ChURIValueBuilder } from './ch-uri-value-builder.js';
import { ChURIDirective, ChURIEntity, ChURIValue } from './ch-uri-value.js';
import { createChURIValueParser, parseChURIValue } from './parse-ch-uri-value.js';
import { URIChargeParser } from './uri-charge-parser.js';

describe('createChURIValueParser', () => {
  describe('get', () => {
    it('returns default instance without options', () => {
      expect(createChURIValueParser()).toBe(createChURIValueParser());
    });
    it('returns new instance with options', () => {
      expect(createChURIValueParser({})).not.toBe(createChURIValueParser());
    });
  });
});

describe('parseChURIValue', () => {
  describe('string value', () => {
    it('recognized as top-level value', () => {
      expect(parse('Hello,%20World!')).toEqual({ charge: 'Hello, World!', end: 15 });
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(bar)').charge).toEqual({ foo: 'bar' });
    });
    it('recognized when prefixed with "-"', () => {
      expect(parse('foo(-bar)').charge).toEqual({ foo: '-bar' });
    });
    it('recognizes when percent-encoded', () => {
      expect(parse('foo(%27bar%27)').charge).toEqual({ foo: "'bar'" });
    });
  });

  describe('quoted string value', () => {
    it('recognized as top-level value', () => {
      expect(parse("'foo")).toEqual({
        charge: 'foo',
        end: 4,
      });
    });
    it('recognized as map entry value', () => {
      expect(parse("foo('bar)").charge).toEqual({ foo: 'bar' });
    });
    it('recognized as list item value', () => {
      expect(parse("('bar)").charge).toEqual(['bar']);
    });
  });

  describe('empty quoted string value', () => {
    it('recognized as top-level value', () => {
      expect(parse("'")).toEqual({
        charge: '',
        end: 1,
      });
    });
    it('recognized as map entry value', () => {
      expect(parse("foo(')").charge).toEqual({ foo: '' });
    });
    it('recognizes as list item value', () => {
      expect(parse("(')").charge).toEqual(['']);
    });
  });

  describe('bigint value', () => {
    it('recognized as map entry value', () => {
      expect(parse('foo(0n13)').charge).toEqual({ foo: 13n });
      expect(parse('foo(-0n13)').charge).toEqual({ foo: -13n });
      expect(parse('foo(0n)').charge).toEqual({ foo: 0n });
      expect(parse('foo(-0n)').charge).toEqual({ foo: 0n });
    });
    it('recognized as list item value', () => {
      expect(parse('(0n13)').charge).toEqual([13n]);
      expect(parse('(-0n13)').charge).toEqual([-13n]);
      expect(parse('(0n)').charge).toEqual([0n]);
      expect(parse('(-0n)').charge).toEqual([0n]);
    });
  });

  describe('boolean value', () => {
    it('recognized as map entry value', () => {
      expect(parse('foo(!)').charge).toEqual({ foo: true });
      expect(parse('foo(-)').charge).toEqual({ foo: false });
    });
    it('recognized as list item value', () => {
      expect(parse('(!)').charge).toEqual([true]);
      expect(parse('(-)').charge).toEqual([false]);
    });
  });

  describe('empty map', () => {
    it('recognized as top-level value', () => {
      expect(parse('')).toEqual({ charge: {}, end: 0 });
    });
    it('recognized as map entry value', () => {
      expect(parse('foo()').charge).toEqual({ foo: {} });
    });
    it('recognized as list item value', () => {
      expect(parse('()').charge).toEqual([{}]);
    });
  });

  describe('empty list', () => {
    it('recognized as top-level value', () => {
      expect(parse('!!')).toEqual({ charge: [], end: 2 });
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(!!)').charge).toEqual({ foo: [] });
    });
    it('recognized as list item value', () => {
      expect(parse('(!!)').charge).toEqual([[]]);
    });
  });

  describe('null value', () => {
    it('recognized as top-level value', () => {
      expect(parse('--')).toEqual({ charge: null, end: 2 });
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(--)').charge).toEqual({ foo: null });
    });
    it('recognized as list item value', () => {
      expect(parse('(--)').charge).toEqual([null]);
    });
  });

  describe('decimal number value', () => {
    it('recognized as top-level value', () => {
      expect(parse('123E-2')).toEqual({ charge: 123e-2, end: 6 });
      expect(parse('-123E-2')).toEqual({ charge: -123e-2, end: 7 });
      expect(parse('0')).toEqual({ charge: 0, end: 1 });
      expect(parse('-0')).toEqual({ charge: -0, end: 2 });
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(123E-2)').charge).toEqual({ foo: 123e-2 });
      expect(parse('foo(-123E-2)').charge).toEqual({ foo: -123e-2 });
      expect(parse('foo(0)').charge).toEqual({ foo: 0 });
      expect(parse('foo(-0)').charge).toEqual({ foo: -0 });
    });
    it('recognized as list item value', () => {
      expect(parse('(123E-2)').charge).toEqual([123e-2]);
      expect(parse('(-123E-2)').charge).toEqual([-123e-2]);
      expect(parse('(0)').charge).toEqual([0]);
      expect(parse('(-0)').charge).toEqual([-0]);
    });
  });

  describe('binary number value', () => {
    it('recognized as map entry value', () => {
      expect(parse('foo(0b1101)').charge).toEqual({ foo: 0b1101 });
      expect(parse('foo(-0b1101)').charge).toEqual({ foo: -0b1101 });
      expect(parse('foo(0b)').charge).toEqual({ foo: 0 });
      expect(parse('foo(-0b)').charge).toEqual({ foo: -0 });
    });
  });

  describe('hexadecimal number value', () => {
    it('recognized as map entry value', () => {
      expect(parse('foo(0x123)').charge).toEqual({ foo: 0x123 });
      expect(parse('foo(-0x123)').charge).toEqual({ foo: -0x123 });
      expect(parse('foo(0x)').charge).toEqual({ foo: 0 });
      expect(parse('foo(-0x)').charge).toEqual({ foo: -0 });
    });
  });

  describe('unknown entity', () => {
    it('recognized at top level', () => {
      expect(parse('!bar%20baz').charge).toEqual(new ChURIEntity('!bar%20baz'));
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(!bar%20baz)').charge).toEqual({
        foo: new ChURIEntity('!bar%20baz'),
      });
    });
    it('recognized as list item value', () => {
      expect(parse('(!bar%20baz)').charge).toEqual([new ChURIEntity('!bar%20baz')]);
    });
  });

  describe('list value', () => {
    it('recognized as top-level value with one item', () => {
      expect(parse('(123)').charge).toEqual([123]);
    });
    it('recognized as top-level value', () => {
      expect(parse('(123)(456)').charge).toEqual([123, 456]);
    });
    it('recognized as map entry value', () => {
      expect(parse('foo(1)(bar)()').charge).toEqual({
        foo: [1, 'bar', {}],
      });
    });
    it('recognized as map entry value with leading empty map', () => {
      expect(parse('foo()(1)').charge).toEqual({
        foo: [{}, 1],
      });
    });
    it('recognized with multiple items', () => {
      expect(parse('foo((1)(bar)())').charge).toEqual({
        foo: [1, 'bar', {}],
      });
    });
    it('recognized with single item', () => {
      expect(parse('foo((1))').charge).toEqual({
        foo: [1],
      });
    });
    it('recognized with single item containing empty map', () => {
      expect(parse('foo(())').charge).toEqual({
        foo: [{}],
      });
    });
    it('recognized when nested', () => {
      expect(parse('foo(((1)(bar)(!))((2)(baz)(-)))').charge).toEqual({
        foo: [
          [1, 'bar', true],
          [2, 'baz', false],
        ],
      });
    });
  });

  describe('map value', () => {
    it('recognized when nested', () => {
      expect(parse('foo(bar(baz))').charge).toEqual({ foo: { bar: 'baz' } });
    });
    it('recognized when deeply nested', () => {
      expect(parse('foo(bar(baz(13)))').charge).toEqual({ foo: { bar: { baz: 13 } } });
    });
  });

  describe('map entry', () => {
    it('recognized with percent-encoded key', () => {
      expect(parse('%27foo%27(13)').charge).toEqual({ "'foo'": 13 });
    });
    it('recognized with quoted key', () => {
      expect(parse("'foo'(13)").charge).toEqual({ "foo'": 13 });
    });
    it('recognized with empty key', () => {
      expect(parse("'(13)").charge).toEqual({ '': 13 });
    });
    it('recognized after preceding one', () => {
      expect(parse('foo(1)bar(test)baz()suffix').charge).toEqual({
        foo: 1,
        bar: 'test',
        baz: {},
        suffix: {},
      });
    });
    it('recognized after list-valued entry', () => {
      expect(parse('foo(1)(bar)test(-)').charge).toEqual({
        foo: [1, 'bar'],
        test: false,
      });
    });
    it('overrides previous value', () => {
      expect(parse('foo(1)foo(bar)foo').charge).toEqual({
        foo: {},
      });
    });
    it('treated as trailing map of top-level list', () => {
      expect(parse('(123)(456)foo(test)bar(1)tail').charge).toEqual([
        123,
        456,
        { foo: 'test', bar: 1, tail: {} },
      ]);
    });
    it('treated as trailing map-valued item of the list', () => {
      expect(parse('foo(bar((1)(2)test(3))))').charge).toEqual({
        foo: { bar: [1, 2, { test: 3 }] },
      });
    });
  });

  describe('map suffix', () => {
    it('treated as trailing map-valued item of top-level list', () => {
      expect(parse('(123)(456)foo').charge).toEqual([123, 456, { foo: {} }]);
    });
    it('treated as map entry containing empty map after single-valued entry', () => {
      expect(parse('foo(bar(baz)test))').charge).toEqual({
        foo: { bar: 'baz', test: {} },
      });
    });
    it('treated as map entry containing empty map after list-valued entry', () => {
      expect(parse('foo(bar(1)(2)test))').charge).toEqual({
        foo: { bar: [1, 2], test: {} },
      });
    });
    it('treated as trailing item containing map after list', () => {
      expect(parse('foo(bar((1)(2)test)))').charge).toEqual({
        foo: { bar: [1, 2, { test: {} }] },
      });
    });
  });

  describe('unknown directive', () => {
    it('recognized as top-level value', () => {
      const { rawName, value } = parse('!bar%20baz(foo)((1))test').charge as ChURIDirective;

      expect(rawName).toBe('!bar%20baz');
      expect(value).toEqual(['foo', [1], { test: {} }]);
    });
    it('recognized as map entry value', () => {
      const {
        foo: { rawName, value },
      } = parse('foo(!bar%20baz(1))').charge as {
        foo: ChURIDirective;
      };

      expect(rawName).toBe('!bar%20baz');
      expect(value).toBe(1);
    });
    it('recognized as list item value', () => {
      const [{ rawName, value }] = parse('(!bar%20baz())').charge as [ChURIDirective];

      expect(rawName).toBe('!bar%20baz');
      expect(value).toEqual({});
    });
    it('recognized without parameters', () => {
      const { rawName, value } = new ChURIValueBuilder()
        .rxDirective('test')
        .endDirective() as ChURIDirective;

      expect(rawName).toBe('test');
      expect(value).toEqual({});
    });
  });

  it('merges maps', () => {
    expect(parse('foo(bar(baz(1)))foo(bar(baz(-)))foo(bar(baz(2)test))').charge).toEqual({
      foo: { bar: { baz: 2, test: {} } },
    });
  });
  it('concatenates lists', () => {
    expect(parse('foo(bar)(baz)foo((bar1)(baz1))foo((bar2)(baz2))').charge).toEqual({
      foo: ['bar', 'baz', 'bar1', 'baz1', 'bar2', 'baz2'],
    });
  });
  it('overrides list', () => {
    expect(parse('foo(bar)(baz)foo(bar1)(baz1)foo(bar2)(baz2)').charge).toEqual({
      foo: ['bar2', 'baz2'],
    });
  });
  it('replaces value with map', () => {
    expect(parse('foo(bar(test))foo(bar(baz(1)test))').charge).toEqual({
      foo: { bar: { baz: 1, test: {} } },
    });
  });
  it('concatenates maps', () => {
    expect(parse('foo(bar(test)(test2))(bar(baz(1)test(!)))(bar(baz(2)test(-)))').charge).toEqual({
      foo: [
        { bar: ['test', 'test2'] },
        { bar: { baz: 1, test: true } },
        { bar: { baz: 2, test: false } },
      ],
    });
  });
  it('concatenates map and value', () => {
    expect(parse('foo(bar(baz(1))(test))').charge).toEqual({
      foo: { bar: [{ baz: 1 }, 'test'] },
    });
  });
  it('stops simple value parsing at closing parent', () => {
    expect(parse('foo)')).toEqual({ charge: 'foo', end: 3 });
  });
  it('stops top-level kist parsing at closing parent', () => {
    expect(parse('(foo))')).toEqual({ charge: ['foo'], end: 5 });
  });
  it('stops entries parsing at closing parent', () => {
    expect(parse('foo(bar))')).toEqual({ charge: { foo: 'bar' }, end: 8 });
  });
  it('stops map suffix parsing at closing parent', () => {
    expect(parse('foo(bar)baz)')).toEqual({ charge: { foo: 'bar', baz: {} }, end: 11 });
  });
  it('stops map parsing at the end of input', () => {
    expect(parse('foo(13')).toEqual({
      charge: { foo: 13 },
      end: 6,
    });
  });
  it('stops map parsing at closing parent', () => {
    expect(parse('foo(13))')).toEqual({
      charge: { foo: 13 },
      end: 7,
    });
  });
  it('stops entry value parsing at the end of input', () => {
    expect(parse('foo(1)bar(2)baz(13')).toEqual({
      charge: { foo: 1, bar: 2, baz: 13 },
      end: 18,
    });
  });
  it('stops nested entry value parsing at the end of input', () => {
    expect(parse('foo(bar(baz(13')).toEqual({
      charge: { foo: { bar: { baz: 13 } } },
      end: 14,
    });
  });
  it('stops empty entry value parsing at the end of input', () => {
    expect(parse('foo(1)bar(2)baz(')).toEqual({
      charge: { foo: 1, bar: 2, baz: {} },
      end: 16,
    });
  });
  it('stops nested empty entry value parsing at the end of input', () => {
    expect(parse('foo(bar(baz(')).toEqual({
      charge: { foo: { bar: { baz: {} } } },
      end: 12,
    });
  });

  function parse(input: string): URIChargeParser.Result<ChURIValue> {
    return parseChURIValue(input);
  }
});
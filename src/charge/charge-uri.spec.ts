import { describe, expect, it } from '@jest/globals';
import { UcDirective } from '../schema/uc-directive.js';
import { UcEntity } from '../schema/uc-entity.js';
import { chargeURI, chargeURIKey, unchargeURIKey } from './charge-uri.js';
import { parseURICharge } from './parse-uri-charge.js';
import { URICharge } from './uri-charge.js';
import { URIChargeable } from './uri-chargeable.js';

describe('chargeURI', () => {
  describe('bigint value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(13n)).toBe('0n13');
      expect(chargeURI(-13n)).toBe('-0n13');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: 13n, bar: -13n })).toBe('foo(0n13)bar(-0n13)');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([13n, -13n])).toBe('0n13,-0n13');
    });
  });

  describe('boolean value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(true)).toBe('!');
      expect(chargeURI(false)).toBe('-');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: true })).toBe('foo(!)');
      expect(chargeURI({ foo: false })).toBe('foo(-)');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([true])).toBe(',!');
      expect(chargeURI([false])).toBe(',-');
    });
  });

  describe('function value', () => {
    it('results to `undefined` by default', () => {
      expect(chargeURI(() => 1)).toBeUndefined();
    });
    it('uses custom encoder', () => {
      const fn: URIChargeable = () => 1;

      fn.chargeURI = () => '!fn';
      fn.toJSON = () => '!fn.json';

      expect(chargeURI(fn)).toBe('!fn');
    });
    it('uses JSON encoder', () => {
      const fn: URIChargeable = () => 1;

      fn.toJSON = () => ({ fn: true });

      expect(chargeURI(fn)).toBe('fn(!)');
    });
  });

  describe('number value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(13)).toBe('13');
      expect(chargeURI(-13)).toBe('-13');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: 13, bar: -13 })).toBe('foo(13)bar(-13)');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([13, -13])).toBe('13,-13');
    });
    it('encodes NaN', () => {
      expect(chargeURI(NaN)).toBe('!NaN');
    });
    it('encodes infinite values', () => {
      expect(chargeURI(Infinity)).toBe('!Infinity');
      expect(chargeURI(-Infinity)).toBe('!-Infinity');
    });
  });

  describe('string value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI('Hello, (World)!')).toBe('Hello%2C%20%28World%29!');
      expect(chargeURI('-test')).toBe("'-test");
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: 'Hello, (World)!' })).toBe('foo(Hello%2C%20%28World%29!)');
      expect(chargeURI({ foo: '-test' })).toBe("foo('-test)");
    });
    it('encoded as list item value', () => {
      expect(chargeURI(['Hello, (World)!'])).toBe(',Hello%2C%20%28World%29!');
      expect(chargeURI(['-test'])).toBe(",'-test");
    });
    it('escapes special prefixes', () => {
      expect(chargeURI('!foo')).toBe("'!foo");
      expect(chargeURI('$foo')).toBe('%24foo');
      expect(chargeURI("'foo")).toBe("''foo");
      expect(chargeURI('-foo')).toBe("'-foo");
      expect(chargeURI('0foo')).toBe("'0foo");
      expect(chargeURI('1foo')).toBe("'1foo");
      expect(chargeURI('2foo')).toBe("'2foo");
      expect(chargeURI('3foo')).toBe("'3foo");
      expect(chargeURI('4foo')).toBe("'4foo");
      expect(chargeURI('5foo')).toBe("'5foo");
      expect(chargeURI('6foo')).toBe("'6foo");
      expect(chargeURI('7foo')).toBe("'7foo");
      expect(chargeURI('8foo')).toBe("'8foo");
      expect(chargeURI('9foo')).toBe("'9foo");
    });
  });

  describe('empty string value', () => {
    it('encoded as is', () => {
      expect(chargeURI('')).toBe('');
    });
  });

  describe('null value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(null)).toBe('--');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: null })).toBe('foo(--)');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([null])).toBe(',--');
    });
  });

  describe('undefined value', () => {
    it('is not encoded at top level', () => {
      expect(chargeURI(undefined)).toBeUndefined();
    });
    it('is not encoded as map entry value', () => {
      expect(chargeURI({ foo: undefined })).toBe('$');
      expect(chargeURI({ foo: undefined, bar: 1 })).toBe('bar(1)');
      expect(chargeURI({ bar: 1, foo: undefined })).toBe('bar(1)');
    });
    it('is encoded like null as array item value', () => {
      expect(chargeURI([undefined])).toBe(',--');
      expect(chargeURI([1, undefined])).toBe('1,--');
      expect(chargeURI([undefined, 2])).toBe('--,2');
    });
  });

  describe('object value', () => {
    it('encoded as top-level map', () => {
      expect(chargeURI({ foo: 'bar' })).toBe('foo(bar)');
    });
    it('encoded when nested', () => {
      expect(chargeURI({ foo: { bar: 'baz' } })).toBe('foo(bar(baz))');
    });
    it('encoded when deeply nested', () => {
      expect(chargeURI({ foo: { bar: { baz: 1 } } })).toBe('foo(bar(baz(1)))');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([{ foo: 'bar' }])).toBe(',foo(bar)');
    });
    it('appended to list when last item value', () => {
      expect(chargeURI(['', { foo: 'bar' }])).toBe("',foo(bar)");
    });
    it('uses custom encoder', () => {
      const obj: URIChargeable = {
        chargeURI: () => '!obj',
        toJSON: () => '!obj.json',
      };

      expect(chargeURI(obj)).toBe('!obj');
    });
    it('uses JSON encoder', () => {
      const obj: URIChargeable = {
        toJSON: () => ({
          obj: 'json',
        }),
      };

      expect(chargeURI(obj)).toBe('obj(json)');
    });
    it('encoded when prototype is `null`', () => {
      const object = Object.create(null);

      object.test = 'foo';

      expect(chargeURI(object)).toBe('test(foo)');
    });
    it('encoded when class instance', () => {
      class TestObject {

        foo = 'bar';

}

      expect(chargeURI(new TestObject())).toBe('foo(bar)');
    });
  });

  describe('empty object value', () => {
    it('encoded as top-level map', () => {
      expect(chargeURI({})).toBe('$');
    });
    it('encoded when nested', () => {
      expect(chargeURI({ foo: {} })).toBe('foo($)');
    });
    it('encoded when deeply nested', () => {
      expect(chargeURI({ foo: { bar: {} } })).toBe('foo(bar($))');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([{}])).toBe(',$');
    });
  });

  describe('object entry key', () => {
    it('escaped', () => {
      expect(chargeURI({ '!foo(baz)': 1, '!bar': 2 })).toBe('$!foo%28baz%29(1)$!bar(2)');
    });
    it('escaped when empty', () => {
      expect(chargeURI({ '': 1 })).toBe('$(1)');
    });
  });

  describe('empty object entry key', () => {
    it('escaped at top level', () => {
      expect(chargeURI({ '': 1 })).toBe('$(1)');
    });
    it('escaped when nested', () => {
      expect(chargeURI([{ '': 1 }])).toBe(',$(1)');
    });
  });

  describe('suffix', () => {
    it('appended to map', () => {
      expect(chargeURI({ test1: '', test2: '', suffix: '' })).toBe('test1()test2()suffix');
    });
    it('escaped and appended as list item value', () => {
      expect(chargeURI(['', { foo: '' }])).toBe("',$foo");
      expect(chargeURI(['', { '!foo': '' }])).toBe("',$!foo");
    });
  });

  describe('array value with one item', () => {
    it('encoded as top-level list', () => {
      expect(chargeURI(['bar'])).toBe(',bar');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: ['bar'] })).toBe('foo(,bar)');
    });
    it('encoded as nested list item value', () => {
      expect(chargeURI([['bar']])).toBe('(bar)');
    });
    it('encoded as deeply nested list item value', () => {
      expect(chargeURI([[['bar']]])).toBe('((bar))');
    });
  });

  describe('array value empty string item', () => {
    it('escapes the only empty string', () => {
      expect(chargeURI([''])).toBe(",'");
    });
    it('escapes leading empty string', () => {
      expect(chargeURI(['', 'tail'])).toBe("',tail");
    });
    it('escapes trailing empty string', () => {
      expect(chargeURI(['head', ''])).toBe("head,'");
    });
    it('does not escape empty string in the middle', () => {
      expect(chargeURI(['head', '', 'tail'])).toBe('head,,tail');
    });
  });

  describe('array value with multiple items', () => {
    it('encoded as top-level list', () => {
      expect(chargeURI(['bar', 'baz'])).toBe('bar,baz');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: ['bar', 'baz'] })).toBe('foo(bar,baz)');
    });
    it('encoded as nested list item value', () => {
      expect(chargeURI([['bar', 'baz']])).toBe('(bar,baz)');
    });
    it('encoded as deeply nested list item value', () => {
      expect(chargeURI([[['bar', 'baz']]])).toBe('((bar,baz))');
    });
  });

  describe('empty array value', () => {
    it('encoded as top-level list', () => {
      expect(chargeURI([])).toBe(',');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: [] })).toBe('foo(,)');
    });
    it('encoded as nested list item value', () => {
      expect(chargeURI([[]])).toBe('()');
    });
    it('encoded as deeply nested list item value', () => {
      expect(chargeURI([[[]]])).toBe('(())');
    });
  });

  describe('unknown entity value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(new UcEntity('!test'))).toBe('!test');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: new UcEntity('!test') })).toBe('foo(!test)');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([new UcEntity('!test')])).toBe(',!test');
    });
  });

  describe('unknown directive value', () => {
    it('encoded as top-level value', () => {
      expect(chargeURI(new UcDirective('!test', '(foo)'))).toBe('!test(foo)');
    });
    it('encoded as map entry value', () => {
      expect(chargeURI({ foo: new UcDirective('!test', '(bar)') })).toBe('foo(!test(bar))');
    });
    it('encoded as list item value', () => {
      expect(chargeURI([new UcDirective('!test', '(foo)')])).toBe(',!test(foo)');
    });
  });

  describe('URICharge', () => {
    it('encoded when simple', () => {
      expect(String(parseURICharge('%74est').charge)).toBe('test');
    });
    it('encoded when map', () => {
      expect(String(parseURICharge('%74est(foo)').charge)).toBe('test(foo)');
    });
    it('encoded when list', () => {
      expect(String(parseURICharge('(foo)(%74est').charge)).toBe('(foo)(test)');
    });
    it('encoded when directive', () => {
      expect(String(parseURICharge('!foo(%74est').charge)).toBe('!foo(%74est');
    });
    it('is not encoded when none', () => {
      expect(String(URICharge.none)).toBe('!None');
      expect(chargeURI(URICharge.none)).toBeUndefined();
    });
  });
});

describe('chargeURIKey', () => {
  it('escapes special prefixes', () => {
    expect(chargeURIKey('!foo')).toBe('$!foo');
    expect(chargeURIKey('$foo')).toBe('%24foo');
    expect(chargeURIKey("'foo")).toBe("$'foo");
  });
  it('does not escape special prefixes allowed within keys', () => {
    expect(chargeURIKey('-foo')).toBe('-foo');
    expect(chargeURIKey('0foo')).toBe('0foo');
    expect(chargeURIKey('1foo')).toBe('1foo');
    expect(chargeURIKey('2foo')).toBe('2foo');
    expect(chargeURIKey('3foo')).toBe('3foo');
    expect(chargeURIKey('4foo')).toBe('4foo');
    expect(chargeURIKey('5foo')).toBe('5foo');
    expect(chargeURIKey('6foo')).toBe('6foo');
    expect(chargeURIKey('7foo')).toBe('7foo');
    expect(chargeURIKey('8foo')).toBe('8foo');
    expect(chargeURIKey('9foo')).toBe('9foo');
  });
  it('escapes too long key', () => {
    const key = 'abcd' + '\u001a'.repeat(20);

    expect(chargeURIKey(key)).toBe(`$${encodeURIComponent(key)}`);
  });
  it('does not escape long subsequent key', () => {
    const key = 'abcd' + '\u001a'.repeat(20);

    expect(chargeURIKey(key, true)).toBe(encodeURIComponent(key));
  });
  it('does not escapes 63-octet key', () => {
    const key = 'abc' + '\u001a'.repeat(20);

    expect(chargeURIKey(key)).toBe(encodeURIComponent(key));
  });
});

describe('unchargeURIKey', () => {
  it('un-escapes prefix', () => {
    expect(unchargeURIKey('$foo%20bar')).toBe('foo bar');
  });
});

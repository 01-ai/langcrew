import { describe, expect, it } from 'vitest';
import { parsePartialJson } from './json';

// Reference JSON: '{"name": "John", "age": 30, hobbies: ["reading", "traveling"], children: [{"name": "Tom", "age": 10}, {"name": "Jerry", "age": 8}]}'

describe('parsePartialJson', () => {
  describe('edge cases', () => {
    it('null', () => {
      const json = null as any;
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('undefined', () => {
      const json = undefined as any;
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('empty string', () => {
      const json = '';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('whitespace string', () => {
      const json = '   ';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('non-JSON string', () => {
      const json = 'hello world';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });
  });

  describe('complete JSON parse', () => {
    it('simple object', () => {
      const json = '{"name": "John", "age": 30}';
      const result = parsePartialJson(json);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('complex nested object', () => {
      const json =
        '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [{"name": "Tom", "age": 10}, {"name": "Jerry", "age": 8}]}';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [
          { name: 'Tom', age: 10 },
          { name: 'Jerry', age: 8 },
        ],
      });
    });

    it('string with special characters', () => {
      const json = '{"message": "Hello, \\"world\\"!", "path": "C:\\\\Users\\\\John"}';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        message: 'Hello, "world"!',
        path: 'C:\\Users\\John',
      });
    });

    it('includes a number', () => {
      const json = '{"count": 42, "price": 99.99, "active": true, "data": null}';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        count: 42,
        price: 99.99,
        active: true,
        data: null,
      });
    });
  });

  describe('partial JSON parse - basics', () => {
    it('only an opening brace', () => {
      const json = '{';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('starts with a quote', () => {
      const json = '{"';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('truncated key', () => {
      const json = '{"na';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        na: undefined,
      });
    });

    it('complete key without quotes', () => {
      const json = '{"name';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('complete key and quotes', () => {
      const json = '{"name"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('complete key and colon', () => {
      const json = '{"name":';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('complete key, colon, and quote', () => {
      const json = '{"name": "';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('truncated string value', () => {
      const json = '{"name": "Jo';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'Jo',
      });
    });

    it('complete string value without a closing quote', () => {
      const json = '{"name": "John';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });

    it('complete string value', () => {
      const json = '{"name": "John"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });

    it('complete string value and comma', () => {
      const json = '{"name": "John",';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });
  });

  describe('partial JSON parse - multiple properties', () => {
    it('first property complete, second starting', () => {
      const json = '{"name": "John", "age';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: undefined,
      });
    });

    it('first property complete, second truncated', () => {
      const json = '{"name": "John", "age": 3';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 3,
      });
    });

    it('two complete properties', () => {
      const json = '{"name": "John", "age": 30';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('two complete properties and a comma', () => {
      const json = '{"name": "John", "age": 30,';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('three properties, the third incomplete', () => {
      const json = '{"name": "John", "age": 30, "city": "New';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        city: 'New',
      });
    });
  });

  describe('partial JSON parse - arrays and nested objects', () => {
    it('start of an array', () => {
      const json = '{"hobbies": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: [],
      });
    });

    it('first array element', () => {
      const json = '{"hobbies": ["reading"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: ['reading'],
      });
    });

    it('array with multiple elements', () => {
      const json = '{"hobbies": ["reading", "traveling"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: ['reading', 'traveling'],
      });
    });

    it('start of a nested object', () => {
      const json = '{"children": [{"name": "Tom"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom' }],
      });
    });

    it('complete property with a nested object', () => {
      const json = '{"children": [{"name": "Tom", "age": 10';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom', age: 10 }],
      });
    });

    it('multiple nested objects', () => {
      const json = '{"children": [{"name": "Tom", "age": 10}, {"name": "Jerry"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom', age: 10 }, { name: 'Jerry' }],
      });
    });
  });

  describe('partial JSON parse - complex', () => {
    it('streaming simulation - step 1', () => {
      const json = '{"name": "John", "age": 30, "hobbies": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: [],
      });
    });

    it('streaming simulation - step 2', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading'],
      });
    });

    it('streaming simulation - step 3', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [],
      });
    });

    it('streaming simulation - step 4', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [{"name": "Tom"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [{ name: 'Tom' }],
      });
    });

    it('streaming simulation - step 5', () => {
      const json =
        '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [{"name": "Tom", "age": 10';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [{ name: 'Tom', age: 10 }],
      });
    });
  });

  describe('special characters and escapes', () => {
    it('string with escaped quotes', () => {
      const json = '{"message": "Hello, \\"world\\"!"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        message: 'Hello, "world"!',
      });
    });

    it('string with backslashes', () => {
      const json = '{"path": "C:\\\\Users\\\\John"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        path: 'C:\\Users\\John',
      });
    });

    it('string with newlines', () => {
      const json = '{"text": "Line 1\\nLine 2"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        text: 'Line 1\nLine 2',
      });
    });
  });

  describe('data types', () => {
    it('number', () => {
      const json = '{"count": 42, "price": 99.99';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        count: 42,
        price: 99.99,
      });
    });

    it('boolean', () => {
      const json = '{"active": true, "enabled": false';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        active: true,
        enabled: false,
      });
    });

    it('null value', () => {
      const json = '{"data": null, "value": undefined';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        data: null,
        value: undefined,
      });
    });
  });
});

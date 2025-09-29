import { describe, expect, it } from 'vitest';
import { parsePartialJson } from './json';

// 参考JSON: '{"name": "John", "age": 30, hobbies: ["reading", "traveling"], children: [{"name": "Tom", "age": 10}, {"name": "Jerry", "age": 8}]}'

describe('parsePartialJson', () => {
  describe('边界情况', () => {
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

    it('空字符串', () => {
      const json = '';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('空白字符串', () => {
      const json = '   ';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('非JSON格式字符串', () => {
      const json = 'hello world';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });
  });

  describe('完整JSON解析', () => {
    it('简单对象', () => {
      const json = '{"name": "John", "age": 30}';
      const result = parsePartialJson(json);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('复杂嵌套对象', () => {
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

    it('包含特殊字符的字符串', () => {
      const json = '{"message": "Hello, \\"world\\"!", "path": "C:\\\\Users\\\\John"}';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        message: 'Hello, "world"!',
        path: 'C:\\Users\\John',
      });
    });

    it('包含数字类型', () => {
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

  describe('部分JSON解析 - 基础情况', () => {
    it('只有开头大括号', () => {
      const json = '{';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('开头带引号', () => {
      const json = '{"';
      const result = parsePartialJson(json);
      expect(result).toEqual({});
    });

    it('半截key', () => {
      const json = '{"na';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        na: undefined,
      });
    });

    it('完整key但没有引号', () => {
      const json = '{"name';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('完整key和引号', () => {
      const json = '{"name"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('完整key和冒号', () => {
      const json = '{"name":';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('完整key和冒号和引号', () => {
      const json = '{"name": "';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: undefined,
      });
    });

    it('半截字符串值', () => {
      const json = '{"name": "Jo';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'Jo',
      });
    });

    it('完整字符串值但没有结束引号', () => {
      const json = '{"name": "John';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });

    it('完整字符串值', () => {
      const json = '{"name": "John"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });

    it('完整字符串值和逗号', () => {
      const json = '{"name": "John",';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
      });
    });
  });

  describe('部分JSON解析 - 多个属性', () => {
    it('第一个属性完整，第二个属性开始', () => {
      const json = '{"name": "John", "age';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: undefined,
      });
    });

    it('第一个属性完整，第二个属性半截', () => {
      const json = '{"name": "John", "age": 3';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 3,
      });
    });

    it('两个完整属性', () => {
      const json = '{"name": "John", "age": 30';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('两个完整属性和逗号', () => {
      const json = '{"name": "John", "age": 30,';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
      });
    });

    it('三个属性，第三个不完整', () => {
      const json = '{"name": "John", "age": 30, "city": "New';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        city: 'New',
      });
    });
  });

  describe('部分JSON解析 - 数组和嵌套对象', () => {
    it('包含数组的开始', () => {
      const json = '{"hobbies": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: [],
      });
    });

    it('包含数组的第一个元素', () => {
      const json = '{"hobbies": ["reading"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: ['reading'],
      });
    });

    it('包含数组的多个元素', () => {
      const json = '{"hobbies": ["reading", "traveling"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        hobbies: ['reading', 'traveling'],
      });
    });

    it('包含嵌套对象的开始', () => {
      const json = '{"children": [{"name": "Tom"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom' }],
      });
    });

    it('包含嵌套对象的完整属性', () => {
      const json = '{"children": [{"name": "Tom", "age": 10';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom', age: 10 }],
      });
    });

    it('包含多个嵌套对象', () => {
      const json = '{"children": [{"name": "Tom", "age": 10}, {"name": "Jerry"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        children: [{ name: 'Tom', age: 10 }, { name: 'Jerry' }],
      });
    });
  });

  describe('部分JSON解析 - 复杂场景', () => {
    it('流式数据模拟 - 第1步', () => {
      const json = '{"name": "John", "age": 30, "hobbies": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: [],
      });
    });

    it('流式数据模拟 - 第2步', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading'],
      });
    });

    it('流式数据模拟 - 第3步', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [],
      });
    });

    it('流式数据模拟 - 第4步', () => {
      const json = '{"name": "John", "age": 30, "hobbies": ["reading", "traveling"], "children": [{"name": "Tom"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        hobbies: ['reading', 'traveling'],
        children: [{ name: 'Tom' }],
      });
    });

    it('流式数据模拟 - 第5步', () => {
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

  describe('特殊字符和转义', () => {
    it('包含转义引号的字符串', () => {
      const json = '{"message": "Hello, \\"world\\"!"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        message: 'Hello, "world"!',
      });
    });

    it('包含反斜杠的字符串', () => {
      const json = '{"path": "C:\\\\Users\\\\John"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        path: 'C:\\Users\\John',
      });
    });

    it('包含换行符的字符串', () => {
      const json = '{"text": "Line 1\\nLine 2"';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        text: 'Line 1\nLine 2',
      });
    });
  });

  describe('数据类型处理', () => {
    it('数字类型', () => {
      const json = '{"count": 42, "price": 99.99';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        count: 42,
        price: 99.99,
      });
    });

    it('布尔类型', () => {
      const json = '{"active": true, "enabled": false';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        active: true,
        enabled: false,
      });
    });

    it('null值', () => {
      const json = '{"data": null, "value": undefined';
      const result = parsePartialJson(json);
      expect(result).toEqual({
        data: null,
        value: undefined,
      });
    });
  });
});

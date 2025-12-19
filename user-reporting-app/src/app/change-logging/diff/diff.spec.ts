import * as JsonPatch from '.';
import jsonpatchtests from './tests.json';
import type * as JsonPatchTypes from './util/types';

const PATCH_DIFF_DEBUG_OUTPUT = false;

describe('diff', () => {
  it('primitives', () => {
    expect(JsonPatch.diff(0, 1)).toEqual([
      {
        op: 'replace',
        path: '',
        value: 1,
      },
    ]);

    expect(JsonPatch.diff(null, 'undefined')).toEqual([
      {
        op: 'replace',
        path: '',
        value: 'undefined',
      },
    ]);

    expect(JsonPatch.diff({}, { a: BigInt(5) })).toEqual([
      {
        op: 'add',
        path: '/a',
        value: BigInt(5),
      },
    ]);
  });

  it('array', () => {
    expect(JsonPatch.diff(['a'], ['a', 'b'])).toEqual([
      { op: 'add', path: '/1', value: 'b' },
    ]);

    expect(JsonPatch.diff(['a', 'c'], ['b', 'c', 'a', 5])).toEqual([
      {
        op: 'add',
        path: '/3',
        value: 5,
      },
      {
        op: 'add',
        path: '/2',
        value: 'a',
      },
      {
        op: 'replace',
        path: '/0',
        value: 'b',
      },
    ]);
  });

  it('object', () => {
    expect(JsonPatch.diff({ a: 5 }, { a: 5, b: '2' })).toEqual([
      { op: 'add', path: '/b', value: '2' },
    ]);

    expect(JsonPatch.diff({ a: 5 }, { a: '5' })).toEqual([
      {
        op: 'replace',
        path: '/a',
        value: '5',
      },
    ]);

    expect(
      JsonPatch.diff({ a: { b: 3, c: 4 } }, { a: { b: 5, c: 4 } }),
    ).toEqual([
      {
        op: 'replace',
        path: '/a/b',
        value: 5,
      },
    ]);
  });
});

describe('patch and diff', () => {
  it('simple patch', () => {
    expect(
      JsonPatch.patch({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]),
    ).toEqual({ a: 1, b: 2 });

    expect(
      JsonPatch.patch({ a: 1 }, [{ op: 'add', path: '/b', value: BigInt(3) }]),
    ).toEqual({ a: 1, b: BigInt(3) });

    expect(
      JsonPatch.patch({ a: [5, 3, { c: 2 }] }, [
        { op: 'replace', path: '/a/2/c', value: 4 },
        { op: 'remove', path: '/a/1' },
        { op: 'add', path: '/a/0', value: 1 },
      ]),
    ).toEqual({ a: [1, 5, { c: 4 }] });
  });

  it('slash path', () => {
    expect(
      JsonPatch.patch(
        { '/a': { '~b': 'c' } },
        JsonPatch.diff({ '/a': { '~b': 'c' } }, { '~a': { '/b': 'c' } }),
      ),
    ).toEqual({ '~a': { '/b': 'c' } });
  });

  jsonpatchtests.forEach(([comment, doc, patch, expected]) => {
    it(`json-patch-tests: ${comment}`, () => {
      // first, we test expected patch behavior
      expect(
        JsonPatch.patch(
          structuredClone(doc),
          patch as JsonPatchTypes.Operation[],
        ),
      ).toEqual(expected);

      if (PATCH_DIFF_DEBUG_OUTPUT) {
        console.table({
          'Origin:': [doc],
          'Given patch:': [patch],
          'Our patch:': [JsonPatch.diff(doc, expected)],
          'Destination:': [expected],
        });
      }

      // second, we test our diff algorithm by patching the origin with our own diff of destination to origin and compare it to the expected destination
      expect(JsonPatch.patch(doc, JsonPatch.diff(doc, expected))).toEqual(
        expected,
      );
    });
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { multiCityHandleKey } from '../components/MultiCitySelector.tsx';

const OPEN_NONE = { isOpen: true, activeIndex: -1 };
const SUGGESTION_COUNT = 3;
const LAST_INDEX = SUGGESTION_COUNT - 1;

test('teclado selector: Intro sin resaltar añade la primera sugerencia', () => {
  const result = multiCityHandleKey(OPEN_NONE, 'Enter', SUGGESTION_COUNT);
  assert.equal(result.addIndex, 0);
  assert.equal(result.isOpen, false);
  assert.equal(result.handled, true);
});

test('teclado selector: flechas se mueven con vuelta y Intro añade la resaltada', () => {
  assert.equal(multiCityHandleKey(OPEN_NONE, 'ArrowDown', SUGGESTION_COUNT).activeIndex, 0);
  assert.equal(multiCityHandleKey({ isOpen: true, activeIndex: LAST_INDEX }, 'ArrowDown', SUGGESTION_COUNT).activeIndex, 0);
  assert.equal(multiCityHandleKey(OPEN_NONE, 'ArrowUp', SUGGESTION_COUNT).activeIndex, LAST_INDEX);
  assert.equal(multiCityHandleKey({ isOpen: true, activeIndex: LAST_INDEX }, 'Enter', SUGGESTION_COUNT).addIndex, LAST_INDEX);
});

test('teclado selector: Escape cierra sin añadir', () => {
  const result = multiCityHandleKey({ isOpen: true, activeIndex: 1 }, 'Escape', SUGGESTION_COUNT);
  assert.equal(result.isOpen, false);
  assert.equal(result.addIndex, null);
});

test('teclado selector: sin sugerencias, cerrado u otra tecla no hace nada', () => {
  assert.equal(multiCityHandleKey(OPEN_NONE, 'Enter', 0).handled, false);
  assert.equal(multiCityHandleKey(OPEN_NONE, 'a', SUGGESTION_COUNT).handled, false);
  assert.equal(multiCityHandleKey({ isOpen: false, activeIndex: -1 }, 'Enter', SUGGESTION_COUNT).addIndex, null);
});

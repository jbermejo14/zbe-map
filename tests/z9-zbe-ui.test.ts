import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { EnforcementState } from '../lib/atlas-zbe.ts';
import type { CityEnforcement } from '../lib/cities-repository.ts';
import type { ZbeAccessStatus } from '../lib/zbe-engine.ts';
import {
  zbeUiAccessCardClass,
  zbeUiCityStatusChip,
  zbeUiEnforcementColor,
  zbeUiFineText,
} from '../lib/zbe-ui.ts';

const Z9_EXPECTED_COLOR: Record<EnforcementState, ZbeAccessStatus> = {
  sanciona: 'banned',
  aviso: 'restricted',
  aprobada_sin_aplicar: 'restricted',
  solo_episodios: 'restricted',
  sin_verificar: 'restricted',
  suspendida: 'allowed',
  sin_restricciones: 'allowed',
  en_tramite: 'allowed',
  pendiente: 'allowed',
};

function z9Miteco(state: EnforcementState, label: string): CityEnforcement {
  return { source: 'miteco', state, label, sentence: 'x', inventoryUpdated: '2026-09-30', importedOn: '2026-11-19' };
}

describe('zbe-ui de Z9', () => {
  it('zbeUiEnforcementColor cubre los 9 estados', () => {
    for (const [state, color] of Object.entries(Z9_EXPECTED_COLOR)) {
      assert.equal(zbeUiEnforcementColor(state as EnforcementState), color, state);
    }
  });

  it('zbeUiAccessCardClass devuelve borde y fondo de cada estado', () => {
    assert.equal(zbeUiAccessCardClass('allowed'), 'border-positive-line bg-positive-soft');
    assert.equal(zbeUiAccessCardClass('restricted'), 'border-warning-line bg-warning-soft');
    assert.equal(zbeUiAccessCardClass('banned'), 'border-negative-line bg-negative-soft');
  });

  it('zbeUiCityStatusChip sin enforcement usa el estado de la ciudad', () => {
    const chip = zbeUiCityStatusChip('activa', null);
    assert.equal(chip.label, 'ZBE activa');
    assert.equal(chip.tagClass, 'tag tag-green');
  });

  it('zbeUiCityStatusChip con sanciona mantiene "ZBE activa"', () => {
    assert.equal(zbeUiCityStatusChip('activa', z9Miteco('sanciona', 'Se multa')).label, 'ZBE activa');
  });

  it('zbeUiCityStatusChip con aviso muestra el label en ámbar', () => {
    const chip = zbeUiCityStatusChip('activa', z9Miteco('aviso', 'Periodo de aviso'));
    assert.equal(chip.label, 'Periodo de aviso');
    assert.equal(chip.tagClass, 'tag tag-warning');
    assert.equal(chip.dotClass, 'bg-warning');
  });

  it('zbeUiCityStatusChip con en_tramite muestra el label en verde', () => {
    const chip = zbeUiCityStatusChip('en_tramitacion', z9Miteco('en_tramite', 'En tramitación'));
    assert.equal(chip.label, 'En tramitación');
    assert.equal(chip.tagClass, 'tag tag-green');
  });

  it('zbeUiFineText distingue importe, sin multa y sin confirmar', () => {
    assert.equal(zbeUiFineText(null, 200), '200 €');
    assert.equal(zbeUiFineText(z9Miteco('sanciona', 'x'), 200), '200 €');
    assert.equal(zbeUiFineText(z9Miteco('aviso', 'x'), 200), 'Sin multa');
    assert.equal(zbeUiFineText(z9Miteco('sin_verificar', 'x'), 200), 'Sin confirmar');
  });
});

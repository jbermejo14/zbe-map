import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOfficialDgtBadge, DGT_LEGAL_SOURCE } from '../lib/dgt-rules.ts';

describe('Reglas Oficiales DGT - Clasificación Ambiental', () => {
  it('Cita la fuente legal oficial de la DGT (BOE)', () => {
    const res = getOfficialDgtBadge({ fuel: 'gasolina', year: 2020 });
    assert.match(res.legalSource, /BOE núm\. 96/);
    assert.equal(res.legalSourceUrl, DGT_LEGAL_SOURCE.url);
  });

  describe('Vehículos de Gasolina (Fronteras 2001 y 2006)', () => {
    it('Gasolina anterior a 2001 (Euro 1/2) -> SIN_ETIQUETA', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2000 }).badge, 'SIN_ETIQUETA');
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 1995 }).badge, 'SIN_ETIQUETA');
    });

    it('Gasolina frontera 2001 a 2005 (Euro 3) -> Etiqueta B', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2001 }).badge, 'B');
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2003 }).badge, 'B');
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2005 }).badge, 'B');
    });

    it('Gasolina frontera 2006 en adelante (Euro 4/5/6) -> Etiqueta C', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2006 }).badge, 'C');
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2018 }).badge, 'C');
      assert.equal(getOfficialDgtBadge({ fuel: 'gasolina', year: 2025 }).badge, 'C');
    });
  });

  describe('Vehículos Diésel (Fronteras 2006 y septiembre 2015)', () => {
    it('Diésel anterior a 2006 (Euro 1/2/3) -> SIN_ETIQUETA', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2005 }).badge, 'SIN_ETIQUETA');
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2000 }).badge, 'SIN_ETIQUETA');
    });

    it('Diésel frontera 2006 a agosto 2015 (Euro 4/5) -> Etiqueta B', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2006 }).badge, 'B');
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2010 }).badge, 'B');
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2015, month: 8 }).badge, 'B');
    });

    it('Diésel frontera septiembre 2015 en adelante (Euro 6) -> Etiqueta C', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2015, month: 9 }).badge, 'C');
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2016 }).badge, 'C');
      assert.equal(getOfficialDgtBadge({ fuel: 'diesel', year: 2024 }).badge, 'C');
    });
  });

  describe('Vehículos Eléctricos e Híbridos (0 CERO y ECO)', () => {
    it('Eléctrico Puro (BEV) -> 0 CERO', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'electrico', year: 2023 }).badge, 'CERO');
      assert.equal(getOfficialDgtBadge({ fuel: 'BEV', year: 2019 }).badge, 'CERO');
    });

    it('Híbrido Enchufable (PHEV) autonomía >= 40 km -> 0 CERO', () => {
      const res = getOfficialDgtBadge({ fuel: 'hibrido-enchufable', year: 2022, electricRangeKm: 55 });
      assert.equal(res.badge, 'CERO');
    });

    it('Híbrido Enchufable (PHEV) autonomía < 40 km -> ECO', () => {
      const res = getOfficialDgtBadge({ fuel: 'hibrido-enchufable', year: 2022, electricRangeKm: 32 });
      assert.equal(res.badge, 'ECO');
    });

    it('Híbrido No Enchufable (HEV/MHEV) -> ECO', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'hibrido', year: 2020 }).badge, 'ECO');
    });

    it('Vehículos a Gas (GLP/GNC) año >= 2006 -> ECO', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'glp-gnc', year: 2018 }).badge, 'ECO');
    });

    it('Vehículos a Gas anteriores a 2006 -> SIN_ETIQUETA (no cumplen Euro 4)', () => {
      assert.equal(getOfficialDgtBadge({ fuel: 'glp-gnc', year: 2002 }).badge, 'SIN_ETIQUETA');
    });
  });
});

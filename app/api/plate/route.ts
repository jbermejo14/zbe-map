import { NextRequest, NextResponse } from 'next/server';
import { lookupPlate, FuelType } from '@/lib/plate-lookup';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get('plate');
    const fuel = (searchParams.get('fuel') || 'gasolina') as FuelType;

    if (!plate || plate.trim().length < 4) {
      return NextResponse.json(
        { error: 'Debes proporcionar una matrícula válida (ej. 1234 LMN o M 1234 AB)' },
        { status: 400 }
      );
    }

    const validFuels: FuelType[] = ['gasolina', 'diesel', 'hibrido', 'electrico', 'auto'];
    const selectedFuel = validFuels.includes(fuel) ? fuel : 'gasolina';

    const result = await lookupPlate(plate, selectedFuel);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error al procesar la matrícula' },
      { status: 400 }
    );
  }
}

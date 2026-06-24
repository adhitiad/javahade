import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // In real app, we extract this from the session
    const userId = "123e4567-e89b-12d3-a456-426614174000";

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3336';
    
    const response = await fetch(`${paymentServiceUrl}/v1/balance/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Gagal mengambil saldo dari server' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { topUpSchema } from '@/lib/validations/payment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = topUpSchema.parse(body);

    // Get user ID from session/token (Using dummy for now as per payment-service design)
    const userId = "123e4567-e89b-12d3-a456-426614174000";

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3336';
    
    const response = await fetch(`${paymentServiceUrl}/v1/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...validatedData,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Gagal menghubungi payment service' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

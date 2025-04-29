import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  const body = await req.json();
  const room_id = body.room_id;

  if (!room_id) {
    return NextResponse.json({ status: 'error', message: 'Missing room_id' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('q2w');
    const collection = db.collection('rooms');

    const existing = await collection.findOne({ room_id });

    if (existing) {
      return NextResponse.json({
        status: 'already',
        data: {
          content: existing.content,
          last_modified: existing.last_modified,
        },
      });
    }

    await collection.insertOne({
      room_id,
      content: '',
      last_modified: new Date().toISOString(),
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error(error);
    console.log("Error is",error)
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}

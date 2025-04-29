import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  const body = await req.json();
  const { room_id, content, last_modified } = body;

  if (!room_id || content === undefined || !last_modified) {
    return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('q2w');
    const collection = db.collection('rooms');

    await collection.updateOne(
      { room_id },
      {
        $set: {
          content,
          last_modified,
        },
      }
    );

    return NextResponse.json({ status: 'updated' });
  } catch (err) {
    console.error('MongoDB update error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

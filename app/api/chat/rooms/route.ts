import { NextResponse } from 'next/server';
import { findRoomByName, joinMembership } from './utils';

export async function PUT(request) {
    const { name } = await request.json();
    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const roomName = name.trim();
    const room = await findRoomByName(roomName);

    if (room) {
        const membershipExists = await room.hasMembership();
        if (!membershipExists) {
            await joinMembership(room);
            return NextResponse.json({ ok: true, roomId: room.id, alreadyJoined: false });
        }
        return NextResponse.json({ ok: true, roomId: room.id, alreadyJoined: true });
    }
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
}

// Keep existing POST/GET unchanged
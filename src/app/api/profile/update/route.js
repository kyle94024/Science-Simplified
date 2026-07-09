// app/api/profile/update/route.js
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const {
            userId,
            name,
            photo,
            bio,
            degree,
            title,
            university,
            linkedin,
            lablink,
            labLink,
        } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { message: "User ID is required." },
                { status: 400 }
            );
        }

        // The profile object round-trips the column as `lablink` (what GET
        // returns), but older callers used `labLink`. Accept either so a save
        // never nulls an existing lab link. (There's no lab-link form field, so
        // this value is only ever the preserved round-tripped one.)
        const lablinkValue = lablink ?? labLink ?? null;

        // Update the profile
        await query(
            `UPDATE profile
             SET name = $1, photo = $2, bio = $3, degree = $4, title = $5, university = $6, linkedin = $7, lablink = $8
             WHERE user_id = $9`,
            [
                name,
                photo,
                bio,
                degree,
                title,
                university,
                linkedin,
                lablinkValue,
                userId,
            ]
        );

        return NextResponse.json(
            { message: "Profile updated successfully." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { message: "Error updating profile." },
            { status: 500 }
        );
    }
}